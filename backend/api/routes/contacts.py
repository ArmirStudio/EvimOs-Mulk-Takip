from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from core.database import supabase
from core.security import get_current_user
from core.access import can_manage_office_records, get_office_owner_id
import re

router = APIRouter(prefix="/office-contacts", tags=["contacts"])


def _normalize_phone(phone: str) -> Optional[str]:
    """Normalize Turkish phone numbers to +90XXXXXXXXXX format."""
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


@router.post("/create")
def create_contact(
    full_name: str,
    phone: str,
    profession: str,
    email: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Create a new office contact."""
    if not can_manage_office_records(current_user):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    if not full_name.strip() or not phone.strip() or not profession.strip():
        raise HTTPException(status_code=400, detail="Ad, telefon ve meslek zorunludur")

    normalized_phone = _normalize_phone(phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Geçersiz telefon numarası")

    if email and email.strip():
        if not re.match(r"^\S+@\S+\.\S+$", email.strip()):
            raise HTTPException(status_code=400, detail="Geçersiz email adresi")

    office_id = get_office_owner_id(current_user)

    result = (
        supabase.table("office_contacts")
        .select("id")
        .eq("office_id", office_id)
        .eq("phone", normalized_phone)
        .is_("deleted_at", "null")
        .execute()
    )

    if result.data:
        raise HTTPException(status_code=400, detail="Bu telefon numarasıyla zaten bir usta var")

    contact = {
        "office_id": office_id,
        "full_name": full_name.strip(),
        "phone": normalized_phone,
        "email": email.strip() if email and email.strip() else None,
        "profession": profession.strip(),
        "created_at": datetime.utcnow().isoformat(),
    }

    result = supabase.table("office_contacts").insert(contact).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Usta oluşturulamadı")

    return {"contact": result.data[0]}


@router.get("/")
def list_contacts(current_user: dict = Depends(get_current_user)):
    """List all office contacts for current user's office."""
    office_id = get_office_owner_id(current_user)

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
    """Get a single office contact by ID."""
    office_id = get_office_owner_id(current_user)

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
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    profession: Optional[str] = None,
    email: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Update an office contact."""
    if not can_manage_office_records(current_user):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    office_id = get_office_owner_id(current_user)

    contact = (
        supabase.table("office_contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("office_id", office_id)
        .maybe_single()
        .execute()
        .data
    )

    if not contact:
        raise HTTPException(status_code=404, detail="Usta bulunamadı")

    update_data = {}

    if full_name is not None:
        if not full_name.strip():
            raise HTTPException(status_code=400, detail="Ad boş olamaz")
        update_data["full_name"] = full_name.strip()

    if phone is not None:
        normalized = _normalize_phone(phone)
        if not normalized:
            raise HTTPException(status_code=400, detail="Geçersiz telefon numarası")

        existing = (
            supabase.table("office_contacts")
            .select("id")
            .eq("office_id", office_id)
            .eq("phone", normalized)
            .neq("id", contact_id)
            .is_("deleted_at", "null")
            .execute()
        )

        if existing.data:
            raise HTTPException(status_code=400, detail="Bu telefon numarasıyla zaten bir usta var")

        update_data["phone"] = normalized

    if profession is not None:
        if not profession.strip():
            raise HTTPException(status_code=400, detail="Meslek boş olamaz")
        update_data["profession"] = profession.strip()

    if email is not None:
        if email.strip():
            if not re.match(r"^\S+@\S+\.\S+$", email.strip()):
                raise HTTPException(status_code=400, detail="Geçersiz email adresi")
            update_data["email"] = email.strip()
        else:
            update_data["email"] = None

    if not update_data:
        return {"contact": contact}

    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = (
        supabase.table("office_contacts")
        .update(update_data)
        .eq("id", contact_id)
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
    """Soft delete an office contact."""
    if not can_manage_office_records(current_user):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")

    office_id = get_office_owner_id(current_user)

    contact = (
        supabase.table("office_contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("office_id", office_id)
        .maybe_single()
        .execute()
        .data
    )

    if not contact:
        raise HTTPException(status_code=404, detail="Usta bulunamadı")

    result = (
        supabase.table("office_contacts")
        .update({"deleted_at": datetime.utcnow().isoformat()})
        .eq("id", contact_id)
        .execute()
    )

    return {"contact": result.data[0] if result.data else contact}
