from datetime import datetime
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from core.access import (
    assert_can_landlord_note_maintenance,
    assert_can_manage_maintenance,
    assert_can_tenant_review_maintenance,
    assert_can_view_maintenance,
    can_manage_office_records,
    get_maintenance_or_404,
    get_maintenance_property_id_list,
    get_office_owner_id,
    get_property_or_404,
    is_full_employee,
)
from core.database import supabase
from core.notifications import notify_user
from core.security import get_current_user
from models.schemas import (
    AssignTechnicianRequest,
    CreateMaintenanceRequest,
    LandlordMaintenanceNoteRequest,
    MaintenanceLogRequest,
    MaintenanceTransitionRequest,
    TenantMaintenanceReviewRequest,
)
import json

router = APIRouter(prefix="/maintenance", tags=["maintenance"])
logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.utcnow().isoformat()


def _insert_log(request_id: str, user: dict, note: Optional[str], photo_urls: list[str]) -> None:
    if not note and not photo_urls:
        return
    supabase.table("maintenance_logs").insert({
        "request_id": request_id,
        "user_id": user["id"],
        "user_name": user.get("full_name") or user.get("email") or "Kullanici",
        "user_role": user["role"],
        "note": note or None,
        "photo_urls": photo_urls or [],
        "created_at": _now(),
    }).execute()


def _serialize_detail(maintenance_doc: dict, property_doc: dict) -> dict:
    logs = (
        supabase.table("maintenance_logs")
        .select("*")
        .eq("request_id", maintenance_doc["id"])
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )

    maintenance_doc["property"] = {
        "id": property_doc["id"],
        "address": property_doc.get("address"),
        "city": property_doc.get("city"),
        "district": property_doc.get("district"),
        "agent_id": property_doc.get("agent_id"),
        "landlord_id": property_doc.get("landlord_id"),
        "tenant_id": property_doc.get("tenant_id"),
        "employee_id": property_doc.get("employee_id"),
    }
    maintenance_doc["logs"] = logs
    return maintenance_doc


def _transition_status(current_status: str, action: str) -> str:
    transitions = {
        ("pending", "start"): "in_progress",
        ("pending", "reject"): "rejected",
        ("in_progress", "complete"): "completed",
        ("in_progress", "reopen"): "pending",
    }
    next_status = transitions.get((current_status, action))
    if not next_status:
        raise HTTPException(status_code=400, detail="Gecersiz durum gecisi")
    return next_status


@router.post("/create")
def create_maintenance_request(
    request: CreateMaintenanceRequest,
    current_user: dict = Depends(get_current_user),
):
    property_doc = get_property_or_404(request.property_id)

    can_create = (
        current_user["role"] in ["tenant", "agent", "admin"]
        or is_full_employee(current_user)
    )
    if not can_create:
        raise HTTPException(status_code=403, detail="Bu kullanici bakim talebi olusturamaz")

    if current_user["role"] == "tenant":
        if property_doc.get("tenant_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Yalnizca kendi mulkunuz icin talep olusturabilirsiniz")
    elif current_user["role"] in ["agent", "employee"]:
        office_owner_id = get_office_owner_id(current_user)
        if property_doc.get("agent_id") != office_owner_id:
            raise HTTPException(status_code=403, detail="Bu mulk ofisinize ait degil")
        if current_user["role"] == "employee" and not can_manage_office_records(current_user):
            raise HTTPException(status_code=403, detail="Sinirli calisan talep olusturamaz")

    now = _now()
    maintenance_doc = {
        "property_id": request.property_id,
        "created_by": current_user["id"],
        "creator_name": current_user.get("full_name") or current_user.get("email"),
        "creator_role": current_user["role"],
        "title": request.title,
        "description": request.description,
        "photo_urls": request.photo_urls or [],
        "priority": request.priority,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }

    result = supabase.table("maintenance_requests").insert(maintenance_doc).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Bakim talebi kaydedilemedi")
    created_request = result.data[0]
    request_id = created_request["id"]

    notify_user(property_doc.get("landlord_id"), "maintenance", "Yeni Bakim Talebi", request.title, request_id)
    if property_doc.get("employee_id"):
        notify_user(
            property_doc.get("employee_id"),
            "maintenance",
            "Atanan Bakim Talebi",
            f"{request.title} talebi sizin islem yapmanizi bekliyor.",
            request_id,
        )
        notify_user(
            property_doc.get("agent_id"),
            "maintenance",
            "Bakim Talebi Bilgisi",
            f"{request.title} talebi atanan calisana iletildi.",
            request_id,
        )
    else:
        notify_user(
            property_doc.get("agent_id"),
            "maintenance",
            "Yeni Bakim Talebi",
            f"{request.title} talebi islem bekliyor.",
            request_id,
        )

    if current_user["role"] != "tenant" and property_doc.get("tenant_id"):
        notify_user(
            property_doc.get("tenant_id"),
            "maintenance",
            "Bakim Talebi Olusturuldu",
            f"{request.title} icin talep kaydi olusturuldu.",
            request_id,
        )

    return {"success": True, "request_id": request_id}


@router.get("/list")
def list_maintenance_requests(
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("maintenance_requests").select("*")

    if property_id:
        property_doc = get_property_or_404(property_id)
        assert_can_view_maintenance(current_user, property_doc)
        query = query.eq("property_id", property_id)
    elif current_user["role"] != "admin":
        property_ids = get_maintenance_property_id_list(current_user)
        if not property_ids:
            return {"maintenance_requests": []}
        query = query.in_("property_id", property_ids)

    if status:
        query = query.eq("status", status)

    requests = query.order("created_at", desc=True).execute().data or []

    request_property_ids = list({item["property_id"] for item in requests if item.get("property_id")})
    property_map = {}
    if request_property_ids:
        properties = (
            supabase.table("properties")
            .select("id, address, city, district, tenant_id")
            .in_("id", request_property_ids)
            .execute()
            .data
            or []
        )
        property_map = {item["id"]: item for item in properties}

    for item in requests:
        property_doc = property_map.get(item.get("property_id"))
        if property_doc:
            item["property_address"] = property_doc.get("address")
            item["property_city"] = property_doc.get("city")
            item["property_district"] = property_doc.get("district")
            item["property_tenant_id"] = property_doc.get("tenant_id")

    return {"maintenance_requests": requests}


@router.get("/{request_id}")
def get_maintenance_request(request_id: str, current_user: dict = Depends(get_current_user)):
    maintenance_doc = get_maintenance_or_404(request_id)
    property_doc = get_property_or_404(maintenance_doc["property_id"])
    assert_can_view_maintenance(current_user, property_doc)
    return _serialize_detail(maintenance_doc, property_doc)


@router.post("/{request_id}/transition")
def transition_maintenance(
    request_id: str,
    request: MaintenanceTransitionRequest,
    current_user: dict = Depends(get_current_user),
):
    maintenance_doc = get_maintenance_or_404(request_id)
    property_doc = get_property_or_404(maintenance_doc["property_id"])
    assert_can_manage_maintenance(current_user, property_doc)

    next_status = _transition_status(maintenance_doc["status"], request.action)
    now = _now()

    _insert_log(request_id, current_user, request.note, request.photo_urls)

    update_payload = {
        "status": next_status,
        "updated_at": now,
    }

    if request.action == "complete":
        update_payload["tenant_approved_at"] = None
        update_payload["tenant_rejected_at"] = None
        update_payload["tenant_rejection_reason"] = None

    supabase.table("maintenance_requests").update(update_payload).eq("id", request_id).execute()

    if property_doc.get("tenant_id"):
        tenant_messages = {
            "start": "Bakim talebiniz isleme alindi.",
            "reject": "Bakim talebiniz reddedildi.",
            "complete": "Bakim talebiniz tamamlandi, onayiniz bekleniyor.",
            "reopen": "Bakim talebi tekrar beklemeye alindi.",
        }
        notify_user(
            property_doc.get("tenant_id"),
            "maintenance",
            "Bakim Durumu Guncellendi",
            tenant_messages.get(request.action, "Bakim talebiniz guncellendi."),
            request_id,
        )

    if current_user["role"] == "employee" and property_doc.get("agent_id"):
        notify_user(
            property_doc.get("agent_id"),
            "maintenance",
            "Bakim Islem Bilgisi",
            f"{maintenance_doc.get('title')} talebi uzerinde islem yapildi.",
            request_id,
        )

    return {"success": True, "status": next_status}


@router.post("/{request_id}/tenant-review")
def tenant_review_maintenance(
    request_id: str,
    request: TenantMaintenanceReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    maintenance_doc = get_maintenance_or_404(request_id)
    property_doc = get_property_or_404(maintenance_doc["property_id"])
    assert_can_tenant_review_maintenance(current_user, property_doc)

    if maintenance_doc["status"] != "completed":
        raise HTTPException(status_code=400, detail="Kiraci onayi yalnizca tamamlanan taleplerde kullanilabilir")

    now = _now()
    if request.action == "approve":
        supabase.table("maintenance_requests").update({
            "tenant_approved_at": now,
            "updated_at": now,
        }).eq("id", request_id).execute()
        notify_user(property_doc.get("agent_id"), "maintenance", "Bakim Onaylandi", "Kiraci islemi onayladi.", request_id)
        if property_doc.get("employee_id"):
            notify_user(property_doc.get("employee_id"), "maintenance", "Bakim Onaylandi", "Kiraci islemi onayladi.", request_id)
        return {"success": True, "status": "completed"}

    if not request.reason or not request.reason.strip():
        raise HTTPException(status_code=400, detail="Red aciklamasi zorunludur")

    supabase.table("maintenance_requests").update({
        "status": "in_progress",
        "tenant_rejected_at": now,
        "tenant_rejection_reason": request.reason.strip(),
        "tenant_approved_at": None,
        "updated_at": now,
    }).eq("id", request_id).execute()

    notify_user(property_doc.get("agent_id"), "maintenance", "Bakim Reddedildi", "Kiraci tamamlanan isi reddetti.", request_id)
    if property_doc.get("employee_id"):
        notify_user(property_doc.get("employee_id"), "maintenance", "Bakim Reddedildi", "Kiraci tamamlanan isi reddetti.", request_id)

    return {"success": True, "status": "in_progress"}


@router.post("/{request_id}/log")
def add_maintenance_log(
    request_id: str,
    request: MaintenanceLogRequest,
    current_user: dict = Depends(get_current_user),
):
    maintenance_doc = get_maintenance_or_404(request_id)
    property_doc = get_property_or_404(maintenance_doc["property_id"])
    assert_can_manage_maintenance(current_user, property_doc)

    if not request.note and not request.photo_urls:
        raise HTTPException(status_code=400, detail="Not veya fotograf eklenmelidir")

    _insert_log(request_id, current_user, request.note, request.photo_urls)
    return {"success": True}


@router.post("/{request_id}/landlord-note")
def add_landlord_maintenance_note(
    request_id: str,
    request: LandlordMaintenanceNoteRequest,
    current_user: dict = Depends(get_current_user),
):
    maintenance_doc = get_maintenance_or_404(request_id)
    property_doc = get_property_or_404(maintenance_doc["property_id"])
    assert_can_landlord_note_maintenance(current_user, property_doc)

    note = request.note.strip()
    if not note:
        raise HTTPException(status_code=400, detail="Bilgi notu zorunludur")

    now = _now()
    _insert_log(request_id, current_user, note, [])
    supabase.table("maintenance_requests").update({
        "updated_at": now,
    }).eq("id", request_id).execute()

    actor_name = current_user.get("full_name") or "Ev sahibi"
    message = f"{actor_name} bilgi notu paylasti: {note}"
    notify_user(property_doc.get("tenant_id"), "maintenance", "Ev Sahibinden Bilgi Notu", message, request_id)
    notify_user(property_doc.get("agent_id"), "maintenance", "Ev Sahibinden Bilgi Notu", message, request_id)
    if property_doc.get("employee_id"):
        notify_user(property_doc.get("employee_id"), "maintenance", "Ev Sahibinden Bilgi Notu", message, request_id)

    return {"success": True}


@router.post("/{request_id}/assign-technician")
def assign_technician(
    request_id: str,
    request: AssignTechnicianRequest,
    current_user: dict = Depends(get_current_user),
):
    """Assign a technician from office contacts to a maintenance request."""
    maintenance_doc = get_maintenance_or_404(request_id)
    property_doc = get_property_or_404(maintenance_doc["property_id"])
    assert_can_manage_maintenance(current_user, property_doc)

    office_owner_id = get_office_owner_id(current_user)
    technician_id = request.technician_id

    technician = (
        supabase.table("office_contacts")
        .select("*")
        .eq("id", technician_id)
        .eq("office_id", office_owner_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    ).data

    if not technician:
        raise HTTPException(status_code=404, detail="Usta bulunamadı")

    technician_snapshot = {
        "id": technician["id"],
        "full_name": technician["full_name"],
        "phone": technician["phone"],
        "profession": technician["profession"],
        "email": technician.get("email"),
        "deleted_at": technician.get("deleted_at"),
        "assigned_at": _now(),
    }

    now = _now()
    supabase.table("maintenance_requests").update({
        "assigned_technician_id": technician_id,
        "assigned_technician_snapshot": technician_snapshot,
        "updated_at": now,
    }).eq("id", request_id).execute()

    _insert_log(
        request_id,
        current_user,
        f"{technician['full_name']} ({technician['profession']}) görevlendirildi",
        []
    )

    actor_name = current_user.get("full_name") or "Ofis"
    message = f"{actor_name} tarafından {technician['full_name']} görevlendirildi"
    notify_user(property_doc.get("tenant_id"), "maintenance", "Usta Atandı", message, request_id)
    notify_user(property_doc.get("landlord_id"), "maintenance", "Usta Atandı", message, request_id)

    return {"success": True}
