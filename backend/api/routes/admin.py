import os
import secrets
import string
import time
from datetime import datetime
from typing import Any, Optional
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from core.access import is_admin
from core.database import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, supabase
from core.notifications import build_public_storage_url
from core.security import get_current_user
from models.schemas import (
    AdminCampaignPayload,
    AdminCampaignUpdatePayload,
    AdminDevLinkUserRequest,
    AdminToggleActiveRequest,
    CreateAgencyRequest,
    CreateStandaloneAgentRequest,
    UpdateAdminAgentRequest,
    UpdateAgencyRequest,
)


def _get_default_password() -> str:
    """Get default trial password from env or generate random."""
    env_password = os.environ.get("DEFAULT_TRIAL_PASSWORD", "").strip()
    if env_password:
        return env_password
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(12))


DEFAULT_TRIAL_PASSWORD = _get_default_password()
UPLOAD_BUCKETS = {"avatars", "agency-branding", "ad-media"}
ALLOWED_UPLOAD_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
}
MAX_ADMIN_UPLOAD_BYTES = 10 * 1024 * 1024

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: dict) -> None:
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Bu alan yalnizca admin kullanicilara aciktir")


def _now() -> str:
    return datetime.utcnow().isoformat()


def _first_row(result: Any) -> dict[str, Any] | None:
    data = getattr(result, "data", None)
    if isinstance(data, list):
        return data[0] if data else None
    return data


def _fetch_row(table: str, column: str, value: Any) -> dict[str, Any] | None:
    return (
        supabase.table(table)
        .select("*")
        .eq(column, value)
        .maybe_single()
        .execute()
        .data
    )


def _strip_or_none(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _normalize_campaign_payload(payload: dict[str, Any], *, for_update: bool) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in payload.items():
        if isinstance(value, str):
            normalized[key] = _strip_or_none(value)
        elif isinstance(value, list):
            normalized[key] = value if value else None
        else:
            normalized[key] = value

    campaign_type = normalized.get("type")
    title = normalized.get("title")
    client_name = normalized.get("client_name")
    target_roles = normalized.get("target_roles")

    if not for_update or campaign_type is not None:
        if campaign_type == "testimonial":
            if not client_name:
                raise HTTPException(status_code=400, detail="Testimonial icin musteri adi zorunludur")
        elif not title:
            raise HTTPException(status_code=400, detail="Kampanya basligi zorunludur")

    if not for_update and (not target_roles or len(target_roles) == 0):
        raise HTTPException(status_code=400, detail="En az bir hedef rol secilmelidir")

    if (campaign_type or "") != "interstitial":
        for field in ["daily_frequency", "lock_duration", "modal_width_pct", "image_height_pct", "start_hour"]:
            if not for_update or field in normalized:
                normalized[field] = None

    return normalized


def _build_auth_metadata(profile: dict[str, Any]) -> dict[str, Any]:
    metadata = {
        "role": profile.get("role") or "",
        "status": profile.get("status") or "",
        "full_name": profile.get("full_name") or "",
        "phone": profile.get("phone") or "",
        "city": profile.get("city") or "",
        "district": profile.get("district") or "",
        "employee_access_level": profile.get("employee_access_level") or "",
        "agency_id": profile.get("agency_id") or "",
        "avatar_url": profile.get("avatar_url") or "",
        "brand_color_primary": profile.get("brand_color_primary") or "",
        "brand_color_secondary": profile.get("brand_color_secondary") or "",
    }
    return metadata


def _fetch_agent_for_dev(agent_id: str) -> dict[str, Any]:
    agent = (
        supabase.table("users")
        .select("id, role, status, full_name, email, agency_id")
        .eq("id", agent_id)
        .maybe_single()
        .execute()
        .data
    )
    if not agent or agent.get("role") != "agent":
        raise HTTPException(status_code=400, detail="Baglanacak agent bulunamadi")
    return agent


def _fetch_dev_user(user_id: str) -> dict[str, Any]:
    user = (
        supabase.table("users")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
        .data
    )
    if not user:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi")
    return user


def _create_auth_backed_user(
    *,
    email: str,
    role: str,
    full_name: str,
    created_by: str,
    phone: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    password: Optional[str] = None,
    employee_access_level: Optional[str] = None,
    agency_id: Optional[str] = None,
    avatar_url: Optional[str] = None,
    brand_color_primary: Optional[str] = None,
    brand_color_secondary: Optional[str] = None,
) -> dict[str, Any]:
    clean_email = email.strip().lower()
    metadata = {
        "role": role,
        "full_name": full_name,
        "phone": phone or "",
        "city": city or "",
        "district": district or "",
        "employee_access_level": employee_access_level or "",
        "agency_id": agency_id or "",
        "avatar_url": avatar_url or "",
        "brand_color_primary": brand_color_primary or "",
        "brand_color_secondary": brand_color_secondary or "",
    }

    auth_response = supabase.auth.admin.create_user({
        "email": clean_email,
        "password": password or DEFAULT_TRIAL_PASSWORD,
        "email_confirm": True,
        "user_metadata": metadata,
    })

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Kullanici olusturulamadi")

    auth_id = str(auth_response.user.id)
    profile_data = None
    for _ in range(5):
        result = supabase.table("users").select("*").eq("auth_id", auth_id).maybe_single().execute()
        if result.data:
            profile_data = result.data
            break
        time.sleep(0.4)

    if not profile_data:
        inserted = (
            supabase.table("users")
            .insert({
                "auth_id": auth_id,
                "email": clean_email,
                "full_name": full_name.strip(),
                "role": role,
                "phone": phone,
                "city": city,
                "district": district,
                "employee_access_level": employee_access_level if role == "employee" else None,
                "created_by": created_by,
                "agency_id": agency_id,
                "avatar_url": avatar_url,
                "brand_color_primary": brand_color_primary,
                "brand_color_secondary": brand_color_secondary,
            })
            .execute()
        )
        profile_data = _first_row(inserted) or _fetch_row("users", "auth_id", auth_id)
        if not profile_data:
            raise HTTPException(status_code=500, detail="Profil olusturulamadi")
    else:
        supabase.table("users").update({
            "created_by": created_by,
            "phone": phone,
            "city": city,
            "district": district,
            "employee_access_level": employee_access_level if role == "employee" else None,
            "agency_id": agency_id,
            "avatar_url": avatar_url,
            "brand_color_primary": brand_color_primary,
            "brand_color_secondary": brand_color_secondary,
        }).eq("id", profile_data["id"]).execute()
        profile_data = _fetch_row("users", "id", profile_data["id"]) or profile_data

    return profile_data


def _require_agent_or_employee(user_id: str) -> dict[str, Any]:
    result = (
        supabase.table("users")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    user = result.data
    if not user or user.get("role") not in ["agent", "employee"]:
        raise HTTPException(status_code=404, detail="Emlakci kaydi bulunamadi")
    return user


@router.get("/session")
def get_admin_session(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    return {
        "user": {
            "id": current_user.get("id"),
            "email": current_user.get("email"),
            "full_name": current_user.get("full_name"),
            "role": current_user.get("role"),
        }
    }


@router.get("/dashboard")
def get_admin_dashboard(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)

    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    agencies = (
        supabase.table("agencies")
        .select("id, name, location, logo_url, entity_type, created_at")
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    users = (
        supabase.table("users")
        .select("id, role, full_name, email, avatar_url, agency_id, created_at")
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    properties = supabase.table("properties").select("id, status, monthly_rent").execute().data or []
    receipts = (
        supabase.table("receipts")
        .select("id")
        .gte("created_at", start_of_month)
        .execute()
        .data
        or []
    )
    maintenance = (
        supabase.table("maintenance_requests")
        .select("id")
        .gte("created_at", start_of_month)
        .execute()
        .data
        or []
    )

    offices = [agency for agency in agencies if agency.get("entity_type") != "company"]
    companies = [agency for agency in agencies if agency.get("entity_type") == "company"]
    standalone_agents = [user for user in users if user.get("role") == "agent" and not user.get("agency_id")]
    total_properties = len(properties)
    occupied_properties = len([item for item in properties if item.get("status") == "occupied"])
    avg_rent = round(
        sum(float(item.get("monthly_rent") or 0) for item in properties) / total_properties
    ) if total_properties else 0

    recent_agencies = [{
        "id": agency.get("id"),
        "type": "company" if agency.get("entity_type") == "company" else "office",
        "name": agency.get("name"),
        "location": agency.get("location") or "Konum belirtilmedi",
        "logo_url": agency.get("logo_url"),
    } for agency in agencies[:4]]
    recent_standalone = [{
        "id": user.get("id"),
        "type": "standalone",
        "name": user.get("full_name") or user.get("email"),
        "location": user.get("email"),
        "logo_url": user.get("avatar_url"),
    } for user in standalone_agents[:2]]

    return {
        "offices": len(offices),
        "companies": len(companies),
        "standaloneAgents": len(standalone_agents),
        "totalAgents": len([user for user in users if user.get("role") == "agent"]),
        "totalLandlords": len([user for user in users if user.get("role") == "landlord"]),
        "totalTenants": len([user for user in users if user.get("role") == "tenant"]),
        "totalProperties": total_properties,
        "occupiedProperties": occupied_properties,
        "avgRent": avg_rent,
        "receiptsUploadedThisMonth": len(receipts),
        "maintenanceCreatedThisMonth": len(maintenance),
        "recentRecords": [*recent_agencies, *recent_standalone][:5],
    }


@router.get("/structures")
def list_admin_structures(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)

    agencies = (
        supabase.table("agencies")
        .select("*")
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    standalone_agents = (
        supabase.table("users")
        .select("id, full_name, email, phone, avatar_url, created_at, brand_color_primary")
        .eq("role", "agent")
        .is_("agency_id", None)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )

    items = [
        {
            **agency,
            "source": "agency",
        }
        for agency in agencies
    ] + [
        {
            "id": user.get("id"),
            "name": user.get("full_name") or user.get("email"),
            "location": "",
            "logo_url": user.get("avatar_url"),
            "banner_url": None,
            "brand_color_primary": user.get("brand_color_primary"),
            "subscription_plan": "free",
            "status": "active",
            "active_regions": [],
            "source": "standalone_agent",
            "email": user.get("email"),
            "phone": user.get("phone"),
        }
        for user in standalone_agents
    ]

    return {"items": items}


@router.get("/agency-options")
def list_admin_agency_options(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    agencies = (
        supabase.table("agencies")
        .select("id, name, location, brand_color_primary, entity_type, status")
        .order("name", desc=False)
        .execute()
        .data
        or []
    )
    return {"agencies": agencies}


@router.get("/agencies/{agency_id}")
def get_admin_agency(agency_id: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    agency = (
        supabase.table("agencies")
        .select("*")
        .eq("id", agency_id)
        .maybe_single()
        .execute()
        .data
    )
    if not agency:
        raise HTTPException(status_code=404, detail="Sirket veya ofis bulunamadi")
    return {"agency": agency}


@router.post("/agencies")
def create_admin_agency(
    request: CreateAgencyRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)

    agency_result = (
        supabase.table("agencies")
        .insert({
            "entity_type": request.entity_type,
            "name": request.name.strip(),
            "location": request.location.strip(),
            "address": _strip_or_none(request.address),
            "logo_url": _strip_or_none(request.logo_url),
            "banner_url": _strip_or_none(request.banner_url),
            "brand_color_primary": _strip_or_none(request.brand_color_primary),
            "brand_color_secondary": _strip_or_none(request.brand_color_secondary),
            "active_regions": request.active_regions,
            "subscription_plan": request.subscription_plan,
            "max_properties": request.max_properties,
            "contract_start": request.contract_start,
            "contract_end": request.contract_end,
            "contact_email": request.contact_email.strip().lower(),
            "contact_phone": _strip_or_none(request.contact_phone),
            "notes": _strip_or_none(request.notes),
            "status": request.status,
        })
        .execute()
    )
    agency_data = _first_row(agency_result)
    if not agency_data:
        raise HTTPException(status_code=500, detail="Sirket veya ofis olusturulamadi")

    agent_profile = _create_auth_backed_user(
        email=request.contact_email,
        password=request.agent_password or DEFAULT_TRIAL_PASSWORD,
        role="agent",
        full_name=request.name.strip(),
        created_by=current_user["id"],
        phone=_strip_or_none(request.contact_phone),
        city=request.location.strip(),
        district=_strip_or_none(request.district),
        agency_id=agency_data["id"],
    )

    return {
        "success": True,
        "agency": agency_data,
        "agent": agent_profile,
    }


@router.patch("/agencies/{agency_id}")
def update_admin_agency(
    agency_id: str,
    request: UpdateAgencyRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    updates = request.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Guncellenecek alan bulunamadi")

    normalized = {}
    for key, value in updates.items():
        if isinstance(value, str):
            normalized[key] = _strip_or_none(value)
        else:
            normalized[key] = value
    normalized["updated_at"] = _now()

    supabase.table("agencies").update(normalized).eq("id", agency_id).execute()
    agency = _fetch_row("agencies", "id", agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Sirket veya ofis bulunamadi")

    return {"success": True, "agency": agency}


@router.get("/contacts")
def list_admin_contacts(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    contacts = (
        supabase.table("users")
        .select("id, full_name, email, phone, role, agency_id")
        .in_("role", ["agent", "employee"])
        .order("full_name", desc=False)
        .execute()
        .data
        or []
    )
    agency_ids = [item.get("agency_id") for item in contacts if item.get("agency_id")]
    agency_map = {}
    if agency_ids:
        agencies = (
            supabase.table("agencies")
            .select("id, name, location, logo_url, brand_color_primary")
            .in_("id", list(set(agency_ids)))
            .execute()
            .data
            or []
        )
        agency_map = {agency["id"]: agency for agency in agencies}

    for contact in contacts:
        contact["agencies"] = agency_map.get(contact.get("agency_id"))

    return {"contacts": contacts}


@router.get("/dev/users")
def list_admin_dev_users(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    users = (
        supabase.table("users")
        .select(
            "id, auth_id, email, full_name, phone, role, status, created_by, "
            "agency_id, employee_access_level, city, district, created_at"
        )
        .order("created_at", desc=True)
        .limit(250)
        .execute()
        .data
        or []
    )

    candidates = [
        user for user in users
        if user.get("role") in {"agent", "landlord", "tenant", "employee"}
    ]
    return {"users": candidates}


@router.get("/dev/agents")
def list_admin_dev_agents(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    agents = (
        supabase.table("users")
        .select(
            "id, email, full_name, phone, status, agency_id, brand_color_primary, "
            "agencies:agency_id(id, name, location, entity_type, brand_color_primary)"
        )
        .eq("role", "agent")
        .order("full_name", desc=False)
        .execute()
        .data
        or []
    )
    agencies = (
        supabase.table("agencies")
        .select("id, name, location, entity_type, status, brand_color_primary")
        .order("name", desc=False)
        .execute()
        .data
        or []
    )
    return {"agents": agents, "agencies": agencies}


@router.post("/dev/link-user")
def link_admin_dev_user(
    request: AdminDevLinkUserRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    target_user = _fetch_dev_user(request.user_id)
    role = request.role

    updates: dict[str, Any] = {
        "role": role,
        "status": request.status,
        "updated_at": _now(),
    }

    if role in {"tenant", "landlord", "employee"}:
        if not request.target_agent_id:
            raise HTTPException(status_code=400, detail="Tenant, landlord ve employee icin agent secilmelidir")
        agent = _fetch_agent_for_dev(request.target_agent_id)
        updates["created_by"] = agent["id"]
        updates["agency_id"] = None
        updates["employee_access_level"] = (
            request.employee_access_level or "limited"
            if role == "employee"
            else None
        )
    else:
        updates["created_by"] = target_user.get("created_by") or current_user.get("id")
        updates["agency_id"] = _strip_or_none(request.agency_id)
        updates["employee_access_level"] = None

    updated = (
        supabase.table("users")
        .update(updates)
        .eq("id", request.user_id)
        .execute()
        .data
    )
    user = (updated or [None])[0] or _fetch_dev_user(request.user_id)

    if target_user.get("auth_id"):
        try:
            supabase.auth.admin.update_user_by_id(
                target_user["auth_id"],
                {"user_metadata": _build_auth_metadata(user)},
            )
        except Exception:
            pass

    return {"success": True, "user": user}


@router.post("/agents/standalone")
def create_admin_standalone_agent(
    request: CreateStandaloneAgentRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    profile = _create_auth_backed_user(
        email=request.email,
        password=request.password or DEFAULT_TRIAL_PASSWORD,
        role="agent",
        full_name=request.full_name.strip(),
        created_by=current_user["id"],
        phone=_strip_or_none(request.phone),
        city=request.city.strip(),
        district=request.district.strip(),
        agency_id=None,
        avatar_url=_strip_or_none(request.avatar_url),
        brand_color_primary=_strip_or_none(request.brand_color_primary),
        brand_color_secondary=_strip_or_none(request.brand_color_secondary),
    )
    return {"success": True, "user": profile}


@router.get("/agents/{user_id}")
def get_admin_agent(user_id: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    user = _require_agent_or_employee(user_id)
    agency_options = (
        supabase.table("agencies")
        .select("id, name, location, brand_color_primary, entity_type")
        .order("name", desc=False)
        .execute()
        .data
        or []
    )
    return {"user": user, "agencies": agency_options}


@router.patch("/agents/{user_id}")
def update_admin_agent(
    user_id: str,
    request: UpdateAdminAgentRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    existing = _require_agent_or_employee(user_id)
    updates = request.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Guncellenecek alan bulunamadi")

    normalized: dict[str, Any] = {}
    for key, value in updates.items():
        if isinstance(value, str):
            normalized[key] = _strip_or_none(value)
        else:
            normalized[key] = value

    if "agency_id" in normalized and normalized["agency_id"]:
        normalized["brand_color_primary"] = None
        normalized["brand_color_secondary"] = None

    normalized["updated_at"] = _now()
    supabase.table("users").update(normalized).eq("id", user_id).execute()
    user = _fetch_row("users", "id", user_id)
    if not user:
        raise HTTPException(status_code=500, detail="Emlakci kaydi guncellenemedi")

    if existing.get("auth_id"):
        try:
            supabase.auth.admin.update_user_by_id(existing["auth_id"], {
                "user_metadata": _build_auth_metadata(user),
            })
        except Exception:
            pass

    return {"success": True, "user": user}


@router.get("/campaigns")
def list_admin_campaigns(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    campaigns = (
        supabase.table("ad_campaigns")
        .select("*")
        .order("sort_order", desc=False)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    return {"campaigns": campaigns}


@router.get("/campaigns/stats")
def list_admin_campaign_stats(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    campaigns = (
        supabase.table("ad_campaigns")
        .select("id, title, type")
        .execute()
        .data
        or []
    )
    stats_by_campaign: dict[str, dict[str, Any]] = {
        campaign["id"]: {
            "campaign_id": campaign["id"],
            "title": campaign.get("title"),
            "type": campaign.get("type"),
            "impressions": 0,
            "clicks": 0,
            "link_opens": 0,
        }
        for campaign in campaigns
        if campaign.get("id")
    }

    impressions = (
        supabase.table("ad_impressions")
        .select("ad_id, show_count")
        .execute()
        .data
        or []
    )
    for item in impressions:
        ad_id = item.get("ad_id")
        if ad_id not in stats_by_campaign:
            continue
        stats_by_campaign[ad_id]["impressions"] += int(item.get("show_count") or 0)

    interactions = (
        supabase.table("ad_interactions")
        .select("ad_id, event_type")
        .execute()
        .data
        or []
    )
    for item in interactions:
        ad_id = item.get("ad_id")
        if ad_id not in stats_by_campaign:
            continue
        if item.get("event_type") == "click":
            stats_by_campaign[ad_id]["clicks"] += 1
        elif item.get("event_type") == "link_open":
            stats_by_campaign[ad_id]["link_opens"] += 1

    return {"stats": list(stats_by_campaign.values())}


@router.get("/campaigns/{campaign_id}")
def get_admin_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    campaign = (
        supabase.table("ad_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .maybe_single()
        .execute()
        .data
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadi")
    return {"campaign": campaign}


@router.post("/campaigns")
def create_admin_campaign(
    request: AdminCampaignPayload,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    payload = _normalize_campaign_payload(request.model_dump(), for_update=False)
    result = supabase.table("ad_campaigns").insert(payload).execute()
    campaign = _first_row(result)
    if not campaign:
        raise HTTPException(status_code=500, detail="Kampanya kaydedilemedi")
    return {"success": True, "campaign": campaign}


@router.patch("/campaigns/{campaign_id}")
def update_admin_campaign(
    campaign_id: str,
    request: AdminCampaignUpdatePayload,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    payload = _normalize_campaign_payload(request.model_dump(exclude_unset=True), for_update=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Guncellenecek alan bulunamadi")
    supabase.table("ad_campaigns").update(payload).eq("id", campaign_id).execute()
    campaign = _fetch_row("ad_campaigns", "id", campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadi")
    return {"success": True, "campaign": campaign}


@router.delete("/campaigns/{campaign_id}")
def delete_admin_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    supabase.table("ad_campaigns").delete().eq("id", campaign_id).execute()
    return {"success": True}


@router.post("/campaigns/{campaign_id}/toggle")
def toggle_admin_campaign(
    campaign_id: str,
    request: AdminToggleActiveRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    supabase.table("ad_campaigns").update({"active": request.active}).eq("id", campaign_id).execute()
    campaign = _fetch_row("ad_campaigns", "id", campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadi")
    return {"success": True, "campaign": campaign}


@router.post("/campaigns/{campaign_id}/duplicate")
def duplicate_admin_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    existing = (
        supabase.table("ad_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .maybe_single()
        .execute()
        .data
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadi")

    payload = {key: value for key, value in existing.items() if key not in ["id", "created_at", "updated_at"]}
    payload["title"] = f"{existing.get('title') or existing.get('client_name') or 'Kampanya'} (Kopya)"
    payload["active"] = False

    result = supabase.table("ad_campaigns").insert(payload).execute()
    campaign = _first_row(result)
    if not campaign:
        raise HTTPException(status_code=500, detail="Kampanya kopyalanamadi")
    return {"success": True, "campaign": campaign}


@router.post("/uploads/public")
async def upload_admin_public_file(
    bucket: str = Form(...),
    folder: str = Form("misc"),
    path: Optional[str] = Form(None),
    upsert: bool = Form(False),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    if bucket not in UPLOAD_BUCKETS:
        raise HTTPException(status_code=400, detail="Desteklenmeyen bucket")
    content_type = (file.content_type or "").strip().lower()
    if content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Desteklenmeyen dosya tipi")

    raw_folder = folder.replace("\\", "/").strip("/")
    raw_path = path.replace("\\", "/").lstrip("/") if path else None
    file_name = file.filename or f"{uuid4().hex}.bin"
    safe_name = file_name.replace(" ", "-")
    final_path = raw_path or f"{raw_folder}/{uuid4().hex}-{safe_name}"
    encoded_path = urllib_parse.quote(final_path, safe="/")
    target_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{encoded_path}"

    body = await file.read()
    if not body:
        raise HTTPException(status_code=400, detail="Bos dosya yuklenemez")
    if len(body) > MAX_ADMIN_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Dosya boyutu 10 MB sinirini asiyor")
    request = urllib_request.Request(
        target_url,
        data=body,
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": content_type,
            "x-upsert": "true" if upsert else "false",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(request, timeout=20):
            return {
                "path": final_path,
                "public_url": build_public_storage_url(bucket, final_path),
            }
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=exc.code, detail=detail or "Dosya yuklenemedi") from exc
    except urllib_error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Dosya yuklenemedi: {exc}") from exc
