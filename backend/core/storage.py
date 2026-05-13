import logging
from typing import Iterable
from urllib.parse import unquote, urlparse

from .database import supabase

logger = logging.getLogger(__name__)


def normalize_storage_path(value: str | None) -> str | None:
    if not value:
        return None

    normalized = value.replace("\\", "/").strip().lstrip("/")
    if not normalized or normalized.startswith(("http://", "https://", "file://", "content://")):
        return None

    return normalized


def extract_storage_path(bucket: str, value: str | None) -> str | None:
    if not value:
        return None

    trimmed = value.replace("\\", "/").strip().lstrip("/")
    if not trimmed:
        return None

    if trimmed.lower().startswith(("file://", "content://")):
        return None

    bucket_prefix = f"{bucket}/"
    if trimmed.startswith(bucket_prefix):
        trimmed = trimmed[len(bucket_prefix):]
    elif trimmed.lower().startswith(("http://", "https://")):
        parsed = urlparse(trimmed)
        markers = [
            f"/storage/v1/object/public/{bucket}/",
            f"/storage/v1/object/sign/{bucket}/",
            f"/storage/v1/object/{bucket}/",
        ]
        for marker in markers:
            if marker in parsed.path:
                trimmed = parsed.path.split(marker, 1)[1]
                break
        else:
            return None

    normalized = unquote(trimmed).strip().lstrip("/")
    if not normalized or ".." in normalized.split("/") or "/" not in normalized:
        return None

    return normalized


def remove_storage_objects(bucket: str, paths: Iterable[str]) -> None:
    normalized_paths = [
        path
        for raw in paths
        if (path := extract_storage_path(bucket, raw) or normalize_storage_path(raw))
    ]
    if not normalized_paths:
        return

    try:
        result = supabase.storage.from_(bucket).remove(normalized_paths)
    except Exception as exc:
        logger.exception("Storage object removal failed for bucket %s", bucket)
        raise RuntimeError(f"{bucket} bucket icindeki dosyalar silinemedi") from exc

    error = getattr(result, "error", None)
    if error:
        logger.error("Storage object removal returned error for bucket %s: %s", bucket, error)
        raise RuntimeError(f"{bucket} bucket icindeki dosyalar silinemedi")


def remove_storage_object(bucket: str, path: str | None) -> None:
    remove_storage_objects(bucket, [path] if path else [])
