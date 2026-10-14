"""Attached files on disk: one file per attachment, named by a random key (never the user's
file name, so names can't clash or point outside the folder)."""

import secrets
from pathlib import Path

from app.config import get_settings

# tests point this at a temporary folder
root_override: Path | None = None


def root() -> Path:
    folder = root_override or Path(get_settings().upload_dir)
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def path_for(key: str) -> Path:
    return root() / key


def save(data: bytes) -> str:
    key = secrets.token_hex(16)
    path_for(key).write_bytes(data)
    return key


def remove(*keys: str) -> None:
    """Best effort: a file that is already gone is fine."""
    for key in keys:
        path_for(key).unlink(missing_ok=True)
