from datetime import datetime
import logging
from pathlib import PurePosixPath
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from core.access import (
    assert_can_review_receipt,
    assert_can_upload_receipt,
    assert_can_view_receipt,
    get_property_or_404,
    get_receipt_or_404,
    get_receipt_property_id_list,
)
from core.database import supabase
from core.notifications import notify_user
from core.security import get_current_user
from core.storage import normalize_storage_path, remove_storage_object
from models.schemas import (
    ReviewReceiptRequest,
    RevokeReceiptReviewRequest,
    UploadReceiptRequest,
    WithdrawReceiptRequest,
)

router = APIRouter(prefix="/receipts", tags=["receipts"])
logger = logging.getLogger(__name__)
ALLOWED_RECEIPT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".webp"}
MAX_RECEIPT_NOTES_LENGTH = 1000


def _now() -> str:
    return datetime.utcnow().isoformat()


def _validate_receipt_upload_request(request: UploadReceiptRequest) -> None:
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Dekont tutari sifirdan buyuk olmalidir")

    try:
        datetime.strptime(request.month, "%Y-%m")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Ay alani YYYY-MM formatinda olmalidir") from exc

    if request.notes and len(request.notes.strip()) > MAX_RECEIPT_NOTES_LENGTH:
        raise HTTPException(status_code=400, detail="Dekont notu 1000 karakteri gecemez")

    if not request.storage_path and not request.document_url:
        raise HTTPException(status_code=400, detail="Dekont dosya yolu zorunludur")

    if request.storage_path:
        normalized_path = request.storage_path.replace("\\", "/").strip().lstrip("/")
        if not normalized_path or ".." in normalized_path.split("/"):
            raise HTTPException(status_code=400, detail="Gecersiz dekont dosya yolu")
        extension = PurePosixPath(normalized_path).suffix.lower()
        if extension not in ALLOWED_RECEIPT_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Desteklenmeyen dekont dosya tipi")

    if request.document_url:
        normalized_url = request.document_url.strip().lower()
        if normalized_url.startswith("file:") or normalized_url.startswith("content:"):
            raise HTTPException(status_code=400, detail="Gecersiz dekont dosya baglantisi")


def _log_event(receipt_id: str, event_type: str, actor_id: Optional[str], detail: Optional[str] = None) -> None:
    try:
        supabase.table("receipt_events").insert({
            "receipt_id": receipt_id,
            "event_type": event_type,
            "actor_id": actor_id,
            "detail": detail,
            "created_at": _now(),
        }).execute()
    except Exception as exc:
        logger.warning("Receipt event logging failed for receipt %s: %s", receipt_id, exc)


def _resolve_receipt_storage_path(receipt_doc: dict) -> Optional[str]:
    return normalize_storage_path(receipt_doc.get("storage_path")) or normalize_storage_path(receipt_doc.get("document_url"))


def _cleanup_replaced_receipt_file(replaced_receipt_id: Optional[str], current_user: dict, property_doc: dict) -> None:
    if not replaced_receipt_id:
        return

    replaced_receipt = get_receipt_or_404(replaced_receipt_id)
    if replaced_receipt.get("property_id") != property_doc.get("id"):
        raise HTTPException(status_code=400, detail="Degistirilen dekont ayni mulke ait degil")
    if replaced_receipt.get("uploaded_by") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Bu dekont degistirilemez")

    storage_path = _resolve_receipt_storage_path(replaced_receipt)
    if not storage_path or replaced_receipt.get("status") not in ["rejected", "withdrawn"]:
        return

    try:
        remove_storage_object("receipts", storage_path)
    except RuntimeError as exc:
        logger.warning("Replacement cleanup failed for receipt %s: %s", replaced_receipt_id, exc)
        return

    supabase.table("receipts").update({
        "document_url": None,
        "storage_path": None,
        "updated_at": _now(),
    }).eq("id", replaced_receipt_id).execute()
    _log_event(replaced_receipt_id, "replacement_file_deleted", current_user["id"])


def _serialize_receipt_detail(receipt_doc: dict, property_doc: dict) -> dict:
    uploader = None
    if receipt_doc.get("uploaded_by"):
        uploader = (
            supabase.table("users")
            .select("id, full_name, email, phone")
            .eq("id", receipt_doc["uploaded_by"])
            .maybe_single()
            .execute()
            .data
        )

    try:
        events = (
            supabase.table("receipt_events")
            .select("*, actor:users(id, full_name, email)")
            .eq("receipt_id", receipt_doc["id"])
            .order("created_at", desc=False)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("Receipt events fetch failed for receipt %s: %s", receipt_doc["id"], exc)
        events = []

    receipt_doc["property"] = {
        "id": property_doc["id"],
        "address": property_doc.get("address"),
        "city": property_doc.get("city"),
        "district": property_doc.get("district"),
        "landlord_id": property_doc.get("landlord_id"),
        "tenant_id": property_doc.get("tenant_id"),
        "agent_id": property_doc.get("agent_id"),
        "employee_id": property_doc.get("employee_id"),
    }
    receipt_doc["uploader"] = uploader
    receipt_doc["events"] = events
    return receipt_doc


@router.post("/upload")
def upload_receipt(request: UploadReceiptRequest, current_user: dict = Depends(get_current_user)):
    _validate_receipt_upload_request(request)
    property_doc = get_property_or_404(request.property_id)
    assert_can_upload_receipt(current_user, property_doc)

    now = _now()
    receipt_doc = {
        "property_id": request.property_id,
        "uploaded_by": current_user["id"],
        "uploader_name": current_user.get("full_name") or current_user.get("email"),
        "receipt_type": request.receipt_type,
        "amount": request.amount,
        "month": request.month,
        "document_url": request.document_url or request.storage_path,
        "storage_path": request.storage_path,
        "notes": request.notes,
        "status": "pending",
        "pending_since_at": now,
        "replaces_receipt_id": request.replaces_receipt_id,
        "created_at": now,
        "updated_at": now,
    }

    result = supabase.table("receipts").insert(receipt_doc).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Dekont kaydedilemedi")
    created_receipt = result.data[0]
    receipt_id = created_receipt["id"]

    if request.replaces_receipt_id:
        _cleanup_replaced_receipt_file(request.replaces_receipt_id, current_user, property_doc)

    _log_event(
        receipt_id,
        "replacement_uploaded" if request.replaces_receipt_id else "uploaded",
        current_user["id"],
        request.notes,
    )
    notify_user(
        property_doc.get("landlord_id"),
        "receipt",
        "Yeni Dekont Yüklendi",
        f"{receipt_doc['uploader_name']} yeni bir dekont yukledi.",
        receipt_id,
    )
    return {"success": True, "receipt_id": receipt_id}


@router.get("/list")
def list_receipts(
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("receipts").select("*")

    if property_id:
        property_doc = get_property_or_404(property_id)
        assert_can_view_receipt(current_user, property_doc)
        query = query.eq("property_id", property_id)
    elif current_user["role"] != "admin":
        property_ids = get_receipt_property_id_list(current_user)
        if not property_ids:
            return {"receipts": []}
        query = query.in_("property_id", property_ids)

    if status:
        query = query.eq("status", status)

    receipts = query.order("created_at", desc=True).execute().data or []

    receipt_property_ids = list({item["property_id"] for item in receipts if item.get("property_id")})
    property_map = {}
    if receipt_property_ids:
        properties = (
            supabase.table("properties")
            .select("id, address, city, district")
            .in_("id", receipt_property_ids)
            .execute()
            .data
            or []
        )
        property_map = {item["id"]: item for item in properties}

    for receipt in receipts:
        property_doc = property_map.get(receipt.get("property_id"))
        if property_doc:
            receipt["property_address"] = property_doc.get("address")
            receipt["property_city"] = property_doc.get("city")
            receipt["property_district"] = property_doc.get("district")

    return {"receipts": receipts}


@router.get("/{receipt_id}")
def get_receipt(receipt_id: str, current_user: dict = Depends(get_current_user)):
    receipt_doc = get_receipt_or_404(receipt_id)
    property_doc = get_property_or_404(receipt_doc["property_id"])
    assert_can_view_receipt(current_user, property_doc)
    return _serialize_receipt_detail(receipt_doc, property_doc)


@router.post("/{receipt_id}/review")
def review_receipt(
    receipt_id: str,
    request: ReviewReceiptRequest,
    current_user: dict = Depends(get_current_user),
):
    receipt_doc = get_receipt_or_404(receipt_id)
    property_doc = get_property_or_404(receipt_doc["property_id"])
    assert_can_review_receipt(current_user, property_doc)

    if receipt_doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Yalnizca bekleyen dekontlar degerlendirilebilir")

    next_status = "approved" if request.action == "approve" else "rejected"
    now = _now()
    supabase.table("receipts").update({
        "status": next_status,
        "reviewed_by": current_user["id"],
        "reviewer_name": current_user.get("full_name") or current_user.get("email"),
        "updated_at": now,
    }).eq("id", receipt_id).execute()

    _log_event(
        receipt_id,
        "reviewed_approved" if next_status == "approved" else "reviewed_rejected",
        current_user["id"],
        request.notes,
    )

    if next_status == "approved":
        amount = receipt_doc.get("amount")
        month = receipt_doc.get("month", "")
        receipt_type = receipt_doc.get("receipt_type", "")
        type_label = {"rent": "Kira", "dues": "Aidat", "other": "Diğer"}.get(receipt_type, "Ödeme")
        try:
            month_label = datetime.strptime(month, "%Y-%m").strftime("%B %Y") if month else ""
        except ValueError:
            month_label = month
        amount_str = f"{float(amount):,.0f} ₺".replace(",", ".") if amount is not None else ""
        tenant_msg = f"✅ {type_label} dekontu onaylandı."
        if amount_str and month_label:
            tenant_msg = f"✅ {month_label} {type_label.lower()} dekontu ({amount_str}) onaylandı."
        elif amount_str:
            tenant_msg = f"✅ {type_label} dekontu ({amount_str}) onaylandı."
        notify_user(
            receipt_doc.get("uploaded_by"),
            "receipt",
            "Dekont Onaylandı",
            tenant_msg,
            receipt_id,
        )
        # Notify landlord too if reviewer is the agent (not the landlord themselves)
        landlord_id = property_doc.get("landlord_id")
        if landlord_id and landlord_id != current_user["id"]:
            landlord_msg = tenant_msg.replace("✅", "💰").replace("onaylandı", "tahsil edildi")
            notify_user(
                landlord_id,
                "receipt",
                "Kira Tahsilatı",
                landlord_msg,
                receipt_id,
            )
    else:
        notify_user(
            receipt_doc.get("uploaded_by"),
            "receipt",
            "Dekont Reddedildi",
            "Yüklediğiniz dekont reddedildi. Lütfen yeni bir dekont yükleyin.",
            receipt_id,
        )
        landlord_id = property_doc.get("landlord_id")
        if landlord_id and landlord_id != current_user["id"]:
            notify_user(
                landlord_id,
                "receipt",
                "Dekont Reddedildi",
                "Kiracının yüklediği dekont reddedildi. Kiracı yeni dekont yüklemeli.",
                receipt_id,
            )

    return {"success": True, "status": next_status}


@router.post("/{receipt_id}/withdraw")
def withdraw_receipt(
    receipt_id: str,
    request: WithdrawReceiptRequest,
    current_user: dict = Depends(get_current_user),
):
    receipt_doc = get_receipt_or_404(receipt_id)
    property_doc = get_property_or_404(receipt_doc["property_id"])
    assert_can_view_receipt(current_user, property_doc)

    if current_user["role"] != "tenant" or receipt_doc.get("uploaded_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Yalnizca yukleyen kiraci dekontu geri alabilir")
    if receipt_doc["status"] not in ["pending", "rejected"]:
        raise HTTPException(status_code=400, detail="Bu dekont geri alinamaz")

    storage_path = _resolve_receipt_storage_path(receipt_doc)
    if storage_path:
        try:
            remove_storage_object("receipts", storage_path)
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    now = _now()
    supabase.table("receipts").update({
        "status": "withdrawn",
        "withdrawn_at": now,
        "withdrawn_by": current_user["id"],
        "withdrawal_reason": request.reason,
        "document_url": None,
        "storage_path": None,
        "updated_at": now,
    }).eq("id", receipt_id).execute()

    _log_event(receipt_id, "withdrawn_by_tenant", current_user["id"], request.reason)
    notify_user(
        property_doc.get("landlord_id"),
        "receipt",
        "Dekont Geri Alindi",
        "Kiraci bekleyen dekontu geri aldi.",
        receipt_id,
    )
    return {"success": True, "status": "withdrawn"}


@router.post("/{receipt_id}/revoke-review")
def revoke_receipt_review(
    receipt_id: str,
    request: RevokeReceiptReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    receipt_doc = get_receipt_or_404(receipt_id)
    property_doc = get_property_or_404(receipt_doc["property_id"])
    assert_can_review_receipt(current_user, property_doc)

    if receipt_doc["status"] not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Yalnizca sonuclanmis dekontlar tekrar beklemeye alinabilir")
    if not request.reason.strip():
        raise HTTPException(status_code=400, detail="Karar geri alma aciklamasi zorunludur")

    now = _now()
    supabase.table("receipts").update({
        "status": "pending",
        "pending_since_at": now,
        "decision_revoked_at": now,
        "decision_revoked_by": current_user["id"],
        "decision_revocation_reason": request.reason.strip(),
        "updated_at": now,
    }).eq("id", receipt_id).execute()

    _log_event(receipt_id, "review_revoked", current_user["id"], request.reason.strip())
    notify_user(
        receipt_doc.get("uploaded_by"),
        "receipt",
        "Dekont Karari Geri Alindi",
        "Ev sahibi onceki karari geri aldi. Dekont tekrar incelenecek.",
        receipt_id,
    )
    return {"success": True, "status": "pending"}
