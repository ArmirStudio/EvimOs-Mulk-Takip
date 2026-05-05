import json
import logging
from typing import Any, Iterable, Optional
from urllib import error as urllib_error
from urllib import request as urllib_request

from core.database import SUPABASE_URL, supabase
EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"

logger = logging.getLogger(__name__)


def build_public_storage_url(bucket: str, path: str) -> str:
    normalized = path.lstrip("/")
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{normalized}"


def _send_expo_push(token: str, title: str, body: str, data: dict[str, Any]) -> None:
    payload = json.dumps({
        "to": token,
        "title": title,
        "body": body,
        "data": data,
        "sound": "default",
    }).encode("utf-8")
    request = urllib_request.Request(
        EXPO_PUSH_ENDPOINT,
        data=payload,
        headers={
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(request, timeout=8):
            return
    except urllib_error.URLError as exc:
        logger.warning("Expo push failed for token %s: %s", token, exc)


def notify_user(
    user_id: Optional[str],
    notification_type: str,
    title: str,
    message: str,
    related_id: Optional[str] = None,
    *,
    push_data: Optional[dict[str, Any]] = None,
) -> None:
    if not user_id:
        return

    try:
        supabase.table("notifications").insert({
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "body": message,
            "related_id": related_id,
            "read": False,
        }).execute()
    except Exception as exc:
        logger.warning("Notification insert failed for user %s: %s", user_id, exc)

    try:
        user = (
            supabase.table("users")
            .select("push_token")
            .eq("id", user_id)
            .maybe_single()
            .execute()
            .data
        )
        token = user.get("push_token") if user else None
        if token:
            _send_expo_push(
                token,
                title,
                message,
                {
                    "type": notification_type,
                    "id": related_id,
                    **(push_data or {}),
                },
            )
    except Exception as exc:
        logger.warning("Notification push lookup failed for user %s: %s", user_id, exc)


def notify_users(
    user_ids: Iterable[Optional[str]],
    notification_type: str,
    title: str,
    message: str,
    related_id: Optional[str] = None,
    *,
    push_data: Optional[dict[str, Any]] = None,
) -> None:
    for user_id in {item for item in user_ids if item}:
        notify_user(
            user_id,
            notification_type,
            title,
            message,
            related_id,
            push_data=push_data,
        )
