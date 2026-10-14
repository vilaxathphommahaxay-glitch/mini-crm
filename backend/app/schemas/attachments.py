from datetime import datetime

from app.schemas.common import OutputModel, UserRef


class AttachmentOut(OutputModel):
    id: int
    filename: str
    content_type: str
    size: int
    uploaded_by: UserRef
    created_at: datetime
