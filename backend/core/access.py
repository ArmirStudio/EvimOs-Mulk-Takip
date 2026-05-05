from typing import Iterable

from fastapi import HTTPException

from core.database import supabase


def is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


def is_agent(user: dict) -> bool:
    return user.get("role") == "agent"


def is_employee(user: dict) -> bool:
    return user.get("role") == "employee"


def is_full_employee(user: dict) -> bool:
    return is_employee(user) and user.get("employee_access_level") == "full"


def is_limited_employee(user: dict) -> bool:
    return is_employee(user) and not is_full_employee(user)


def can_manage_office_records(user: dict) -> bool:
    return is_admin(user) or is_agent(user) or is_full_employee(user)


def get_office_owner_id(user: dict) -> str | None:
    if is_employee(user):
        return user.get("created_by") or user.get("id")
    return user.get("id")


def get_property_or_404(property_id: str) -> dict:
    result = supabase.table("properties").select("*").eq("id", property_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Mulk bulunamadi")
    return result.data


def get_receipt_or_404(receipt_id: str) -> dict:
    result = supabase.table("receipts").select("*").eq("id", receipt_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Makbuz bulunamadi")
    return result.data


def get_maintenance_or_404(request_id: str) -> dict:
    result = supabase.table("maintenance_requests").select("*").eq("id", request_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Bakim talebi bulunamadi")
    return result.data


def get_accessible_property_ids(user: dict) -> list[str]:
    if is_admin(user):
        properties = supabase.table("properties").select("id").execute().data or []
    elif is_agent(user):
        properties = (
            supabase.table("properties").select("id").eq("agent_id", user["id"]).execute().data or []
        )
    elif is_full_employee(user):
        properties = (
            supabase.table("properties")
            .select("id")
            .eq("agent_id", get_office_owner_id(user))
            .execute()
            .data
            or []
        )
    elif is_limited_employee(user):
        properties = (
            supabase.table("properties")
            .select("id")
            .eq("employee_id", user["id"])
            .execute()
            .data
            or []
        )
    elif user.get("role") == "landlord":
        properties = (
            supabase.table("properties")
            .select("id")
            .eq("landlord_id", user["id"])
            .execute()
            .data
            or []
        )
    elif user.get("role") == "tenant":
        properties = (
            supabase.table("properties")
            .select("id")
            .eq("tenant_id", user["id"])
            .execute()
            .data
            or []
        )
    else:
        properties = []

    return [item["id"] for item in properties if item.get("id")]


def get_maintenance_property_ids(user: dict) -> list[str]:
    if is_admin(user):
        return get_accessible_property_ids(user)
    if is_agent(user):
        return (
            supabase.table("properties").select("id").eq("agent_id", user["id"]).execute().data or []
        )
    if is_employee(user):
        return (
            supabase.table("properties").select("id").eq("employee_id", user["id"]).execute().data or []
        )
    if user.get("role") == "landlord":
        return (
            supabase.table("properties").select("id").eq("landlord_id", user["id"]).execute().data or []
        )
    if user.get("role") == "tenant":
        return (
            supabase.table("properties").select("id").eq("tenant_id", user["id"]).execute().data or []
        )
    return []


def _extract_ids(rows: Iterable[dict]) -> list[str]:
    return [item["id"] for item in rows if item.get("id")]


def get_maintenance_property_id_list(user: dict) -> list[str]:
    raw = get_maintenance_property_ids(user)
    if raw and isinstance(raw[0], dict):
        return _extract_ids(raw)
    return list(raw)


def get_receipt_property_id_list(user: dict) -> list[str]:
    return get_accessible_property_ids(user)


def assert_can_view_property(user: dict, property_doc: dict) -> None:
    if is_admin(user):
        return
    if is_agent(user) and property_doc.get("agent_id") == user.get("id"):
        return
    if is_full_employee(user) and property_doc.get("agent_id") == get_office_owner_id(user):
        return
    if is_limited_employee(user) and property_doc.get("employee_id") == user.get("id"):
        return
    if user.get("role") == "landlord" and property_doc.get("landlord_id") == user.get("id"):
        return
    if user.get("role") == "tenant" and property_doc.get("tenant_id") == user.get("id"):
        return
    raise HTTPException(status_code=403, detail="Erisim engellendi")


def assert_can_manage_property(user: dict, property_doc: dict) -> None:
    if is_admin(user):
        return
    if is_agent(user) and property_doc.get("agent_id") == user.get("id"):
        return
    if is_full_employee(user) and property_doc.get("agent_id") == get_office_owner_id(user):
        return
    raise HTTPException(status_code=403, detail="Bu mulk uzerinde islem yetkiniz yok")


def assert_can_view_maintenance(user: dict, property_doc: dict) -> None:
    if is_admin(user):
        return
    if is_agent(user) and property_doc.get("agent_id") == user.get("id"):
        return
    if is_employee(user) and property_doc.get("employee_id") == user.get("id"):
        return
    if user.get("role") == "landlord" and property_doc.get("landlord_id") == user.get("id"):
        return
    if user.get("role") == "tenant" and property_doc.get("tenant_id") == user.get("id"):
        return
    raise HTTPException(status_code=403, detail="Bakim talebine erisim yetkiniz yok")


def assert_can_manage_maintenance(user: dict, property_doc: dict) -> None:
    if is_admin(user):
        return
    assigned_employee_id = property_doc.get("employee_id")
    if assigned_employee_id:
        if is_employee(user) and user.get("id") == assigned_employee_id:
            return
        raise HTTPException(status_code=403, detail="Bu talep yalnizca atanan calisan tarafindan yonetilebilir")

    if is_agent(user) and property_doc.get("agent_id") == user.get("id"):
        return
    raise HTTPException(status_code=403, detail="Bu talep yalnizca emlakci tarafindan yonetilebilir")


def assert_can_tenant_review_maintenance(user: dict, property_doc: dict) -> None:
    if user.get("role") != "tenant" or property_doc.get("tenant_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="Yalnizca ilgili kiraci bu islemi yapabilir")


def assert_can_landlord_note_maintenance(user: dict, property_doc: dict) -> None:
    if user.get("role") == "landlord" and property_doc.get("landlord_id") == user.get("id"):
        return
    raise HTTPException(status_code=403, detail="Yalnizca ilgili ev sahibi bilgi notu birakabilir")


def assert_can_view_receipt(user: dict, property_doc: dict) -> None:
    assert_can_view_property(user, property_doc)


def assert_can_review_receipt(user: dict, property_doc: dict) -> None:
    if is_admin(user):
        return
    if user.get("role") == "landlord" and property_doc.get("landlord_id") == user.get("id"):
        return
    raise HTTPException(status_code=403, detail="Makbuz karari yalnizca ev sahibi tarafindan verilebilir")


def assert_can_upload_receipt(user: dict, property_doc: dict) -> None:
    if is_admin(user):
        return
    if user.get("role") == "tenant" and property_doc.get("tenant_id") == user.get("id"):
        return
    raise HTTPException(status_code=403, detail="Yalnizca ilgili kiraci makbuz yukleyebilir")


def assert_can_upload_document(user: dict, property_doc: dict) -> None:
    if is_admin(user):
        return
    if is_agent(user) and property_doc.get("agent_id") == user.get("id"):
        return
    if is_full_employee(user) and property_doc.get("agent_id") == get_office_owner_id(user):
        return
    raise HTTPException(status_code=403, detail="Belge yukleme yetkiniz yok")

