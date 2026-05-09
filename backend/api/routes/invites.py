from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import time
import os

from fastapi import APIRouter, Depends, HTTPException

from core.access import can_manage_office_records, get_office_owner_id, is_admin, is_full_employee
from core.database import supabase
from core.notifications import notify_users
from core.security import get_current_user
from models.schemas import (
    CreateInviteRequest,
    LookupInviteCodeRequest,
    RegisterInviteCodeRequest,
    RegisterInviteRequest,
    UpdatePendingInviteRequest,
)

router = APIRouter(tags=["invites"])

INVITE_TTL_HOURS = 24
REMINDER_COOLDOWN_HOURS = 24
INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _normalize_invite_code(code: str) -> str:
    return "".join((code or "").upper().split())


def _generate_invite_code() -> str:
    return "".join(secrets.choice(INVITE_CODE_ALPHABET) for _ in range(8))


def _generate_unique_invite_code() -> str:
    for _ in range(8):
        code = _generate_invite_code()
        existing = (
            supabase.table("invites")
            .select("id")
            .eq("code_hash", _hash_token(code))
            .maybe_single()
            .execute()
            .data
        )
        if not existing:
            return code
    raise HTTPException(status_code=500, detail="Davet kodu uretilemedi")


def _normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    raw = phone.strip()
    if not raw:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("90") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+90{digits[1:]}"
    if len(digits) == 10:
        return f"+90{digits}"
    if raw.startswith("+") and 10 <= len(digits) <= 15:
        return f"+{digits}"
    return raw


def _invite_base_url() -> str:
    return os.environ.get("INVITE_BASE_URL", "http://localhost:8083/invite").rstrip("/")


def _build_invite_link(token: str) -> str:
    return f"{_invite_base_url()}/{token}"


def _event(invite_id: str | None, event_type: str, *, actor_id: str | None = None, target_user_id: str | None = None, payload: dict | None = None) -> None:
    supabase.table("invite_events").insert({
        "invite_id": invite_id,
        "event_type": event_type,
        "actor_id": actor_id,
        "target_user_id": target_user_id,
        "payload": payload or {},
    }).execute()


def _require_invite_manager(current_user: dict) -> str:
    if not can_manage_office_records(current_user):
        raise HTTPException(status_code=403, detail="Yalnizca agent, full employee veya admin davet yonetebilir")
    owner_id = get_office_owner_id(current_user)
    if not owner_id:
        raise HTTPException(status_code=403, detail="Ofis sahibi bulunamadi")
    return owner_id


def _get_office_name(owner_id: str) -> str:
    owner = (
        supabase.table("users")
        .select("full_name, agency_id, agencies:agency_id(name)")
        .eq("id", owner_id)
        .maybe_single()
        .execute()
        .data
    )
    if not owner:
        return "Emlak ofisi"

    agencies = owner.get("agencies")
    agency = agencies[0] if isinstance(agencies, list) and agencies else agencies
    return (agency or {}).get("name") or owner.get("full_name") or "Emlak ofisi"


def _get_invite_by_token(token: str) -> dict:
    invite = (
        supabase.table("invites")
        .select("*")
        .eq("token_hash", _hash_token(token))
        .maybe_single()
        .execute()
        .data
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Davet bulunamadi")
    return invite


def _get_invite_by_code(code: str) -> dict:
    normalized = _normalize_invite_code(code)
    if len(normalized) != 8:
        raise HTTPException(status_code=404, detail="Davet kodu bulunamadi")
    invite = (
        supabase.table("invites")
        .select("*")
        .eq("code_hash", _hash_token(normalized))
        .maybe_single()
        .execute()
        .data
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Davet kodu bulunamadi")
    return invite


def _assert_invite_usable(invite: dict) -> None:
    if invite.get("revoked_at"):
        raise HTTPException(status_code=410, detail="Davet iptal edilmis")
    if invite.get("used_at"):
        raise HTTPException(status_code=410, detail="Davet daha once kullanilmis")
    expires_at = _parse_dt(invite.get("expires_at"))
    if expires_at and expires_at < _now():
        raise HTTPException(status_code=410, detail="Davet suresi dolmus")


def _public_invite_payload(invite: dict) -> dict:
    return {
        "valid": True,
        "role": invite["role"],
        "contact_label": invite["contact_label"],
        "office_name": _get_office_name(invite["office_owner_id"]),
        "expires_at": invite["expires_at"],
        "prefill_full_name": invite.get("prefill_full_name"),
        "prefill_phone": invite.get("prefill_phone"),
        "prefill_email": invite.get("prefill_email"),
        "employee_access_level": invite.get("employee_access_level"),
    }


def _register_invite(invite: dict, request: RegisterInviteRequest) -> dict:
    _assert_invite_usable(invite)

    full_name = request.full_name.strip()
    email = request.email.strip().lower()
    password = request.password.strip()
    phone = _normalize_phone(request.phone)
    employee_access_level = invite.get("employee_access_level") if invite.get("role") == "employee" else None
    if invite.get("role") == "employee" and employee_access_level not in {"full", "limited"}:
        employee_access_level = "limited"
    if not full_name or not email or not password:
        raise HTTPException(status_code=400, detail="Tum alanlar zorunludur")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Sifre en az 8 karakter olmalidir")

    try:
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "role": invite["role"],
                "status": "pending",
                "full_name": full_name,
                "phone": phone or "",
                "employee_access_level": employee_access_level or "",
            },
        })
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Kullanici olusturulamadi: {type(exc).__name__}") from exc

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Kullanici olusturulamadi")

    auth_id = str(auth_response.user.id)
    profile = None
    for _ in range(4):
        profile = (
            supabase.table("users")
            .select("*")
            .eq("auth_id", auth_id)
            .maybe_single()
            .execute()
            .data
        )
        if profile:
            break
        time.sleep(0.4)

    if not profile:
        inserted = supabase.table("users").insert({
            "auth_id": auth_id,
            "email": email,
            "full_name": full_name,
            "phone": phone,
            "role": invite["role"],
            "status": "pending",
            "created_by": invite["office_owner_id"],
            "invited_via_invite_id": invite["id"],
            "employee_access_level": employee_access_level,
        }).execute()
        profile = inserted.data[0]
    else:
        profile = supabase.table("users").update({
            "full_name": full_name,
            "phone": phone,
            "role": invite["role"],
            "status": "pending",
            "created_by": invite["office_owner_id"],
            "invited_via_invite_id": invite["id"],
            "employee_access_level": employee_access_level,
            "updated_at": _iso(_now()),
        }).eq("id", profile["id"]).execute().data[0]

    supabase.table("invites").update({
        "used_at": _iso(_now()),
        "used_by": profile["id"],
        "updated_at": _iso(_now()),
    }).eq("id", invite["id"]).execute()
    _event(invite["id"], "registered", target_user_id=profile["id"], payload={"email": email})

    return {"success": True, "user_id": profile["id"], "role": invite["role"], "status": "pending"}


def _pending_select():
    return (
        "id, email, full_name, phone, role, status, created_at, created_by, employee_access_level, "
        "invited_via_invite_id, invites:invited_via_invite_id("
        "id, contact_label, role, office_owner_id, prefill_full_name, prefill_phone, prefill_email, "
        "employee_access_level, last_reminded_at, reminder_count, created_at)"
    )


def _hide_contact_label_for_non_agent(value, current_user: dict):
    if current_user.get("role") in {"admin", "agent"}:
        return value

    def scrub(user: dict) -> dict:
        invite = user.get("invites")
        if isinstance(invite, list):
            for item in invite:
                if isinstance(item, dict):
                    item.pop("contact_label", None)
        elif isinstance(invite, dict):
            invite.pop("contact_label", None)
        return user

    if isinstance(value, list):
        return [scrub(item) for item in value]
    if isinstance(value, dict):
        return scrub(value)
    return value


def _assert_pending_in_scope(user_id: str, current_user: dict) -> dict:
    owner_id = _require_invite_manager(current_user)
    user = (
        supabase.table("users")
        .select(_pending_select())
        .eq("id", user_id)
        .eq("status", "pending")
        .maybe_single()
        .execute()
        .data
    )
    if not user:
        raise HTTPException(status_code=404, detail="Onay bekleyen kullanici bulunamadi")
    if not is_admin(current_user) and user.get("created_by") != owner_id:
        raise HTTPException(status_code=403, detail="Bu kullanici ofisinizde degil")
    return user


@router.post("/invites")
def create_invite(request: CreateInviteRequest, current_user: dict = Depends(get_current_user)):
    owner_id = _require_invite_manager(current_user)
    contact_label = request.contact_label.strip()
    if not contact_label:
        raise HTTPException(status_code=400, detail="Rehber adi zorunludur")
    if (
        request.role == "employee"
        and request.employee_access_level == "full"
        and current_user.get("role") not in {"admin", "agent"}
    ):
        raise HTTPException(status_code=403, detail="Tam yetkili calisan davetini yalnizca agent olusturabilir")

    token = secrets.token_urlsafe(32)
    code = _generate_unique_invite_code()
    expires_at = _now() + timedelta(hours=INVITE_TTL_HOURS)
    result = supabase.table("invites").insert({
        "office_owner_id": owner_id,
        "created_by": current_user.get("id"),
        "role": request.role,
        "contact_label": contact_label,
        "token_hash": _hash_token(token),
        "code_hash": _hash_token(code),
        "prefill_full_name": request.prefill_full_name.strip() if request.prefill_full_name else None,
        "prefill_phone": _normalize_phone(request.prefill_phone),
        "prefill_email": request.prefill_email.strip().lower() if request.prefill_email else None,
        "employee_access_level": request.employee_access_level if request.role == "employee" else None,
        "expires_at": _iso(expires_at),
    }).execute()
    invite = result.data[0]
    _event(invite["id"], "created", actor_id=current_user.get("id"), payload={
        "role": request.role,
        "has_prefill": bool(request.prefill_full_name or request.prefill_phone or request.prefill_email),
    })
    return {
        "invite": {
            **invite,
            "office_name": _get_office_name(owner_id),
        },
        "token": token,
        "code": code,
        "link": _build_invite_link(token),
    }


@router.post("/public/invites/lookup-code")
def lookup_public_invite_code(request: LookupInviteCodeRequest):
    invite = _get_invite_by_code(request.code)
    _assert_invite_usable(invite)
    return _public_invite_payload(invite)


@router.post("/public/invites/register-code")
def register_public_invite_code(request: RegisterInviteCodeRequest):
    invite = _get_invite_by_code(request.code)
    return _register_invite(invite, request)


@router.get("/public/invites/{token}")
def get_public_invite(token: str):
    invite = _get_invite_by_token(token)
    _assert_invite_usable(invite)
    return _public_invite_payload(invite)


@router.post("/public/invites/{token}/register")
def register_public_invite(token: str, request: RegisterInviteRequest):
    invite = _get_invite_by_token(token)
    return _register_invite(invite, request)


@router.get("/invites/pending")
def list_pending_invites(role: str | None = None, current_user: dict = Depends(get_current_user)):
    owner_id = _require_invite_manager(current_user)
    query = supabase.table("users").select(_pending_select()).eq("status", "pending")
    if not is_admin(current_user):
        query = query.eq("created_by", owner_id)
    if role in {"tenant", "landlord", "employee"}:
        query = query.eq("role", role)
    users = query.order("created_at", desc=True).execute().data or []
    return {"pending": _hide_contact_label_for_non_agent(users, current_user)}


@router.get("/invites/pending/{user_id}")
def get_pending_invite_detail(user_id: str, current_user: dict = Depends(get_current_user)):
    user = _assert_pending_in_scope(user_id, current_user)
    return {"pending": _hide_contact_label_for_non_agent(user, current_user)}


@router.patch("/invites/pending/{user_id}")
def update_pending_invite(user_id: str, request: UpdatePendingInviteRequest, current_user: dict = Depends(get_current_user)):
    user = _assert_pending_in_scope(user_id, current_user)
    invite = user.get("invites")
    invite = invite[0] if isinstance(invite, list) and invite else invite

    if request.action == "approve":
        employee_access_level = None
        if user.get("role") == "employee":
            employee_access_level = (
                request.employee_access_level
                or (invite or {}).get("employee_access_level")
                or user.get("employee_access_level")
                or "limited"
            )
        update_payload = {
            "status": "active",
            "updated_at": _iso(_now()),
        }
        if employee_access_level:
            update_payload["employee_access_level"] = employee_access_level

        updated = supabase.table("users").update(update_payload).eq("id", user_id).execute().data[0]
        if updated.get("auth_id"):
            try:
                supabase.auth.admin.update_user_by_id(
                    updated["auth_id"],
                    {
                        "user_metadata": {
                            "role": updated.get("role"),
                            "status": "active",
                            "employee_access_level": updated.get("employee_access_level") or "",
                        }
                    },
                )
            except Exception:
                pass
        _event(invite.get("id") if invite else None, "approved", actor_id=current_user.get("id"), target_user_id=user_id)
        return {"success": True, "user": updated}

    if current_user.get("role") not in {"admin", "agent"}:
        raise HTTPException(status_code=403, detail="Rehber adini yalnizca agent duzenleyebilir")

    contact_label = (request.contact_label or "").strip()
    if not contact_label:
        raise HTTPException(status_code=400, detail="Rehber adi zorunludur")
    if not invite:
        raise HTTPException(status_code=404, detail="Davet kaydi bulunamadi")
    updated_invite = supabase.table("invites").update({
        "contact_label": contact_label,
        "updated_at": _iso(_now()),
    }).eq("id", invite["id"]).execute().data[0]
    _event(invite["id"], "label_updated", actor_id=current_user.get("id"), target_user_id=user_id, payload={"contact_label": contact_label})
    return {"success": True, "invite": updated_invite}


@router.delete("/invites/pending/{user_id}")
def reject_pending_invite(user_id: str, current_user: dict = Depends(get_current_user)):
    user = _assert_pending_in_scope(user_id, current_user)
    invite = user.get("invites")
    invite = invite[0] if isinstance(invite, list) and invite else invite
    invite_id = invite.get("id") if invite else None
    _event(invite_id, "rejected", actor_id=current_user.get("id"), target_user_id=user_id, payload={"email": user.get("email"), "role": user.get("role")})
    auth_id = user.get("auth_id")
    supabase.table("users").delete().eq("id", user_id).execute()
    if auth_id:
        try:
            supabase.auth.admin.delete_user(auth_id)
        except Exception:
            pass
    return {"success": True}


@router.post("/invites/remind")
def remind_pending_invite(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in {"tenant", "landlord"} or current_user.get("status") != "pending":
        raise HTTPException(status_code=403, detail="Yalnizca onay bekleyen davetli hatirlatma gonderebilir")

    invite_id = current_user.get("invited_via_invite_id")
    if not invite_id:
        raise HTTPException(status_code=404, detail="Davet kaydi bulunamadi")
    invite = supabase.table("invites").select("*").eq("id", invite_id).maybe_single().execute().data
    if not invite:
        raise HTTPException(status_code=404, detail="Davet kaydi bulunamadi")

    last_reminded_at = _parse_dt(invite.get("last_reminded_at"))
    now = _now()
    if last_reminded_at:
        next_allowed_at = last_reminded_at + timedelta(hours=REMINDER_COOLDOWN_HOURS)
        if next_allowed_at > now:
            remaining = int((next_allowed_at - now).total_seconds())
            return {
                "success": False,
                "cooldown_seconds": remaining,
                "next_allowed_at": _iso(next_allowed_at),
            }

    owner_id = invite["office_owner_id"]
    full_employees = (
        supabase.table("users")
        .select("id")
        .eq("role", "employee")
        .eq("employee_access_level", "full")
        .eq("created_by", owner_id)
        .execute()
        .data
        or []
    )
    recipient_ids = [owner_id] + [item["id"] for item in full_employees if item.get("id")]
    notify_users(
        recipient_ids,
        "invite_reminder",
        "Onay bekleyen davet",
        f"{current_user.get('full_name') or 'Davetli'} hesabinin onaylanmasini bekliyor.",
        current_user.get("id"),
        push_data={
            "route": f"/agent/pending-invite-detail?id={current_user.get('id')}",
            "pending_user_id": current_user.get("id"),
        },
    )
    supabase.table("invites").update({
        "last_reminded_at": _iso(now),
        "reminder_count": (invite.get("reminder_count") or 0) + 1,
        "updated_at": _iso(now),
    }).eq("id", invite_id).execute()
    _event(invite_id, "reminded", actor_id=current_user.get("id"), target_user_id=current_user.get("id"))
    return {"success": True, "cooldown_seconds": REMINDER_COOLDOWN_HOURS * 3600, "next_allowed_at": _iso(now + timedelta(hours=REMINDER_COOLDOWN_HOURS))}
