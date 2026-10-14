from datetime import datetime
from typing import Any

from app.schemas.common import OutputModel, UserRef


class HistoryEventOut(OutputModel):
    id: int
    created_at: datetime
    actor: UserRef | None
    entity_type: str
    entity_id: int
    entity_label: str
    action: str  # created, updated, deleted, transferred
    # updated: [{"field", "from", "to", "from_label"?, "to_label"?}] or tags: {"added", "removed"}
    changes: list[dict[str, Any]] | None
