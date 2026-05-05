import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends

from core.database import supabase
from core.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)


def _normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    normalized: list[str] = []
    for item in value:
        text = str(item or "").strip()
        if text:
            normalized.append(text)
    return normalized


def _resolve_campaign_scope(current_user: dict) -> tuple[str | None, list[str], str | None]:
    province = (current_user.get("city") or "").strip() or None
    districts = _normalize_string_list([current_user.get("district")])
    agency_id = current_user.get("agency_id")

    if agency_id:
        try:
            agency = (
                supabase.table("agencies")
                .select("location, active_regions")
                .eq("id", agency_id)
                .maybe_single()
                .execute()
                .data
            )
            if agency:
                province = (agency.get("location") or province or "").strip() or province
                districts = list(
                    dict.fromkeys(
                        [
                            *districts,
                            *_normalize_string_list(agency.get("active_regions")),
                        ]
                    )
                )
        except Exception as exc:
            logger.warning("Campaign scope agency lookup failed, falling back to user scope: %s", exc)

    return province, districts, agency_id


def _list_active_campaigns() -> list[dict]:
    try:
        return (
            supabase.table("ad_campaigns")
            .select("*")
            .eq("active", True)
            .order("sort_order", desc=False)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("Ordered dashboard campaign query failed, retrying without sort: %s", exc)

    try:
        return (
            supabase.table("ad_campaigns")
            .select("*")
            .eq("active", True)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("Dashboard campaign query skipped, returning empty list: %s", exc)
        return []


def _campaign_is_active_today(campaign: dict, today: str) -> bool:
    start_date = (campaign.get("start_date") or "").strip()
    end_date = (campaign.get("end_date") or "").strip()

    if start_date and start_date > today:
        return False
    if end_date and end_date < today:
        return False
    return True


def _campaign_matches_user(
    campaign: dict,
    *,
    role: str | None,
    province: str | None,
    districts: list[str],
    agency_id: str | None,
) -> bool:
    target_roles = _normalize_string_list(campaign.get("target_roles"))
    if target_roles and role not in target_roles:
        return False

    target_provinces = _normalize_string_list(campaign.get("target_provinces"))
    if target_provinces and (not province or province not in target_provinces):
        return False

    target_districts = _normalize_string_list(campaign.get("target_districts"))
    if target_districts and not set(target_districts).intersection(districts):
        return False

    target_agencies = _normalize_string_list(campaign.get("target_agency_ids"))
    if target_agencies and (not agency_id or agency_id not in target_agencies):
        return False

    return True


@router.get("/stats")
def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    stats = {}
    uid = current_user["id"]

    if current_user["role"] == "agent":
        total = supabase.table("properties").select("id", count="exact").eq("agent_id", uid).execute()
        occupied = (
            supabase.table("properties")
            .select("id", count="exact")
            .eq("agent_id", uid)
            .eq("status", "occupied")
            .execute()
        )

        props = supabase.table("properties").select("id").eq("agent_id", uid).execute()
        prop_ids = [p["id"] for p in props.data]

        pending_receipts = 0
        pending_maintenance = 0
        if prop_ids:
            pr = (
                supabase.table("receipts")
                .select("id", count="exact")
                .in_("property_id", prop_ids)
                .eq("status", "pending")
                .execute()
            )
            pending_receipts = pr.count or 0
            pm = (
                supabase.table("maintenance_requests")
                .select("id", count="exact")
                .in_("property_id", prop_ids)
                .eq("status", "pending")
                .execute()
            )
            pending_maintenance = pm.count or 0

        total_count = total.count or 0
        occupied_count = occupied.count or 0
        stats = {
            "total_properties": total_count,
            "occupied_properties": occupied_count,
            "vacant_properties": total_count - occupied_count,
            "pending_receipts": pending_receipts,
            "pending_maintenance": pending_maintenance,
        }

    elif current_user["role"] == "landlord":
        props = supabase.table("properties").select("id, status").eq("landlord_id", uid).execute()
        properties = props.data
        prop_ids = [p["id"] for p in properties]

        total_properties = len(properties)
        occupied = len([p for p in properties if p["status"] == "occupied"])

        approved_receipts = 0
        pending_receipts = 0
        if prop_ids:
            ar = (
                supabase.table("receipts")
                .select("id", count="exact")
                .in_("property_id", prop_ids)
                .eq("status", "approved")
                .execute()
            )
            approved_receipts = ar.count or 0
            pr = (
                supabase.table("receipts")
                .select("id", count="exact")
                .in_("property_id", prop_ids)
                .eq("status", "pending")
                .execute()
            )
            pending_receipts = pr.count or 0

        stats = {
            "total_properties": total_properties,
            "occupied_properties": occupied,
            "approved_receipts": approved_receipts,
            "pending_receipts": pending_receipts,
        }

    elif current_user["role"] == "tenant":
        prop = supabase.table("properties").select("id, monthly_rent").eq("tenant_id", uid).limit(1).execute()
        if prop.data:
            property_id = prop.data[0]["id"]
            monthly_rent = prop.data[0].get("monthly_rent", 0)

            tr = supabase.table("receipts").select("id", count="exact").eq("property_id", property_id).execute()
            ar = (
                supabase.table("receipts")
                .select("id", count="exact")
                .eq("property_id", property_id)
                .eq("status", "approved")
                .execute()
            )
            pr = (
                supabase.table("receipts")
                .select("id", count="exact")
                .eq("property_id", property_id)
                .eq("status", "pending")
                .execute()
            )
            mr = (
                supabase.table("maintenance_requests")
                .select("id", count="exact")
                .eq("property_id", property_id)
                .execute()
            )

            stats = {
                "total_receipts": tr.count or 0,
                "approved_receipts": ar.count or 0,
                "pending_receipts": pr.count or 0,
                "maintenance_requests": mr.count or 0,
                "monthly_rent": monthly_rent,
            }
        else:
            stats = {"message": "No property assigned"}

    return stats


@router.get("/campaigns")
def list_dashboard_campaigns(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    province, districts, agency_id = _resolve_campaign_scope(current_user)
    campaigns = _list_active_campaigns()

    matched = [
        campaign
        for campaign in campaigns
        if _campaign_is_active_today(campaign, today)
        and _campaign_matches_user(
            campaign,
            role=current_user.get("role"),
            province=province,
            districts=districts,
            agency_id=agency_id,
        )
    ]

    return {"campaigns": matched}
