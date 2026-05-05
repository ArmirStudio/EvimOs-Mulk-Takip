from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from core.access import get_office_owner_id, get_property_or_404, is_full_employee
from core.database import supabase
from core.notifications import notify_user, notify_users
from core.security import get_current_user
from models.schemas import (
    CreateAnnouncementRequest,
    CreateTeamMessageRequest,
    CreateTeamTaskRequest,
    TeamTaskTransitionRequest,
    UpdateTeamTaskRequest,
)

router = APIRouter(prefix="/team", tags=["team"])
logger = logging.getLogger(__name__)

TASK_TYPE_PROPERTY_SHOWING = "property_showing"
TASK_STATUS_PENDING = "pending"
TASK_STATUS_IN_PROGRESS = "in_progress"
TASK_STATUS_COMPLETED = "completed"
TASK_STATUS_CANCELLED = "cancelled"
MAINT_STATUS_PENDING = "pending"
MAINT_STATUS_IN_PROGRESS = "in_progress"
MAINT_STATUS_COMPLETED = "completed"
MAINT_STATUS_REJECTED = "rejected"

REPORT_RANGE_LABELS = {
    "this_week": "Bu Hafta",
    "last_week": "Gecen Hafta",
    "this_month": "Bu Ay",
    "last_month": "Gecen Ay",
}

TASK_TYPE_SHORT_LABELS = {
    TASK_TYPE_PROPERTY_SHOWING: "Ev",
    "office_meeting": "Ofis",
    "client_meeting": "Musteri",
    "document_delivery": "Evrak",
    "site_visit": "Saha",
}


def _now() -> str:
    return datetime.utcnow().isoformat()


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_iso_date(value: str, field_name: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{field_name} gecersiz tarih formatinda") from exc


def _parse_report_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _start_of_week(value: datetime) -> datetime:
    day_start = value.replace(hour=0, minute=0, second=0, microsecond=0)
    return day_start - timedelta(days=day_start.weekday())


def _start_of_month(value: datetime) -> datetime:
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _shift_month_start(value: datetime, month_delta: int) -> datetime:
    month_index = (value.year * 12 + value.month - 1) + month_delta
    year = month_index // 12
    month = (month_index % 12) + 1
    return value.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)


def _get_report_window(range_key: str) -> dict:
    now = _utc_now_naive()
    current_week_start = _start_of_week(now)
    current_month_start = _start_of_month(now)

    if range_key == "this_week":
        start = current_week_start
        end = start + timedelta(days=7)
        previous_start = start - timedelta(days=7)
        previous_end = start
    elif range_key == "last_week":
        end = current_week_start
        start = end - timedelta(days=7)
        previous_end = start
        previous_start = start - timedelta(days=7)
    elif range_key == "this_month":
        start = current_month_start
        end = _shift_month_start(start, 1)
        previous_start = _shift_month_start(start, -1)
        previous_end = start
    elif range_key == "last_month":
        end = current_month_start
        start = _shift_month_start(end, -1)
        previous_end = start
        previous_start = _shift_month_start(start, -1)
    else:
        raise HTTPException(status_code=400, detail="Gecersiz rapor araligi")

    return {
        "range": range_key,
        "label": REPORT_RANGE_LABELS[range_key],
        "start": start,
        "end": end,
        "previous_start": previous_start,
        "previous_end": previous_end,
        "now": now,
    }


def _in_window(value: Optional[datetime], start: datetime, end: datetime) -> bool:
    return value is not None and start <= value < end


def _format_delta(current: int, previous: int, unit: str = "") -> str:
    delta = current - previous
    if delta == 0:
        return "stabil"
    return f"{delta:+d}{unit}"


def _to_percent(part: int, whole: int) -> int:
    if whole <= 0:
        return 0
    return round((part / whole) * 100)


def _short_member_label(user_map: dict[str, dict], user_id: Optional[str]) -> str:
    if not user_id:
        return "Atama"

    full_name = (user_map.get(user_id) or {}).get("full_name") or "Calisan"
    token = full_name.strip().split()[0] if full_name.strip() else "Calisan"
    return token[:10]


def _is_manager(user: dict) -> bool:
    return user.get("role") == "agent" or is_full_employee(user)


def _require_office_user(current_user: dict) -> str:
    if current_user.get("role") not in ["agent", "employee"]:
        raise HTTPException(status_code=403, detail="Bu alan yalnizca ofis kullanicilarina aciktir")

    office_owner_id = get_office_owner_id(current_user)
    if not office_owner_id:
        raise HTTPException(status_code=400, detail="Ofis bilgisi bulunamadi")

    return office_owner_id


def _require_manager(current_user: dict) -> str:
    office_owner_id = _require_office_user(current_user)
    if not _is_manager(current_user):
        raise HTTPException(status_code=403, detail="Bu islem yalnizca agent veya tam yetkili employee icin aciktir")
    return office_owner_id


def _get_office_owner(office_owner_id: str) -> dict:
    result = supabase.table("users").select(
        "id, full_name, email, phone, role, employee_access_level, created_at, avatar_url, city, district"
    ).eq("id", office_owner_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Ofis sahibi bulunamadi")
    return result.data


def _get_employee_members(office_owner_id: str) -> list[dict]:
    return (
        supabase.table("users")
        .select("id, full_name, email, phone, role, employee_access_level, created_at, avatar_url, city, district")
        .eq("created_by", office_owner_id)
        .eq("role", "employee")
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )


def _get_office_members(office_owner_id: str) -> list[dict]:
    owner = _get_office_owner(office_owner_id)
    owner["member_type"] = "owner"
    owner["is_manager"] = True

    employees = _get_employee_members(office_owner_id)
    for employee in employees:
        employee["member_type"] = "employee"
        employee["is_manager"] = employee.get("employee_access_level") == "full"

    return [owner, *employees]


def _assert_member_in_office(member_doc: dict, office_owner_id: str) -> None:
    if member_doc.get("id") == office_owner_id:
        return
    if member_doc.get("role") == "employee" and member_doc.get("created_by") == office_owner_id:
        return
    raise HTTPException(status_code=404, detail="Ofis uyesi bulunamadi")


def _get_member_or_404(member_id: str) -> dict:
    result = supabase.table("users").select("*").eq("id", member_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi")
    return result.data


def _get_team_task_or_404(task_id: str) -> dict:
    result = supabase.table("team_tasks").select("*").eq("id", task_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Gorev bulunamadi")
    return result.data


def _get_announcement_or_404(announcement_id: str) -> dict:
    result = supabase.table("announcements").select("*").eq("id", announcement_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Duyuru bulunamadi")
    return result.data


def _validate_assignee(assignee_id: str, office_owner_id: str) -> dict:
    assignee = _get_member_or_404(assignee_id)
    if assignee.get("role") != "employee" or assignee.get("created_by") != office_owner_id:
        raise HTTPException(status_code=400, detail="Gorev yalnizca ayni ofisteki employee kullaniciya atanabilir")
    return assignee


def _validate_task_payload(
    payload: CreateTeamTaskRequest | UpdateTeamTaskRequest,
    office_owner_id: str,
    *,
    existing_task: Optional[dict] = None,
) -> dict:
    task_type = payload.task_type if payload.task_type is not None else existing_task.get("task_type") if existing_task else None
    title = payload.title.strip() if payload.title is not None else existing_task.get("title") if existing_task else None
    scheduled_at = payload.scheduled_at if payload.scheduled_at is not None else existing_task.get("scheduled_at") if existing_task else None
    assignee_id = payload.assignee_id if payload.assignee_id is not None else existing_task.get("assignee_id") if existing_task else None
    property_id = payload.property_id if payload.property_id is not None else existing_task.get("property_id") if existing_task else None
    customer_name = (
        payload.customer_name.strip()
        if payload.customer_name is not None and payload.customer_name
        else existing_task.get("customer_name") if existing_task else None
    )
    customer_phone = (
        payload.customer_phone.strip()
        if payload.customer_phone is not None and payload.customer_phone
        else existing_task.get("customer_phone") if existing_task else None
    )
    description = (
        payload.description.strip()
        if payload.description is not None and payload.description
        else existing_task.get("description") if existing_task else None
    )

    if not title:
        raise HTTPException(status_code=400, detail="Gorev basligi zorunludur")
    if not task_type:
        raise HTTPException(status_code=400, detail="Gorev tipi zorunludur")
    if not assignee_id:
        raise HTTPException(status_code=400, detail="Atanan kisi zorunludur")
    if not scheduled_at:
        raise HTTPException(status_code=400, detail="Tarih ve saat zorunludur")

    _parse_iso_date(scheduled_at, "scheduled_at")
    _validate_assignee(assignee_id, office_owner_id)

    if task_type == TASK_TYPE_PROPERTY_SHOWING:
        if not property_id:
            raise HTTPException(status_code=400, detail="Ev gosterimi icin mulk secilmelidir")
        if not customer_name:
            raise HTTPException(status_code=400, detail="Ev gosterimi icin musteri adi zorunludur")
        if not customer_phone:
            raise HTTPException(status_code=400, detail="Ev gosterimi icin musteri telefonu zorunludur")
        property_doc = get_property_or_404(property_id)
        if property_doc.get("agent_id") != office_owner_id:
            raise HTTPException(status_code=403, detail="Secilen mulk ofisinize ait degil")
    elif property_id:
        property_doc = get_property_or_404(property_id)
        if property_doc.get("agent_id") != office_owner_id:
            raise HTTPException(status_code=403, detail="Secilen mulk ofisinize ait degil")

    return {
        "task_type": task_type,
        "title": title,
        "description": description,
        "property_id": property_id,
        "customer_name": customer_name if task_type == TASK_TYPE_PROPERTY_SHOWING else None,
        "customer_phone": customer_phone if task_type == TASK_TYPE_PROPERTY_SHOWING else None,
        "assignee_id": assignee_id,
        "scheduled_at": scheduled_at,
        "repeat_enabled": bool(payload.repeat_enabled if payload.repeat_enabled is not None else existing_task.get("repeat_enabled") if existing_task else False),
    }


def _serialize_member(member: dict) -> dict:
    return {
        "id": member.get("id"),
        "full_name": member.get("full_name"),
        "email": member.get("email"),
        "phone": member.get("phone"),
        "role": member.get("role"),
        "employee_access_level": member.get("employee_access_level"),
        "created_at": member.get("created_at"),
        "avatar_url": member.get("avatar_url"),
        "city": member.get("city"),
        "district": member.get("district"),
        "member_type": member.get("member_type"),
        "is_manager": member.get("is_manager", False),
    }


def _fetch_user_map(user_ids: list[str]) -> dict[str, dict]:
    normalized_ids = [item for item in set(user_ids) if item]
    if not normalized_ids:
        return {}

    users = (
        supabase.table("users")
        .select("id, full_name, email, phone, role, employee_access_level, avatar_url")
        .in_("id", normalized_ids)
        .execute()
        .data
        or []
    )
    return {user["id"]: user for user in users if user.get("id")}


def _fetch_property_map(property_ids: list[str]) -> dict[str, dict]:
    normalized_ids = [item for item in set(property_ids) if item]
    if not normalized_ids:
        return {}

    properties = (
        supabase.table("properties")
        .select("id, address, city, district")
        .in_("id", normalized_ids)
        .execute()
        .data
        or []
    )
    return {property_doc["id"]: property_doc for property_doc in properties if property_doc.get("id")}


def _serialize_task(task: dict, user_map: dict[str, dict], property_map: dict[str, dict]) -> dict:
    assignee = user_map.get(task.get("assignee_id"))
    creator = user_map.get(task.get("created_by"))
    property_doc = property_map.get(task.get("property_id"))
    scheduled_at = task.get("scheduled_at")
    scheduled_date = None
    if scheduled_at:
        try:
            scheduled_date = _parse_iso_date(scheduled_at, "scheduled_at")
        except HTTPException:
            scheduled_date = None

    current_moment = datetime.now(scheduled_date.tzinfo) if scheduled_date and scheduled_date.tzinfo else datetime.utcnow()
    is_overdue = bool(
        scheduled_date is not None
        and scheduled_date < current_moment
        and task.get("status") in [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS]
    )

    return {
        **task,
        "assignee": assignee,
        "assignee_name": assignee.get("full_name") if assignee else None,
        "creator": creator,
        "creator_name": creator.get("full_name") if creator else None,
        "property": property_doc,
        "property_label": ", ".join(
            [item for item in [property_doc.get("address") if property_doc else None, property_doc.get("district") if property_doc else None, property_doc.get("city") if property_doc else None] if item]
        ) if property_doc else None,
        "is_overdue": bool(is_overdue),
    }


def _serialize_announcement(
    announcement: dict,
    recipient_rows: list[dict],
    user_map: dict[str, dict],
    *,
    current_user_id: Optional[str] = None,
) -> dict:
    recipients = []
    read_count = 0
    unread_count = 0
    viewer_recipient = None

    for recipient in recipient_rows:
        recipient_user = user_map.get(recipient.get("user_id"))
        recipients.append({
            **recipient,
            "user": recipient_user,
        })
        if recipient.get("read_at"):
            read_count += 1
        else:
            unread_count += 1
        if current_user_id and recipient.get("user_id") == current_user_id:
            viewer_recipient = recipient

    creator = user_map.get(announcement.get("created_by"))

    return {
        **announcement,
        "creator": creator,
        "creator_name": creator.get("full_name") if creator else None,
        "recipients": recipients,
        "recipient_count": len(recipient_rows),
        "read_count": read_count,
        "unread_count": unread_count,
        "viewer_read_at": viewer_recipient.get("read_at") if viewer_recipient else None,
        "viewer_is_read": bool(viewer_recipient.get("read_at")) if viewer_recipient else False,
    }


def _serialize_message(message: dict, user_map: dict[str, dict]) -> dict:
    sender = user_map.get(message.get("sender_id"))
    return {
        **message,
        "sender": sender,
        "sender_name": sender.get("full_name") if sender else None,
    }


def _assert_can_view_task(current_user: dict, task: dict, office_owner_id: str) -> None:
    if task.get("office_owner_id") != office_owner_id:
        raise HTTPException(status_code=404, detail="Gorev bulunamadi")
    if _is_manager(current_user):
        return
    if current_user.get("id") != task.get("assignee_id"):
        raise HTTPException(status_code=403, detail="Bu gorevi goruntuleme yetkiniz yok")


def _assert_can_transition_task(current_user: dict, task: dict, action: str) -> None:
    is_assignee = current_user.get("id") == task.get("assignee_id")
    is_manager = _is_manager(current_user)

    if action == "start":
        if not (is_assignee or is_manager):
            raise HTTPException(status_code=403, detail="Bu gorevi baslatma yetkiniz yok")
        return

    if action == "complete":
        if not is_assignee:
            raise HTTPException(status_code=403, detail="Gorevi yalnizca atanan employee tamamlayabilir")
        return

    if action == "cancel":
        if not is_manager:
            raise HTTPException(status_code=403, detail="Gorevi yalnizca manager iptal edebilir")
        return

    raise HTTPException(status_code=400, detail="Gecersiz islem")


def _notify_task_completion(task: dict, assignee: dict, office_owner_id: str) -> None:
    recipients = {
        task.get("created_by"),
        office_owner_id,
    }
    notify_users(
        recipients,
        "task",
        "Gorev Tamamlandi",
        f"{assignee.get('full_name') or 'Atanan calisan'} {task.get('title')} gorevini tamamlandi olarak isaretledi.",
        task["id"],
    )


def _get_announcement_recipient_rows(announcement_ids: list[str]) -> dict[str, list[dict]]:
    normalized_ids = [item for item in set(announcement_ids) if item]
    if not normalized_ids:
        return {}

    rows = (
        supabase.table("announcement_recipients")
        .select("*")
        .in_("announcement_id", normalized_ids)
        .execute()
        .data
        or []
    )

    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row.get("announcement_id")].append(row)
    return grouped


@router.get("/report")
def get_team_report(
    range_key: str = Query("this_week", alias="range"),
    current_user: dict = Depends(get_current_user),
):
    office_owner_id = _require_manager(current_user)
    window = _get_report_window(range_key)
    start = window["start"]
    end = window["end"]
    previous_start = window["previous_start"]
    previous_end = window["previous_end"]
    now = window["now"]

    try:
        tasks = (
            supabase.table("team_tasks")
            .select("id, assignee_id, task_type, status, scheduled_at, completed_at")
            .eq("office_owner_id", office_owner_id)
            .execute()
            .data
            or []
        )
        announcements = (
            supabase.table("announcements")
            .select("id, created_at")
            .eq("office_owner_id", office_owner_id)
            .execute()
            .data
            or []
        )
        properties = (
            supabase.table("properties")
            .select("id")
            .eq("agent_id", office_owner_id)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.exception("Team report base query failed for office %s", office_owner_id)
        raise HTTPException(status_code=500, detail="Rapor verisi yuklenemedi") from exc

    announcement_ids = [item.get("id") for item in announcements if item.get("id")]
    property_ids = [item.get("id") for item in properties if item.get("id")]

    try:
        recipient_rows = (
            supabase.table("announcement_recipients")
            .select("announcement_id, user_id, read_at, reminded_at, reminder_count")
            .in_("announcement_id", announcement_ids)
            .execute()
            .data
            or []
        ) if announcement_ids else []
        maintenance_requests = (
            supabase.table("maintenance_requests")
            .select("id, status, created_at, updated_at")
            .in_("property_id", property_ids)
            .execute()
            .data
            or []
        ) if property_ids else []
    except Exception as exc:
        logger.exception("Team report related query failed for office %s", office_owner_id)
        raise HTTPException(status_code=500, detail="Rapor verisi yuklenemedi") from exc

    user_map = _fetch_user_map([task.get("assignee_id") for task in tasks])

    completed_current = [
        task for task in tasks
        if task.get("status") == TASK_STATUS_COMPLETED
        and _in_window(_parse_report_datetime(task.get("completed_at")), start, end)
    ]
    completed_previous = [
        task for task in tasks
        if task.get("status") == TASK_STATUS_COMPLETED
        and _in_window(_parse_report_datetime(task.get("completed_at")), previous_start, previous_end)
    ]
    scheduled_current = [
        task for task in tasks
        if _in_window(_parse_report_datetime(task.get("scheduled_at")), start, end)
    ]
    scheduled_previous = [
        task for task in tasks
        if _in_window(_parse_report_datetime(task.get("scheduled_at")), previous_start, previous_end)
    ]
    overdue_current = sum(
        1
        for task in scheduled_current
        if task.get("status") in [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS]
        and (_parse_report_datetime(task.get("scheduled_at")) or now) < now
    )
    overdue_previous = sum(
        1
        for task in scheduled_previous
        if task.get("status") in [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS]
    )
    active_assignees_current = len({task.get("assignee_id") for task in completed_current if task.get("assignee_id")})
    active_assignees_previous = len({task.get("assignee_id") for task in completed_previous if task.get("assignee_id")})
    showing_completed_current = sum(1 for task in completed_current if task.get("task_type") == TASK_TYPE_PROPERTY_SHOWING)
    showing_completed_previous = sum(1 for task in completed_previous if task.get("task_type") == TASK_TYPE_PROPERTY_SHOWING)

    assignee_totals: dict[str, int] = defaultdict(int)
    for task in completed_current:
        assignee_id = task.get("assignee_id")
        if assignee_id:
            assignee_totals[assignee_id] += 1

    team_bars = [
        {
            "label": _short_member_label(user_map, assignee_id),
            "value": count,
            "tone": "success" if index == 0 else "primary",
        }
        for index, (assignee_id, count) in enumerate(
            sorted(
                assignee_totals.items(),
                key=lambda item: (-item[1], _short_member_label(user_map, item[0])),
            )[:6]
        )
    ]
    if not team_bars:
        team_bars = [{"label": "Veri", "value": 0, "tone": "neutral"}]

    task_type_counts = {task_type: 0 for task_type in TASK_TYPE_SHORT_LABELS}
    for task in scheduled_current:
        task_type = task.get("task_type")
        if task_type in task_type_counts:
            task_type_counts[task_type] += 1

    task_type_bars = [
        {
            "label": short_label,
            "value": task_type_counts[task_type],
            "tone": "primary" if task_type_counts[task_type] > 0 else "neutral",
        }
        for task_type, short_label in TASK_TYPE_SHORT_LABELS.items()
    ]

    current_announcement_ids = {
        item.get("id")
        for item in announcements
        if _in_window(_parse_report_datetime(item.get("created_at")), start, end) and item.get("id")
    }
    previous_announcement_ids = {
        item.get("id")
        for item in announcements
        if _in_window(_parse_report_datetime(item.get("created_at")), previous_start, previous_end) and item.get("id")
    }

    current_recipients = [row for row in recipient_rows if row.get("announcement_id") in current_announcement_ids]
    previous_recipients = [row for row in recipient_rows if row.get("announcement_id") in previous_announcement_ids]
    read_current = sum(1 for row in current_recipients if row.get("read_at"))
    read_previous = sum(1 for row in previous_recipients if row.get("read_at"))
    unread_current = max(len(current_recipients) - read_current, 0)
    unread_previous = max(len(previous_recipients) - read_previous, 0)
    reminders_current = sum(int(row.get("reminder_count") or 0) for row in current_recipients)
    read_rate_current = _to_percent(read_current, len(current_recipients))
    read_rate_previous = _to_percent(read_previous, len(previous_recipients))

    created_maintenance_current = sum(
        1 for item in maintenance_requests
        if _in_window(_parse_report_datetime(item.get("created_at")), start, end)
    )
    created_maintenance_previous = sum(
        1 for item in maintenance_requests
        if _in_window(_parse_report_datetime(item.get("created_at")), previous_start, previous_end)
    )
    completed_maintenance_current = sum(
        1 for item in maintenance_requests
        if item.get("status") == MAINT_STATUS_COMPLETED
        and _in_window(_parse_report_datetime(item.get("updated_at")), start, end)
    )
    completed_maintenance_previous = sum(
        1 for item in maintenance_requests
        if item.get("status") == MAINT_STATUS_COMPLETED
        and _in_window(_parse_report_datetime(item.get("updated_at")), previous_start, previous_end)
    )
    rejected_maintenance_current = sum(
        1 for item in maintenance_requests
        if item.get("status") == MAINT_STATUS_REJECTED
        and _in_window(_parse_report_datetime(item.get("updated_at")), start, end)
    )
    rejected_maintenance_previous = sum(
        1 for item in maintenance_requests
        if item.get("status") == MAINT_STATUS_REJECTED
        and _in_window(_parse_report_datetime(item.get("updated_at")), previous_start, previous_end)
    )
    maintenance_bars = [
        {
            "label": "Bekliyor",
            "value": sum(1 for item in maintenance_requests if item.get("status") == MAINT_STATUS_PENDING),
            "tone": "warning",
        },
        {
            "label": "Sahada",
            "value": sum(1 for item in maintenance_requests if item.get("status") == MAINT_STATUS_IN_PROGRESS),
            "tone": "primary",
        },
        {
            "label": "Kapandi",
            "value": sum(1 for item in maintenance_requests if item.get("status") == MAINT_STATUS_COMPLETED),
            "tone": "success",
        },
    ]

    return {
        "range": window["range"],
        "label": window["label"],
        "sections": {
            "teamPerformance": {
                "title": "Ekip Performansi",
                "subtitle": "Tamamlanan gorevlerin kisi bazli dagilimi.",
                "metrics": [
                    {
                        "label": "Tamamlanan Gorev",
                        "value": str(len(completed_current)),
                        "change": _format_delta(len(completed_current), len(completed_previous)),
                    },
                    {
                        "label": "Ev Gosterimi",
                        "value": str(showing_completed_current),
                        "change": _format_delta(showing_completed_current, showing_completed_previous),
                    },
                    {
                        "label": "Aktif Calisan",
                        "value": str(active_assignees_current),
                        "change": _format_delta(active_assignees_current, active_assignees_previous),
                    },
                ],
                "bars": team_bars,
            },
            "propertyStatus": {
                "title": "Gorev Tip Dagilimi",
                "subtitle": "Secilen araliktaki planlanan gorevlerin tur dagilimi.",
                "metrics": [
                    {
                        "label": "Planlanan Gorev",
                        "value": str(len(scheduled_current)),
                        "change": _format_delta(len(scheduled_current), len(scheduled_previous)),
                    },
                    {
                        "label": "Acik Gorev",
                        "value": str(sum(1 for task in scheduled_current if task.get("status") in [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS])),
                        "change": _format_delta(
                            sum(1 for task in scheduled_current if task.get("status") in [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS]),
                            sum(1 for task in scheduled_previous if task.get("status") in [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS]),
                        ),
                    },
                    {
                        "label": "Geciken Gorev",
                        "value": str(overdue_current),
                        "change": _format_delta(overdue_current, overdue_previous),
                    },
                ],
                "bars": task_type_bars,
            },
            "operationsHealth": {
                "title": "Duyuru Etkisi",
                "subtitle": "Olusan duyurularin okuma ve hatirlatma etkisi.",
                "metrics": [
                    {
                        "label": "Olusan Duyuru",
                        "value": str(len(current_announcement_ids)),
                        "change": _format_delta(len(current_announcement_ids), len(previous_announcement_ids)),
                    },
                    {
                        "label": "Okunma Orani",
                        "value": f"%{read_rate_current}",
                        "change": _format_delta(read_rate_current, read_rate_previous, " puan"),
                    },
                    {
                        "label": "Okunmayan Alici",
                        "value": str(unread_current),
                        "change": _format_delta(unread_current, unread_previous),
                    },
                ],
                "bars": [
                    {"label": "Okundu", "value": read_current, "tone": "success"},
                    {"label": "Okunmadi", "value": unread_current, "tone": "warning"},
                    {"label": "Hatirlat", "value": reminders_current, "tone": "primary"},
                ],
            },
            "maintenanceHealth": {
                "title": "Bakim Nabzi",
                "subtitle": "Portfoydeki bakim taleplerinin donem ve durum gorunumu.",
                "metrics": [
                    {
                        "label": "Acilan Talep",
                        "value": str(created_maintenance_current),
                        "change": _format_delta(created_maintenance_current, created_maintenance_previous),
                    },
                    {
                        "label": "Kapanan Talep",
                        "value": str(completed_maintenance_current),
                        "change": _format_delta(completed_maintenance_current, completed_maintenance_previous),
                    },
                    {
                        "label": "Reddedilen",
                        "value": str(rejected_maintenance_current),
                        "change": _format_delta(rejected_maintenance_current, rejected_maintenance_previous),
                    },
                ],
                "bars": maintenance_bars,
            },
        },
    }


@router.get("/members")
def list_team_members(current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    members = _get_office_members(office_owner_id)
    return {
        "members": [_serialize_member(member) for member in members],
        "viewer": {
            "is_manager": _is_manager(current_user),
            "office_owner_id": office_owner_id,
        },
    }


@router.get("/members/{member_id}")
def get_team_member_detail(member_id: str, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_manager(current_user)
    member = _get_member_or_404(member_id)
    _assert_member_in_office(member, office_owner_id)

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    completed_tasks_count = (
        supabase.table("team_tasks")
        .select("id", count="exact")
        .eq("office_owner_id", office_owner_id)
        .eq("assignee_id", member_id)
        .eq("status", TASK_STATUS_COMPLETED)
        .gte("completed_at", month_start)
        .execute()
        .count
        or 0
    )
    property_showings_count = (
        supabase.table("team_tasks")
        .select("id", count="exact")
        .eq("office_owner_id", office_owner_id)
        .eq("assignee_id", member_id)
        .eq("task_type", TASK_TYPE_PROPERTY_SHOWING)
        .eq("status", TASK_STATUS_COMPLETED)
        .gte("completed_at", month_start)
        .execute()
        .count
        or 0
    )

    serialized = _serialize_member({
        **member,
        "member_type": "owner" if member.get("id") == office_owner_id else "employee",
        "is_manager": member.get("id") == office_owner_id or member.get("employee_access_level") == "full",
    })

    return {
        "member": serialized,
        "metrics": {
            "completed_tasks_this_month": completed_tasks_count,
            "property_showings_this_month": property_showings_count,
        },
    }


@router.get("/messages")
def list_team_messages(current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    try:
        messages = (
            supabase.table("team_messages")
            .select("*")
            .eq("office_id", office_owner_id)
            .order("created_at", desc=False)
            .limit(200)
            .execute()
            .data
            or []
        )
        user_map = _fetch_user_map([message.get("sender_id") for message in messages])
        return {"messages": [_serialize_message(message, user_map) for message in messages]}
    except Exception:
        logger.exception("Team message list query failed for office %s", office_owner_id)
        return {"messages": []}


@router.post("/messages")
def create_team_message(request: CreateTeamMessageRequest, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    body = request.body.strip()

    if not body:
        raise HTTPException(status_code=400, detail="Mesaj bos olamaz")
    if len(body) > 2000:
        raise HTTPException(status_code=400, detail="Mesaj en fazla 2000 karakter olabilir")

    created_result = (
        supabase.table("team_messages")
        .insert({
            "office_id": office_owner_id,
            "sender_id": current_user["id"],
            "body": body,
            "created_at": _now(),
        })
        .execute()
    )
    if not created_result.data:
        raise HTTPException(status_code=500, detail="Mesaj gonderilemedi")

    created_message = created_result.data[0]
    office_members = _get_office_members(office_owner_id)
    recipient_ids = {
        member["id"]
        for member in office_members
        if member.get("id") and member.get("id") != current_user["id"]
    }
    sender_name = current_user.get("full_name") or "Ofis kullanicisi"
    notify_users(
        recipient_ids,
        "team_message",
        f"Yeni ekip mesaji: {sender_name}",
        body[:120],
        created_message["id"],
    )

    user_map = _fetch_user_map([created_message.get("sender_id")])
    return {
        "success": True,
        "message": _serialize_message(created_message, user_map),
    }


@router.get("/tasks")
def list_team_tasks(current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    try:
        query = supabase.table("team_tasks").select("*").eq("office_owner_id", office_owner_id)

        if not _is_manager(current_user):
            query = query.eq("assignee_id", current_user["id"])

        tasks = query.order("scheduled_at", desc=False).execute().data or []
        user_map = _fetch_user_map([task.get("assignee_id") for task in tasks] + [task.get("created_by") for task in tasks])
        property_map = _fetch_property_map([task.get("property_id") for task in tasks])

        return {"tasks": [_serialize_task(task, user_map, property_map) for task in tasks]}
    except Exception:
        logger.exception("Team task list query failed for office %s", office_owner_id)
        return {"tasks": []}


@router.post("/tasks")
def create_team_task(request: CreateTeamTaskRequest, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_manager(current_user)
    payload = _validate_task_payload(request, office_owner_id)

    now = _now()
    task_doc = {
        **payload,
        "office_owner_id": office_owner_id,
        "created_by": current_user["id"],
        "status": TASK_STATUS_PENDING,
        "started_at": None,
        "completed_at": None,
        "completion_note": None,
        "completion_photo_urls": [],
        "created_at": now,
        "updated_at": now,
    }

    result = supabase.table("team_tasks").insert(task_doc).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Gorev kaydedilemedi")

    created_task = result.data[0]
    assignee = _validate_assignee(created_task["assignee_id"], office_owner_id)
    notify_user(
        created_task.get("assignee_id"),
        "task",
        "Yeni Gorev Atandi",
        f"{created_task.get('title')} gorevi size atandi.",
        created_task["id"],
    )

    user_map = _fetch_user_map([created_task.get("assignee_id"), created_task.get("created_by")])
    property_map = _fetch_property_map([created_task.get("property_id")])
    return {
        "success": True,
        "task": _serialize_task(created_task, user_map, property_map),
        "assignee_name": assignee.get("full_name"),
    }


@router.get("/tasks/{task_id}")
def get_team_task(task_id: str, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    task = _get_team_task_or_404(task_id)
    _assert_can_view_task(current_user, task, office_owner_id)

    user_map = _fetch_user_map([task.get("assignee_id"), task.get("created_by")])
    property_map = _fetch_property_map([task.get("property_id")])
    return _serialize_task(task, user_map, property_map)


@router.patch("/tasks/{task_id}")
def update_team_task(task_id: str, request: UpdateTeamTaskRequest, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_manager(current_user)
    task = _get_team_task_or_404(task_id)

    if task.get("office_owner_id") != office_owner_id:
        raise HTTPException(status_code=404, detail="Gorev bulunamadi")
    if task.get("status") in [TASK_STATUS_COMPLETED, TASK_STATUS_CANCELLED]:
        raise HTTPException(status_code=400, detail="Tamamlanan veya iptal edilen gorev duzenlenemez")

    payload = _validate_task_payload(request, office_owner_id, existing_task=task)
    payload["updated_at"] = _now()

    result = (
        supabase.table("team_tasks")
        .update(payload)
        .eq("id", task_id)
        .select("*")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Gorev guncellenemedi")

    updated_task = result.data
    user_map = _fetch_user_map([updated_task.get("assignee_id"), updated_task.get("created_by")])
    property_map = _fetch_property_map([updated_task.get("property_id")])
    return {"success": True, "task": _serialize_task(updated_task, user_map, property_map)}


@router.post("/tasks/{task_id}/transition")
def transition_team_task(task_id: str, request: TeamTaskTransitionRequest, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    task = _get_team_task_or_404(task_id)
    _assert_can_view_task(current_user, task, office_owner_id)
    _assert_can_transition_task(current_user, task, request.action)

    current_status = task.get("status")
    update_payload: dict = {"updated_at": _now()}

    if request.action == "start":
        if current_status != TASK_STATUS_PENDING:
            raise HTTPException(status_code=400, detail="Yalnizca bekleyen gorev baslatilabilir")
        update_payload["status"] = TASK_STATUS_IN_PROGRESS
        update_payload["started_at"] = update_payload["updated_at"]

    elif request.action == "cancel":
        if current_status not in [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS]:
            raise HTTPException(status_code=400, detail="Bu gorev artik iptal edilemez")
        update_payload["status"] = TASK_STATUS_CANCELLED

    elif request.action == "complete":
        if current_status != TASK_STATUS_IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Gorev tamamlanmadan once devam ediyor durumuna alinmalidir")
        if not request.note or not request.note.strip():
            raise HTTPException(status_code=400, detail="Tamamlama notu zorunludur")
        if not request.photo_urls:
            raise HTTPException(status_code=400, detail="Tamamlama icin en az bir fotograf gereklidir")
        update_payload["status"] = TASK_STATUS_COMPLETED
        update_payload["completed_at"] = update_payload["updated_at"]
        update_payload["completion_note"] = request.note.strip()
        update_payload["completion_photo_urls"] = request.photo_urls

    result = (
        supabase.table("team_tasks")
        .update(update_payload)
        .eq("id", task_id)
        .select("*")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Gorev guncellenemedi")

    updated_task = result.data
    assignee = _validate_assignee(updated_task["assignee_id"], office_owner_id)

    if request.action == "complete":
        _notify_task_completion(updated_task, assignee, office_owner_id)

    user_map = _fetch_user_map([updated_task.get("assignee_id"), updated_task.get("created_by")])
    property_map = _fetch_property_map([updated_task.get("property_id")])
    return {"success": True, "task": _serialize_task(updated_task, user_map, property_map)}


@router.get("/announcements")
def list_announcements(current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    try:
        if _is_manager(current_user):
            announcements = (
                supabase.table("announcements")
                .select("*")
                .eq("office_owner_id", office_owner_id)
                .order("created_at", desc=True)
                .execute()
                .data
                or []
            )
        else:
            recipient_rows = (
                supabase.table("announcement_recipients")
                .select("announcement_id")
                .eq("user_id", current_user["id"])
                .execute()
                .data
                or []
            )
            announcement_ids = [row.get("announcement_id") for row in recipient_rows if row.get("announcement_id")]
            if not announcement_ids:
                return {"announcements": []}
            announcements = (
                supabase.table("announcements")
                .select("*")
                .in_("id", announcement_ids)
                .eq("office_owner_id", office_owner_id)
                .order("created_at", desc=True)
                .execute()
                .data
                or []
            )

        announcement_ids = [announcement.get("id") for announcement in announcements if announcement.get("id")]
        recipients_by_announcement = _get_announcement_recipient_rows(announcement_ids)
        user_ids = [announcement.get("created_by") for announcement in announcements]
        for rows in recipients_by_announcement.values():
            user_ids.extend([row.get("user_id") for row in rows])
        user_map = _fetch_user_map(user_ids)

        serialized = [
            _serialize_announcement(
                announcement,
                recipients_by_announcement.get(announcement.get("id"), []),
                user_map,
                current_user_id=current_user.get("id"),
            )
            for announcement in announcements
        ]
        return {"announcements": serialized}
    except Exception:
        logger.exception("Announcement list query failed for office %s", office_owner_id)
        return {"announcements": []}


@router.post("/announcements")
def create_announcement(request: CreateAnnouncementRequest, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_manager(current_user)
    title = request.title.strip()
    body = request.body.strip()

    if not title:
        raise HTTPException(status_code=400, detail="Duyuru basligi zorunludur")
    if not body:
        raise HTTPException(status_code=400, detail="Duyuru icerigi zorunludur")

    office_members = _get_office_members(office_owner_id)
    office_member_ids = {member["id"] for member in office_members if member.get("id")}

    if request.send_to_all:
        recipient_ids = sorted(office_member_ids)
    else:
        recipient_ids = sorted({recipient_id for recipient_id in request.recipient_ids if recipient_id})
        if not recipient_ids:
            raise HTTPException(status_code=400, detail="Secili kisi listesi bos olamaz")
        invalid_ids = [recipient_id for recipient_id in recipient_ids if recipient_id not in office_member_ids]
        if invalid_ids:
            raise HTTPException(status_code=400, detail="Secilen alicilar ofisinize ait degil")

    now = _now()
    announcement_doc = {
        "office_owner_id": office_owner_id,
        "created_by": current_user["id"],
        "title": title,
        "body": body,
        "attachment_path": request.attachment_path,
        "attachment_kind": request.attachment_kind,
        "created_at": now,
        "updated_at": now,
    }
    result = supabase.table("announcements").insert(announcement_doc).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Duyuru kaydedilemedi")

    created_announcement = result.data[0]
    recipient_rows = []
    for recipient_id in recipient_ids:
        recipient_rows.append({
            "announcement_id": created_announcement["id"],
            "user_id": recipient_id,
            "read_at": now if recipient_id == current_user["id"] else None,
            "reminded_at": None,
            "reminder_count": 0,
        })
    if recipient_rows:
        supabase.table("announcement_recipients").insert(recipient_rows).execute()

    for recipient_id in recipient_ids:
        if recipient_id == current_user["id"]:
            continue
        notify_user(
            recipient_id,
            "announcement",
            created_announcement["title"],
            created_announcement["body"],
            created_announcement["id"],
        )

    recipients_by_announcement = _get_announcement_recipient_rows([created_announcement["id"]])
    user_map = _fetch_user_map([created_announcement.get("created_by"), *recipient_ids])
    return {
        "success": True,
        "announcement": _serialize_announcement(
            created_announcement,
            recipients_by_announcement.get(created_announcement["id"], []),
            user_map,
            current_user_id=current_user.get("id"),
        ),
    }


@router.post("/announcements/{announcement_id}/read")
def mark_announcement_read(announcement_id: str, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_office_user(current_user)
    announcement = _get_announcement_or_404(announcement_id)

    if announcement.get("office_owner_id") != office_owner_id:
        raise HTTPException(status_code=404, detail="Duyuru bulunamadi")

    recipient_result = (
        supabase.table("announcement_recipients")
        .select("*")
        .eq("announcement_id", announcement_id)
        .eq("user_id", current_user["id"])
        .maybe_single()
        .execute()
    )

    if recipient_result.data:
        supabase.table("announcement_recipients").update({
            "read_at": _now(),
        }).eq("announcement_id", announcement_id).eq("user_id", current_user["id"]).execute()

    return {"success": True}


@router.post("/announcements/{announcement_id}/remind")
def remind_announcement(announcement_id: str, current_user: dict = Depends(get_current_user)):
    office_owner_id = _require_manager(current_user)
    announcement = _get_announcement_or_404(announcement_id)

    if announcement.get("office_owner_id") != office_owner_id:
        raise HTTPException(status_code=404, detail="Duyuru bulunamadi")

    recipient_rows = (
        supabase.table("announcement_recipients")
        .select("*")
        .eq("announcement_id", announcement_id)
        .is_("read_at", None)
        .execute()
        .data
        or []
    )

    if not recipient_rows:
        return {"success": True, "reminded_count": 0}

    reminded_at = _now()
    reminded_count = 0
    for row in recipient_rows:
        supabase.table("announcement_recipients").update({
            "reminded_at": reminded_at,
            "reminder_count": (row.get("reminder_count") or 0) + 1,
        }).eq("announcement_id", announcement_id).eq("user_id", row.get("user_id")).execute()
        notify_user(
            row.get("user_id"),
            "announcement",
            f"Hatirlatma: {announcement.get('title')}",
            announcement.get("body") or "Bu duyuru henuz okunmadi.",
            announcement_id,
        )
        reminded_count += 1

    return {"success": True, "reminded_count": reminded_count}
