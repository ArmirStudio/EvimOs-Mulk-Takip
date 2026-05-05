from fastapi import APIRouter

router = APIRouter(prefix="/professions", tags=["professions"])


@router.get("/")
def list_professions():
    """List all available professions."""
    from core.database import supabase

    result = (
        supabase.table("professions")
        .select("id, name")
        .order("name", desc=False)
        .execute()
    )

    return {"professions": result.data or []}
