from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from core.database import supabase
from models.schemas import CreatePropertyRequest, AssignTenantRequest
from core.security import get_current_user
from core.access import (
    assert_can_manage_property,
    assert_can_view_property,
    can_manage_office_records,
    get_office_owner_id,
    get_property_or_404,
    get_receipt_property_id_list,
)

router = APIRouter(prefix="/properties", tags=["properties"])


def _require_property_manager(current_user: dict) -> str | None:
    if not can_manage_office_records(current_user):
        raise HTTPException(status_code=403, detail="Yalnizca agent, tam yetkili employee veya admin islem yapabilir")
    return get_office_owner_id(current_user)


def _validate_related_user(
    *,
    user_id: str,
    role: str,
    current_user: dict,
    office_owner_id: str | None,
    missing_detail: str,
    out_of_scope_detail: str,
):
    result = (
        supabase.table("users")
        .select("id, created_by, status")
        .eq("id", user_id)
        .eq("role", role)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=missing_detail)
    if result.data.get("status", "active") != "active":
        raise HTTPException(status_code=400, detail="Bu kullanici henuz onaylanmamis")

    if current_user.get("role") == "admin":
        return result.data

    created_by = result.data.get("created_by")
    if role == "employee":
        if created_by != office_owner_id:
            raise HTTPException(status_code=403, detail=out_of_scope_detail)
        return result.data

    if created_by not in (None, office_owner_id):
        raise HTTPException(status_code=403, detail=out_of_scope_detail)

    return result.data


def _build_property_payload(
    request: CreatePropertyRequest,
    *,
    current_user: dict,
    office_owner_id: str | None,
    agent_id: str | None,
    created_at: str | None = None,
):
    request_fields = getattr(request, "model_fields_set", None) or getattr(request, "__fields_set__", set())

    _validate_related_user(
        user_id=request.landlord_id,
        role="landlord",
        current_user=current_user,
        office_owner_id=office_owner_id,
        missing_detail="Ev sahibi bulunamadi",
        out_of_scope_detail="Bu ev sahibi sizin ofisinize ait degil",
    )

    tenant_id = request.tenant_id or None
    employee_id = request.employee_id or None

    if tenant_id:
        _validate_related_user(
            user_id=tenant_id,
            role="tenant",
            current_user=current_user,
            office_owner_id=office_owner_id,
            missing_detail="Kiraci bulunamadi",
            out_of_scope_detail="Bu kiraci sizin ofisinize ait degil",
        )

    if employee_id:
        _validate_related_user(
            user_id=employee_id,
            role="employee",
            current_user=current_user,
            office_owner_id=office_owner_id,
            missing_detail="Calisan bulunamadi",
            out_of_scope_detail="Bu calisan sizin ofisinize ait degil",
        )

    property_doc = {
        "description": request.description,
        "address": request.address,
        "city": request.city,
        "district": request.district,
        "property_type": request.property_type,
        "landlord_id": request.landlord_id,
        "agent_id": agent_id or office_owner_id,
        "status": request.status or ("occupied" if tenant_id else "vacant"),
        "tenant_id": tenant_id,
        "monthly_rent": request.monthly_rent,
        "updated_at": datetime.utcnow().isoformat(),
    }

    if created_at:
        property_doc["created_at"] = created_at

    optional_fields = {
        "dues_amount": request.dues_amount,
        "rent_day": request.rent_day,
        "dues_day": request.dues_day,
        "contract_start": request.contract_start,
        "contract_end": request.contract_end,
        "contract_duration": request.contract_duration,
        "employee_id": employee_id,
        "is_furnished": request.is_furnished,
        "amenities": request.amenities,
        "area": request.area,
        "heating": request.heating,
        "deposit_amount": request.deposit_amount,
        "deposit_currency": request.deposit_currency,
        "images": request.images,
    }
    for key, value in optional_fields.items():
        if value is not None or key in request_fields:
            property_doc[key] = value

    return property_doc

@router.post("/create")
def create_property(request: CreatePropertyRequest, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_property_manager(current_user)
    now = datetime.utcnow().isoformat()
    property_doc = _build_property_payload(
        request,
        current_user=current_user,
        office_owner_id=office_owner_id,
        agent_id=office_owner_id,
        created_at=now,
    )

    result = supabase.table('properties').insert(property_doc).execute()
    return {"success": True, "property_id": result.data[0]['id']}

@router.get("/list")
def list_properties(current_user: dict = Depends(get_current_user)):
    property_ids = get_receipt_property_id_list(current_user)
    if current_user["role"] != "admin" and not property_ids:
        return {"properties": []}

    query = supabase.table('properties').select('*')
    if current_user["role"] != "admin":
        query = query.in_('id', property_ids)

    properties = query.execute().data or []

    # Landlord ve tenant isimlerini cek
    landlord_ids = list(set([p.get('landlord_id') for p in properties if p.get('landlord_id')]))
    tenant_ids = list(set([p.get('tenant_id') for p in properties if p.get('tenant_id')]))
    all_user_ids = landlord_ids + tenant_ids

    users = {}
    if all_user_ids:
        user_list = supabase.table('users').select('id, full_name, email').in_('id', all_user_ids).execute().data
        users = {u['id']: u for u in user_list}

    for prop in properties:
        if prop.get('landlord_id'):
            landlord = users.get(prop['landlord_id'])
            prop['landlord_name'] = landlord['full_name'] if landlord else 'Unknown'
        if prop.get('tenant_id'):
            tenant = users.get(prop['tenant_id'])
            prop['tenant_name'] = tenant['full_name'] if tenant else 'Unknown'
            prop['tenant_email'] = tenant.get('email', 'Unknown') if tenant else 'Unknown'
        else:
            prop['tenant_name'] = None
            prop['tenant_email'] = None

    return {"properties": properties}

@router.get("/{property_id}")
def get_property(property_id: str, current_user: dict = Depends(get_current_user)):
    property_doc = get_property_or_404(property_id)
    assert_can_view_property(current_user, property_doc)

    if property_doc.get("landlord_id"):
        landlord = supabase.table('users').select('full_name').eq('id', property_doc['landlord_id']).single().execute()
        property_doc["landlord_name"] = landlord.data['full_name'] if landlord.data else "Unknown"
    if property_doc.get("tenant_id"):
        tenant = supabase.table('users').select('full_name, email').eq('id', property_doc['tenant_id']).single().execute()
        property_doc["tenant_name"] = tenant.data['full_name'] if tenant.data else "Unknown"
        property_doc["tenant_email"] = tenant.data.get('email', 'Unknown') if tenant.data else "Unknown"

    return property_doc


@router.put("/{property_id}")
def update_property(property_id: str, request: CreatePropertyRequest, current_user: dict = Depends(get_current_user)):
    property_doc = get_property_or_404(property_id)
    assert_can_manage_property(current_user, property_doc)
    office_owner_id = _require_property_manager(current_user)

    updates = _build_property_payload(
        request,
        current_user=current_user,
        office_owner_id=office_owner_id,
        agent_id=property_doc.get("agent_id") or office_owner_id,
    )

    result = (
        supabase.table("properties")
        .update(updates)
        .eq("id", property_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Mulk bulunamadi")

    return {"success": True, "property": result.data[0]}


@router.delete("/{property_id}")
def delete_property(property_id: str, current_user: dict = Depends(get_current_user)):
    property_doc = get_property_or_404(property_id)
    assert_can_manage_property(current_user, property_doc)
    _require_property_manager(current_user)

    related_cleanup = [
        ("calendar_events", "property_id"),
        ("receipts", "property_id"),
        ("maintenance_requests", "property_id"),
        ("notifications", "related_id"),
    ]
    for table, column in related_cleanup:
        supabase.table(table).delete().eq(column, property_id).execute()

    result = supabase.table("properties").delete().eq("id", property_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Mulk bulunamadi")

    return {"success": True}

@router.put("/assign-tenant")
def assign_tenant(request: AssignTenantRequest, current_user: dict = Depends(get_current_user)):
    property_doc = get_property_or_404(request.property_id)
    assert_can_manage_property(current_user, property_doc)

    if not can_manage_office_records(current_user):
        raise HTTPException(status_code=403, detail="Yalnizca agent kiraci atayabilir")

    tenant = (
        supabase.table('users')
        .select('id, status')
        .eq('id', request.tenant_id)
        .eq('role', 'tenant')
        .eq('status', 'active')
        .single()
        .execute()
    )
    if not tenant.data:
        raise HTTPException(status_code=404, detail="Kiraci bulunamadi")

    result = supabase.table('properties').update({
        'tenant_id': request.tenant_id,
        'status': 'occupied',
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', request.property_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Mulk bulunamadi")

    return {"success": True}
