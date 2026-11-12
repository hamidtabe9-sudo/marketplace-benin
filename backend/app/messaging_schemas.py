from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    listing_id: int = Field(gt=0)


class ConversationRead(BaseModel):
    id: int
    listing_id: int
    listing_title: str | None
    listing_image_url: str | None
    other_user_id: int
    other_user_name: str
    last_message: str | None
    last_message_at: datetime | None
    created_at: datetime


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageRead(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    body: str
    created_at: datetime