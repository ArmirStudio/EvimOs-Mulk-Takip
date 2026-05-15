from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime
import re
import time
from core.database import supabase
from models.schemas import CreateUserRequest, LegalAcceptanceRequest, UpdateUserRequest
from core.security import get_current_user
from core.access import can_manage_office_records, get_office_owner_id, is_admin, is_full_employee

router = APIRouter(prefix="/users", tags=["users"])


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


def _get_user_or_404(user_id: str):
    result = supabase.table('users').select('*').eq('id', user_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi")
    return result.data


def _assert_can_view_user(current_user: dict, target_user: dict):
    if is_admin(current_user):
        return

    office_owner_id = get_office_owner_id(current_user)

    if current_user["id"] == target_user["id"]:
        return

    if current_user["role"] == "agent":
        if target_user.get("created_by") == current_user["id"]:
            return
        raise HTTPException(status_code=403, detail="Bu kullaniciyi goruntuleyemezsiniz")

    if current_user["role"] == "employee":
        if not is_full_employee(current_user):
            raise HTTPException(status_code=403, detail="Sinirli calisan rehber erisimine sahip degil")
        if target_user["id"] == office_owner_id or target_user.get("created_by") == office_owner_id:
            return
        raise HTTPException(status_code=403, detail="Bu kullaniciyi goruntuleyemezsiniz")

    raise HTTPException(status_code=403, detail="Yetkiniz yok")


def _assert_can_delete_user(current_user: dict, target_user: dict):
    if is_admin(current_user):
        return

    if current_user["role"] != "agent":
        raise HTTPException(status_code=403, detail="Sadece agent veya admin silme islemi yapabilir")

    if target_user.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Bu kullanici ofisinize ait degil")

    if target_user.get("role") not in ["tenant", "landlord", "employee"]:
        raise HTTPException(status_code=400, detail="Bu rol silinemez")


def _assert_can_update_user(current_user: dict, target_user: dict):
    if is_admin(current_user):
        return

    if target_user.get("role") != "employee":
        raise HTTPException(status_code=400, detail="Bu ekrandan yalnizca calisan duzenlenebilir")

    if current_user["role"] == "agent":
        if target_user.get("created_by") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Bu kullanici ofisinize ait degil")
        return

    if current_user["role"] == "employee" and is_full_employee(current_user):
        office_owner_id = get_office_owner_id(current_user)
        if target_user.get("created_by") != office_owner_id:
            raise HTTPException(status_code=403, detail="Bu kullanici ofisinize ait degil")
        return

    raise HTTPException(status_code=403, detail="Sadece manager veya admin duzenleme islemi yapabilir")


def _requested_update_fields(request: UpdateUserRequest):
    return {
        field_name
        for field_name in [
            "full_name",
            "phone",
            "city",
            "district",
            "employee_access_level",
            "preferred_currency",
            "preferred_theme",
        ]
        if getattr(request, field_name) is not None
    }


def _assert_can_patch_user(current_user: dict, target_user: dict, requested_fields: set[str]):
    if is_admin(current_user):
        return

    if current_user["id"] == target_user["id"]:
        if requested_fields and requested_fields.issubset({"preferred_currency", "preferred_theme"}):
            return
        raise HTTPException(status_code=403, detail="Kendi hesabinizda yalnizca tercih alanlarini guncelleyebilirsiniz")

    _assert_can_update_user(current_user, target_user)


def _delete_auth_user_if_present(auth_id: str | None) -> None:
    if not auth_id:
        return

    try:
        supabase.auth.admin.delete_user(auth_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Auth kullanicisi silinemedi") from exc


@router.post("/create")
def create_user(request: CreateUserRequest, current_user: dict = Depends(get_current_user)):
    office_owner_id = get_office_owner_id(current_user)

    if request.phone:
        request.phone = _normalize_phone(request.phone) or request.phone

    # Yetki kontrolu
    if request.role == "agent" and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yalnizca admin agent olusturabilir")
    if request.role in ["landlord", "tenant"] and not can_manage_office_records(current_user):
        raise HTTPException(status_code=403, detail="Yalnizca admin veya agent kullanici olusturabilir")
    if request.role == "employee" and current_user["role"] not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Yalnizca admin veya agent calisan olusturabilir")

    if request.role == "tenant" and request.property_id:
        prop = supabase.table('properties').select('id').eq('id', request.property_id).single().execute()
        if not prop.data:
            raise HTTPException(status_code=404, detail="Mulk bulunamadi")

    # Supabase Auth'a ekle (trigger public.users'a yazar)
    if request.password:
        auth_response = supabase.auth.admin.create_user({
            'email': request.email,
            'password': request.password,
            'email_confirm': True,
            'user_metadata': {
                'role': request.role,
                'full_name': request.full_name,
                'phone': request.phone or '',
                'city': request.city or '',
                'district': request.district or '',
                'employee_access_level': request.employee_access_level or '',
            }
        })
    else:
        auth_response = supabase.auth.admin.invite_user_by_email(
            request.email,
            options={
                'data': {
                    'role': request.role,
                    'full_name': request.full_name,
                    'phone': request.phone or '',
                    'city': request.city or '',
                    'district': request.district or '',
                    'employee_access_level': request.employee_access_level or '',
                },
                'redirect_to': 'emlak://auth/callback'
            }
        )

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Kullanici olusturulamadi")

    # Trigger public.users'a async yazabilir; 3 deneme yap
    auth_id = str(auth_response.user.id)
    profile_data = None
    for attempt in range(3):
        result = supabase.table('users').select('*').eq('auth_id', auth_id).maybe_single().execute()
        if result.data:
            profile_data = result.data
            break
        time.sleep(0.5)

    if not profile_data:
        # Trigger çalışmadıysa doğrudan ekle
        insert_result = supabase.table('users').insert({
            'auth_id': auth_id,
            'email': request.email,
            'full_name': request.full_name,
            'role': request.role,
            'status': 'active',
            'phone': request.phone,
            'city': request.city,
            'district': request.district,
            'employee_access_level': request.employee_access_level if request.role == "employee" else None,
            'created_by': office_owner_id,
        }).execute()
        if not insert_result.data:
            raise HTTPException(status_code=500, detail="Profil olusturulamadi")
        profile_data = insert_result.data[0]
    else:
        supabase.table('users').update({
            'created_by': office_owner_id,
            'phone': request.phone,
            'city': request.city,
            'district': request.district,
            'employee_access_level': request.employee_access_level if request.role == "employee" else None,
        }).eq('id', profile_data['id']).execute()

    user_id = profile_data['id']

    # Tenant ise mulke ata
    if request.role == "tenant" and request.property_id:
        supabase.table('properties').update({
            'tenant_id': user_id,
            'status': 'occupied',
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', request.property_id).execute()

    return {"success": True, "user_id": user_id, "message": "Kullanici basariyla olusturuldu"}

@router.get("/list")
def list_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "agent", "employee"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    if current_user["role"] == "employee" and not is_full_employee(current_user):
        raise HTTPException(status_code=403, detail="Sinirli calisan rehber erisimine sahip degil")

    query = supabase.table('users').select(
        'id, email, full_name, role, status, phone, city, district, employee_access_level, active, created_at, '
        'invited_via_invite_id, invites:invited_via_invite_id(id, contact_label)'
    )

    if current_user["role"] == "agent":
        query = query.eq('created_by', current_user['id'])
    elif current_user["role"] == "employee":
        query = query.eq('created_by', get_office_owner_id(current_user))

    if role:
        query = query.eq('role', role)

    query = query.eq('status', 'active')

    result = query.execute()
    users = result.data or []

    if current_user["role"] not in ["admin", "agent"]:
        for user in users:
            user.pop("invites", None)

    return {"users": users}


@router.patch("/me/legal-acceptance")
def accept_legal_terms(
    request: LegalAcceptanceRequest,
    current_user: dict = Depends(get_current_user),
):
    if not request.accepted:
        raise HTTPException(status_code=400, detail="Kullanim sartlari kabul edilmelidir")

    now = datetime.utcnow().isoformat()
    result = (
        supabase.table("users")
        .update({
            "terms_accepted_at": now,
            "updated_at": now,
        })
        .eq("id", current_user["id"])
        .execute()
    )
    user = result.data[0] if result.data else _get_user_or_404(current_user["id"])
    return {"success": True, "user": user}


@router.patch("/me/complete-onboarding")
def complete_agent_onboarding(
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "agent":
        raise HTTPException(status_code=403, detail="Yalnızca agent hesapları için geçerlidir")

    now = datetime.utcnow().isoformat()
    result = (
        supabase.table("users")
        .update({
            "onboarded_at": now,
            "first_login": False,
            "updated_at": now,
        })
        .eq("id", current_user["id"])
        .execute()
    )
    user = result.data[0] if result.data else _get_user_or_404(current_user["id"])
    return {"success": True, "user": user}


@router.delete("/me")
def delete_own_account(current_user: dict = Depends(get_current_user)):
    """
    Kullanıcının kendi hesabını silmesi. KVKK: PII anında anonim hale getirilir,
    finansal kayıtlar TTK gereği korunur, auth hesabı kalıcı ban alır.
    """
    if current_user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Admin hesabı bu yolla silinemez")

    user_id = current_user["id"]
    auth_id = current_user.get("auth_id")
    now = datetime.utcnow().isoformat()

    # Benzersiz placeholder — email UNIQUE constraint'i korur
    anonymized_email = f"deleted_{user_id}@deleted.evimos.app"

    supabase.table("users").update({
        "full_name": "Silinmiş Hesap",
        "phone": None,
        "push_token": None,
        "avatar_url": None,
        "email": anonymized_email,
        "active": False,
        "updated_at": now,
    }).eq("id", user_id).execute()

    # Giriş engeli: ban ile auth kullanıcısını devre dışı bırak
    # (FK RESTRICT nedeniyle silme yerine ban tercih edilir; finansal kayıtlar korunur)
    if auth_id:
        try:
            supabase.auth.admin.update_user_by_id(auth_id, {"ban_duration": "876600h"})
        except Exception:
            pass

    return {"success": True}


@router.get("/{user_id}")
def get_user_detail(user_id: str, current_user: dict = Depends(get_current_user)):
    target_user = _get_user_or_404(user_id)
    _assert_can_view_user(current_user, target_user)

    properties = []
    if target_user["role"] == "landlord":
        properties = (
            supabase.table('properties')
            .select('id, description, address, city, district, status, monthly_rent')
            .eq('landlord_id', user_id)
            .order('created_at', desc=True)
            .execute()
            .data
            or []
        )
    elif target_user["role"] == "tenant":
        properties = (
            supabase.table('properties')
            .select('id, description, address, city, district, status, monthly_rent')
            .eq('tenant_id', user_id)
            .order('created_at', desc=True)
            .execute()
            .data
            or []
        )

    return {
        "user": target_user,
        "properties": properties,
    }


@router.patch("/{user_id}")
def update_user(user_id: str, request: UpdateUserRequest, current_user: dict = Depends(get_current_user)):
    target_user = _get_user_or_404(user_id)
    requested_fields = _requested_update_fields(request)
    _assert_can_patch_user(current_user, target_user, requested_fields)

    updates: dict = {}
    if request.full_name is not None:
        full_name = request.full_name.strip()
        if not full_name:
            raise HTTPException(status_code=400, detail="Ad soyad bos olamaz")
        updates["full_name"] = full_name
    if request.phone is not None:
        normalized = _normalize_phone(request.phone)
        updates["phone"] = normalized if normalized else (request.phone.strip() or None)
    if request.city is not None:
        updates["city"] = request.city.strip() or None
    if request.district is not None:
        updates["district"] = request.district.strip() or None
    if request.employee_access_level is not None:
        if target_user.get("role") != "employee":
            raise HTTPException(status_code=400, detail="Calisan yetkisi yalnizca employee icin guncellenebilir")
        updates["employee_access_level"] = request.employee_access_level
    if request.preferred_currency is not None:
        updates["preferred_currency"] = request.preferred_currency
    if request.preferred_theme is not None:
        updates["preferred_theme"] = request.preferred_theme

    if not updates:
        raise HTTPException(status_code=400, detail="Guncellenecek alan bulunamadi")

    updates["updated_at"] = datetime.utcnow().isoformat()

    supabase.table("users").update(updates).eq("id", user_id).execute()
    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Kullanici guncellenemedi")

    auth_id = target_user.get("auth_id")
    if auth_id:
        metadata_updates = {
            "full_name": result.data.get("full_name") or "",
            "phone": result.data.get("phone") or "",
            "city": result.data.get("city") or "",
            "district": result.data.get("district") or "",
        }
        if result.data.get("role") == "employee":
            metadata_updates["employee_access_level"] = result.data.get("employee_access_level") or ""
        try:
            supabase.auth.admin.update_user_by_id(auth_id, {"user_metadata": metadata_updates})
        except Exception:
            pass

    return {"success": True, "user": result.data}


@router.delete("/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    target_user = _get_user_or_404(user_id)
    _assert_can_delete_user(current_user, target_user)

    now = datetime.utcnow().isoformat()
    if target_user["role"] == "tenant":
        supabase.table('properties').update({
            'tenant_id': None,
            'status': 'vacant',
            'updated_at': now,
        }).eq('tenant_id', user_id).execute()
    elif target_user["role"] == "landlord":
        supabase.table('properties').update({
            'landlord_id': None,
            'updated_at': now,
        }).eq('landlord_id', user_id).execute()
    elif target_user["role"] == "employee":
        supabase.table('properties').update({
            'employee_id': None,
            'updated_at': now,
        }).eq('employee_id', user_id).execute()

    _delete_auth_user_if_present(target_user.get("auth_id"))
    supabase.table('users').delete().eq('id', user_id).execute()
    return {"success": True}
