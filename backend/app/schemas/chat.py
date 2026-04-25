"""
Chat Schemas

Pydantic schemas for chat API requests and responses.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Schema for sending a new message."""
    content: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    content: str
    is_read: bool
    created_at: datetime
    is_own_message: bool = False  # Will be set based on current user
    
    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    """Schema for conversation response."""
    id: uuid.UUID
    other_user_id: uuid.UUID
    other_user_name: str
    other_user_github: str | None = None
    last_message: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0
    created_at: datetime
    
    model_config = {"from_attributes": True}


class ConversationDetailResponse(BaseModel):
    """Schema for conversation with messages."""
    id: uuid.UUID
    other_user_id: uuid.UUID
    other_user_name: str
    other_user_github: str | None = None
    messages: list[MessageResponse] = []
    created_at: datetime
    
    model_config = {"from_attributes": True}


class WebSocketMessage(BaseModel):
    """Schema for WebSocket messages."""
    type: str  # "message", "typing", "read"
    conversation_id: uuid.UUID | None = None
    content: str | None = None
    recipient_id: uuid.UUID | None = None


class WebSocketResponse(BaseModel):
    """Schema for WebSocket responses."""
    type: str  # "message", "typing", "read", "error", "connected"
    data: dict | None = None
    error: str | None = None
