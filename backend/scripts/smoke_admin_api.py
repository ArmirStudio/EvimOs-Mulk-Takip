from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import httpx
from supabase import create_client


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_PYTHON = ROOT_DIR / ".venv-backend" / "Scripts" / "python.exe"
BASE_URL = os.environ.get("SMOKE_API_BASE_URL", "http://127.0.0.1:8010").rstrip("/")


def _read_env_value(path: Path, key: str) -> str | None:
    if not path.exists():
        return None

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        current_key, current_value = line.split("=", 1)
        if current_key.strip() == key:
            return current_value.strip()
    return None


def _require_env(key: str) -> str:
    value = os.environ.get(key)
    if value:
        return value
    raise RuntimeError(f"{key} is required")


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def _call_json(
    client: httpx.Client,
    method: str,
    path: str,
    *,
    expected_status: int | None = 200,
    **kwargs: Any,
) -> tuple[int, Any]:
    response = client.request(method, f"{BASE_URL}{path}", **kwargs)
    payload: Any
    try:
        payload = response.json()
    except ValueError:
        payload = response.text

    if expected_status is not None and response.status_code != expected_status:
        raise RuntimeError(
            f"{method} {path} returned {response.status_code}: {json.dumps(payload, ensure_ascii=True)}"
        )
    return response.status_code, payload


def _wait_for_server(timeout_seconds: int = 45) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            response = httpx.get(f"{BASE_URL}/openapi.json", timeout=2.0)
            if response.status_code == 200:
                return
        except Exception:
            time.sleep(1.0)
            continue
        time.sleep(1.0)
    raise RuntimeError("Local backend server did not become ready in time")


def _start_server(env: dict[str, str]) -> subprocess.Popen[str]:
    python_path = os.environ.get("SMOKE_PYTHON_PATH") or str(DEFAULT_PYTHON)
    return subprocess.Popen(
        [python_path, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8010"],
        cwd=str(BACKEND_DIR),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )


def _delete_auth_user(service_client: Any, auth_id: str) -> None:
    try:
        service_client.auth.admin.delete_user(auth_id)
    except TypeError:
        service_client.auth.admin.delete_user(auth_id, False)


def _cleanup_user(service_client: Any, *, user_id: str | None = None, auth_id: str | None = None) -> None:
    if user_id:
        try:
            service_client.table("users").delete().eq("id", user_id).execute()
        except Exception:
            pass
    elif auth_id:
        try:
            service_client.table("users").delete().eq("auth_id", auth_id).execute()
        except Exception:
            pass

    if auth_id:
        try:
            _delete_auth_user(service_client, auth_id)
        except Exception:
            pass


def main() -> None:
    supabase_url = _require_env("SUPABASE_URL")
    service_role_key = _require_env("SUPABASE_SERVICE_ROLE_KEY")
    anon_key = (
        os.environ.get("SUPABASE_ANON_KEY")
        or _read_env_value(ROOT_DIR / "frontend" / ".env", "EXPO_PUBLIC_SUPABASE_ANON_KEY")
        or _read_env_value(ROOT_DIR / "admin-web" / ".env", "VITE_SUPABASE_ANON_KEY")
    )
    _assert(bool(anon_key), "SUPABASE_ANON_KEY could not be resolved")

    suffix = uuid.uuid4().hex[:10]
    smoke_admin_email = f"smoke-admin-{suffix}@estateflow.local"
    smoke_admin_password = f"Smoke!{suffix}Aa1"
    smoke_admin_phone = f"90555{suffix[:7].replace('a', '1').replace('b', '2').replace('c', '3')}"
    smoke_admin_phone = "".join(ch if ch.isdigit() else "7" for ch in smoke_admin_phone)[:12]

    smoke_agent_email = f"smoke-agent-{suffix}@estateflow.local"
    smoke_agent_password = f"Smoke!{suffix}Bb1"
    smoke_agent_phone = f"90554{suffix[:7].replace('d', '4').replace('e', '5')}"
    smoke_agent_phone = "".join(ch if ch.isdigit() else "6" for ch in smoke_agent_phone)[:12]

    smoke_agency_email = f"smoke-office-{suffix}@estateflow.local"
    smoke_agency_password = f"Smoke!{suffix}Cc1"
    smoke_agency_phone = f"90553{suffix[:7].replace('f', '8')}"
    smoke_agency_phone = "".join(ch if ch.isdigit() else "8" for ch in smoke_agency_phone)[:12]

    upload_path = f"smoke-tests/{suffix}/health.txt"

    service_client = create_client(supabase_url, service_role_key)
    public_client = create_client(supabase_url, anon_key)

    server_env = os.environ.copy()
    server_env["SUPABASE_URL"] = supabase_url
    server_env["SUPABASE_SERVICE_ROLE_KEY"] = service_role_key
    server = _start_server(server_env)

    cleanup_campaign_ids: list[str] = []
    cleanup_user_ids: list[tuple[str | None, str | None]] = []
    cleanup_agency_ids: list[str] = []
    cleanup_storage_paths: list[str] = []

    try:
        _wait_for_server()

        results: dict[str, Any] = {}
        with httpx.Client(timeout=20.0) as client:
            _, openapi = _call_json(client, "GET", "/openapi.json")
            results["openapi_has_admin_session"] = "/api/admin/session" in openapi.get("paths", {})
            results["openapi_has_campaigns"] = "/api/admin/campaigns" in openapi.get("paths", {})

            service_status, service_payload = _call_json(
                client,
                "GET",
                "/api/admin/session",
                expected_status=None,
                headers={"Authorization": f"Bearer {service_role_key}"},
            )
            results["service_role_bearer"] = {"status": service_status, "body": service_payload}

            create_admin = service_client.auth.admin.create_user(
                {
                    "email": smoke_admin_email,
                    "password": smoke_admin_password,
                    "email_confirm": True,
                    "user_metadata": {
                        "role": "admin",
                        "full_name": "Smoke Admin",
                        "phone": smoke_admin_phone,
                    },
                }
            )
            admin_auth_id = str(create_admin.user.id)
            cleanup_user_ids.append((None, admin_auth_id))

            admin_profile = None
            for _ in range(10):
                result = (
                    service_client.table("users")
                    .select("*")
                    .eq("auth_id", admin_auth_id)
                    .maybe_single()
                    .execute()
                )
                if result.data:
                    admin_profile = result.data
                    break
                time.sleep(0.5)

            admin_profile_payload = {
                "auth_id": admin_auth_id,
                "email": smoke_admin_email,
                "full_name": "Smoke Admin",
                "role": "admin",
                "phone": smoke_admin_phone,
            }
            if admin_profile:
                service_client.table("users").update(admin_profile_payload).eq("id", admin_profile["id"]).execute()
                admin_profile = (
                    service_client.table("users")
                    .select("*")
                    .eq("id", admin_profile["id"])
                    .single()
                    .execute()
                    .data
                )
            else:
                service_client.table("users").insert(admin_profile_payload).execute()
                admin_profile = (
                    service_client.table("users")
                    .select("*")
                    .eq("auth_id", admin_auth_id)
                    .single()
                    .execute()
                    .data
                )

            cleanup_user_ids[-1] = (admin_profile.get("id"), admin_auth_id)

            auth_result = public_client.auth.sign_in_with_password(
                {"email": smoke_admin_email, "password": smoke_admin_password}
            )
            access_token = auth_result.session.access_token
            headers = {"Authorization": f"Bearer {access_token}"}

            _, resolve_payload = _call_json(
                client,
                "POST",
                "/api/auth/resolve-identifier",
                json={"identifier": smoke_admin_phone},
            )
            _assert(resolve_payload["email"] == smoke_admin_email.lower(), "Phone resolution returned wrong email")
            results["resolve_identifier"] = resolve_payload

            _, verify_payload = _call_json(client, "GET", "/api/auth/verify", headers=headers)
            _assert(verify_payload["valid"] is True, "Auth verify did not return valid=true")
            results["auth_verify"] = {
                "valid": verify_payload["valid"],
                "role": verify_payload["user"].get("role"),
                "email": verify_payload["user"].get("email"),
            }

            _, session_payload = _call_json(client, "GET", "/api/admin/session", headers=headers)
            _assert(session_payload["user"]["email"] == smoke_admin_email, "Admin session returned wrong user")
            results["admin_session"] = session_payload["user"]

            _, dashboard_payload = _call_json(client, "GET", "/api/admin/dashboard", headers=headers)
            for key in ["offices", "companies", "totalAgents", "recentRecords"]:
                _assert(key in dashboard_payload, f"Dashboard missing key: {key}")
            results["dashboard_keys"] = sorted(list(dashboard_payload.keys()))

            _, structures_payload = _call_json(client, "GET", "/api/admin/structures", headers=headers)
            results["structures_count"] = len(structures_payload.get("items", []))

            _, contacts_payload = _call_json(client, "GET", "/api/admin/contacts", headers=headers)
            results["contacts_count"] = len(contacts_payload.get("contacts", []))

            _, agency_options_payload = _call_json(client, "GET", "/api/admin/agency-options", headers=headers)
            results["agency_options_count"] = len(agency_options_payload.get("agencies", []))

            _, campaigns_payload = _call_json(client, "GET", "/api/admin/campaigns", headers=headers)
            results["campaigns_before"] = len(campaigns_payload.get("campaigns", []))

            _, create_campaign_payload = _call_json(
                client,
                "POST",
                "/api/admin/campaigns",
                headers=headers,
                json={
                    "type": "news",
                    "title": f"Smoke Campaign {suffix}",
                    "body": "Temporary smoke campaign created by automated smoke test",
                    "sort_order": 9999,
                    "active": False,
                    "target_roles": ["agent"],
                },
            )
            campaign_id = create_campaign_payload["campaign"]["id"]
            cleanup_campaign_ids.append(campaign_id)
            results["create_campaign"] = create_campaign_payload["campaign"]["id"]

            _, get_campaign_payload = _call_json(
                client,
                "GET",
                f"/api/admin/campaigns/{campaign_id}",
                headers=headers,
            )
            _assert(get_campaign_payload["campaign"]["id"] == campaign_id, "Campaign lookup returned wrong id")

            _, update_campaign_payload = _call_json(
                client,
                "PATCH",
                f"/api/admin/campaigns/{campaign_id}",
                headers=headers,
                json={
                    "title": f"Smoke Campaign {suffix} Updated",
                    "body": "Updated by smoke test",
                },
            )
            _assert("Updated" in update_campaign_payload["campaign"]["title"], "Campaign update did not stick")

            _, toggle_campaign_payload = _call_json(
                client,
                "POST",
                f"/api/admin/campaigns/{campaign_id}/toggle",
                headers=headers,
                json={"active": True},
            )
            _assert(toggle_campaign_payload["campaign"]["active"] is True, "Campaign toggle did not set active=true")

            _, duplicate_payload = _call_json(
                client,
                "POST",
                f"/api/admin/campaigns/{campaign_id}/duplicate",
                headers=headers,
            )
            duplicate_campaign_id = duplicate_payload["campaign"]["id"]
            cleanup_campaign_ids.append(duplicate_campaign_id)
            results["duplicate_campaign"] = duplicate_campaign_id

            _, create_agent_payload = _call_json(
                client,
                "POST",
                "/api/admin/agents/standalone",
                headers=headers,
                json={
                    "email": smoke_agent_email,
                    "password": smoke_agent_password,
                    "full_name": "Smoke Standalone Agent",
                    "phone": smoke_agent_phone,
                    "city": "Istanbul",
                    "district": "Kadikoy",
                    "brand_color_primary": "#111111",
                    "brand_color_secondary": "#f5f5f5",
                },
            )
            agent_user = create_agent_payload["user"]
            cleanup_user_ids.append((agent_user.get("id"), agent_user.get("auth_id")))
            results["create_standalone_agent"] = agent_user["id"]

            _, get_agent_payload = _call_json(
                client,
                "GET",
                f"/api/admin/agents/{agent_user['id']}",
                headers=headers,
            )
            _assert(get_agent_payload["user"]["id"] == agent_user["id"], "Agent lookup returned wrong id")

            _, update_agent_payload = _call_json(
                client,
                "PATCH",
                f"/api/admin/agents/{agent_user['id']}",
                headers=headers,
                json={"city": "Ankara", "district": "Cankaya"},
            )
            _assert(update_agent_payload["user"]["city"] == "Ankara", "Agent update did not stick")

            _, create_agency_payload = _call_json(
                client,
                "POST",
                "/api/admin/agencies",
                headers=headers,
                json={
                    "entity_type": "office",
                    "name": f"Smoke Office {suffix}",
                    "location": "Istanbul",
                    "district": "Kadikoy",
                    "contact_email": smoke_agency_email,
                    "contact_phone": smoke_agency_phone,
                    "subscription_plan": "basic",
                    "max_properties": 3,
                    "status": "active",
                    "agent_password": smoke_agency_password,
                },
            )
            agency = create_agency_payload["agency"]
            agency_agent = create_agency_payload["agent"]
            cleanup_agency_ids.append(agency["id"])
            cleanup_user_ids.append((agency_agent.get("id"), agency_agent.get("auth_id")))
            results["create_agency"] = agency["id"]

            _, get_agency_payload = _call_json(
                client,
                "GET",
                f"/api/admin/agencies/{agency['id']}",
                headers=headers,
            )
            _assert(get_agency_payload["agency"]["id"] == agency["id"], "Agency lookup returned wrong id")

            _, update_agency_payload = _call_json(
                client,
                "PATCH",
                f"/api/admin/agencies/{agency['id']}",
                headers=headers,
                json={"notes": "Updated by smoke test"},
            )
            _assert(update_agency_payload["agency"]["notes"] == "Updated by smoke test", "Agency update did not stick")

            upload_response = client.post(
                f"{BASE_URL}/api/admin/uploads/public",
                headers=headers,
                data={
                    "bucket": "ad-media",
                    "folder": "smoke-tests",
                    "path": upload_path,
                    "upsert": "true",
                },
                files={"file": ("health.txt", b"estateflow smoke upload", "text/plain")},
            )
            upload_payload = upload_response.json()
            if upload_response.status_code != 200:
                raise RuntimeError(
                    f"POST /api/admin/uploads/public returned {upload_response.status_code}: {json.dumps(upload_payload)}"
                )
            cleanup_storage_paths.append(upload_path)
            _assert(upload_payload["path"] == upload_path, "Upload path mismatch")
            public_upload = httpx.get(upload_payload["public_url"], timeout=20.0)
            _assert(public_upload.status_code == 200, "Uploaded asset did not resolve publicly")
            _assert(public_upload.text == "estateflow smoke upload", "Uploaded asset body mismatch")
            results["upload_public_url"] = upload_payload["public_url"]

            _call_json(client, "DELETE", f"/api/admin/campaigns/{duplicate_campaign_id}", headers=headers)
            cleanup_campaign_ids.remove(duplicate_campaign_id)
            _call_json(client, "DELETE", f"/api/admin/campaigns/{campaign_id}", headers=headers)
            cleanup_campaign_ids.remove(campaign_id)

        print(json.dumps(results, indent=2, ensure_ascii=True))
    finally:
        for campaign_id in cleanup_campaign_ids:
            try:
                service_client.table("ad_campaigns").delete().eq("id", campaign_id).execute()
            except Exception:
                pass

        for storage_path in cleanup_storage_paths:
            try:
                service_client.storage.from_("ad-media").remove([storage_path])
            except Exception:
                pass

        for agency_id in cleanup_agency_ids:
            try:
                agency_users = (
                    service_client.table("users")
                    .select("id, auth_id")
                    .eq("agency_id", agency_id)
                    .execute()
                    .data
                    or []
                )
                for agency_user in agency_users:
                    _cleanup_user(
                        service_client,
                        user_id=agency_user.get("id"),
                        auth_id=agency_user.get("auth_id"),
                    )
            except Exception:
                pass
            try:
                service_client.table("agencies").delete().eq("id", agency_id).execute()
            except Exception:
                pass

        for user_id, auth_id in cleanup_user_ids:
            _cleanup_user(service_client, user_id=user_id, auth_id=auth_id)

        if server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()


if __name__ == "__main__":
    main()
