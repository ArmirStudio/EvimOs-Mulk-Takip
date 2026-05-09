from datetime import datetime
from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException

from core.access import can_manage_office_contacts, get_office_owner_id
from core.database import supabase
from core.security import get_current_user
from models.schemas import CreateOfficeContactRequest, UpdateOfficeContactRequest

router = APIRouter(prefix="/office-contacts", tags=["contacts"])


def _now() -> str:
    return datetime.utcnow().isoformat()


def _normalize_phone(phone: str) -> Optional[str]:
    raw = (phone or "").strip()
    if not raw:
        return None

    digits = re.sub(r"\D", "", raw)
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


def _office_id(current_user: dict) -> str:
    office_id = get_office_owner_id(current_user)
    if not office_id:
        raise HTTPException(status_code=403, detail="Ofis sahibi bulunamadı")
    return office_id


@router.post("/create")
def create_contact(
    request: CreateOfficeContactRequest,
    current_user: dict = Depends(get_current_user),
):
    if not can_manage_office_contacts(current_user):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    if not request.full_name.strip() or not request.phone.strip() or not request.profession.strip():
        raise HTTPException(status_code=400, detail="Ad, telefon ve meslek zorunludur")

    normalized_phone = _normalize_phone(request.phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Geçersiz telefon numarası")

    email = request.email.strip() if request.email and request.email.strip() else None
    if email and not re.match(r"^\S+@\S+\.\S+$", email):
        raise HTTPException(status_code=400, detail="Geçersiz e-posta adresi")

    office_id = _office_id(current_user)
    duplicate = (
        supabase.table("office_contacts")
        .select("id")
        .eq("office_id", office_id)
        .eq("phone", normalized_phone)
        .is_("deleted_at", "null")
        .execute()
        .data
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Bu telefon numarasıyla zaten bir usta var")

    contact = {
        "office_id": office_id,
        "full_name": request.full_name.strip(),
        "phone": normalized_phone,
        "email": email,
        "profession": request.profession.strip(),
        "created_by": current_user["id"],
        "created_at": _now(),
    }

    result = supabase.table("office_contacts").insert(contact).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Usta oluşturulamadı")

    return {"contact": result.data[0]}


@router.get("")
@router.get("/")
def list_contacts(current_user: dict = Depends(get_current_user)):
    office_id = _office_id(current_user)
    result = (
        supabase.table("office_contacts")
        .select("*")
        .eq("office_id", office_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"contacts": result.data or []}


@router.get("/{contact_id}")
def get_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user),
):
    office_id = _office_id(current_user)
    result = (
        supabase.table("office_contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("office_id", office_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Usta bulunamadı")
    return {"contact": result.data}


@router.patch("/{contact_id}")
def update_contact(
    contact_id: str,
    request: UpdateOfficeContactRequest,
    current_user: dict = Depends(get_current_user),
):
    if not can_manage_office_contacts(current_user):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    office_id = _office_id(current_user)
    contact = (
        supabase.table("office_contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("office_id", office_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
        .data
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Usta bulunamadı")

    update_data = {}
    if request.full_name is not None:
        if not request.full_name.strip():
            raise HTTPException(status_code=400, detail="Ad boş olamaz")
        update_data["full_name"] = request.full_name.strip()

    if request.phone is not None:
        normalized = _normalize_phone(request.phone)
        if not normalized:
            raise HTTPException(status_code=400, detail="Geçersiz telefon numarası")

        duplicate = (
            supabase.table("office_contacts")
            .select("id")
            .eq("office_id", office_id)
            .eq("phone", normalized)
            .neq("id", contact_id)
            .is_("deleted_at", "null")
            .execute()
            .data
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="Bu telefon numarasıyla zaten bir usta var")
        update_data["phone"] = normalized

    if request.profession is not None:
        if not request.profession.strip():
            raise HTTPException(status_code=400, detail="Meslek boş olamaz")
        update_data["profession"] = request.profession.strip()

    if request.email is not None:
        email = request.email.strip()
        if email:
            if not re.match(r"^\S+@\S+\.\S+$", email):
                raise HTTPException(status_code=400, detail="Geçersiz e-posta adresi")
            update_data["email"] = email
        else:
            update_data["email"] = None

    if not update_data:
        return {"contact": contact}

    update_data["updated_at"] = _now()
    result = (
        supabase.table("office_contacts")
        .update(update_data)
        .eq("id", contact_id)
        .eq("office_id", office_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Usta güncellenemedi")
    return {"contact": result.data[0]}


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user),
):
    if not can_manage_office_contacts(current_user):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    office_id = _office_id(current_user)
    contact = (
        supabase.table("office_contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("office_id", office_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
        .data
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Usta bulunamadı")

    result = (
        supabase.table("office_contacts")
        .update({
            "deleted_at": _now(),
            "deleted_by": current_user["id"],
            "updated_at": _now(),
        })
        .eq("id", contact_id)
        .eq("office_id", office_id)
        .execute()
    )
    return {"contact": result.data[0] if result.data else contact}
