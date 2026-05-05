from fastapi import APIRouter, Depends, HTTPException

from core.database import supabase
from core.security import get_current_user
from models.schemas import ResolveLoginIdentifierRequest

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/verify")
def verify_token(current_user: dict = Depends(get_current_user)):
    return {"valid": True, "user": {k: v for k, v in current_user.items() if k != 'password'}}


@router.post("/resolve-identifier")
def resolve_login_identifier(request: ResolveLoginIdentifierRequest):
    identifier = request.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Giris bilgisi bos olamaz")

    if "@" in identifier:
        return {"email": identifier.lower(), "resolved": False}

    normalized_phone = "".join(ch for ch in identifier if ch.isdigit())
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Gecersiz telefon veya e-posta")

    user = (
        supabase.table("users")
        .select("email")
        .eq("phone", normalized_phone)
        .maybe_single()
        .execute()
        .data
    )
    if not user or not user.get("email"):
        raise HTTPException(status_code=404, detail="Bu numara ile kayitli hesap bulunamadi")

    return {"email": user["email"].lower(), "resolved": True}
