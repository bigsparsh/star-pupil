"""
Chat Routes

Handles messaging between recruiters and programmers with WebSocket support.
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func, update
from sqlalchemy.orm import selectinload

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_user, require_role, decode_token
from app.models.user import User, UserRole
from app.models.chat import Conversation, Message
from app.schemas.chat import (
    MessageCreate,
    MessageResponse,
    ConversationResponse,
    ConversationDetailResponse,
)


router = APIRouter(prefix="/chat", tags=["Chat"])


# Store active WebSocket connections: user_id -> WebSocket
active_connections: Dict[str, WebSocket] = {}


class ConnectionManager:
    """Manages WebSocket connections."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception:
                self.disconnect(user_id)
    
    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections


manager = ConnectionManager()


@router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all conversations for the current user.
    """
    # Query conversations where user is either recruiter or programmer
    query = (
        select(Conversation)
        .where(
            or_(
                Conversation.recruiter_id == current_user.id,
                Conversation.programmer_id == current_user.id,
            )
        )
        .options(
            selectinload(Conversation.recruiter),
            selectinload(Conversation.programmer),
            selectinload(Conversation.messages),
        )
        .order_by(Conversation.updated_at.desc())
    )
    
    result = await db.execute(query)
    conversations = result.scalars().all()
    
    response = []
    for conv in conversations:
        # Determine the "other" user
        if conv.recruiter_id == current_user.id:
            other_user = conv.programmer
        else:
            other_user = conv.recruiter
        
        # Get last message and unread count
        last_message = None
        last_message_at = None
        unread_count = 0
        
        if conv.messages:
            last_msg = conv.messages[-1]
            last_message = last_msg.content[:100]  # Truncate
            last_message_at = last_msg.created_at
            
            # Count unread messages not sent by current user
            unread_count = sum(
                1 for m in conv.messages 
                if not m.is_read and m.sender_id != current_user.id
            )
        
        response.append(ConversationResponse(
            id=conv.id,
            other_user_id=other_user.id,
            other_user_name=other_user.name,
            other_user_github=other_user.github_username,
            last_message=last_message,
            last_message_at=last_message_at,
            unread_count=unread_count,
            created_at=conv.created_at,
        ))
    
    return response


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific conversation with all messages.
    """
    query = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            or_(
                Conversation.recruiter_id == current_user.id,
                Conversation.programmer_id == current_user.id,
            ),
        )
        .options(
            selectinload(Conversation.recruiter),
            selectinload(Conversation.programmer),
            selectinload(Conversation.messages).selectinload(Message.sender),
        )
    )
    
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Mark messages as read
    await db.execute(
        update(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user.id,
            Message.is_read == False,
        )
        .values(is_read=True)
    )
    
    # Determine the "other" user
    if conv.recruiter_id == current_user.id:
        other_user = conv.programmer
    else:
        other_user = conv.recruiter
    
    messages = [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=m.sender.name,
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at,
            is_own_message=m.sender_id == current_user.id,
        )
        for m in conv.messages
    ]
    
    return ConversationDetailResponse(
        id=conv.id,
        other_user_id=other_user.id,
        other_user_name=other_user.name,
        other_user_github=other_user.github_username,
        messages=messages,
        created_at=conv.created_at,
    )


@router.post("/conversations/{programmer_id}", response_model=ConversationDetailResponse)
async def get_or_create_conversation(
    programmer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.RECRUITER, UserRole.ADMIN])),
):
    """
    Get or create a conversation with a programmer.
    Only recruiters can initiate conversations.
    """
    # Check if programmer exists
    result = await db.execute(select(User).where(User.id == programmer_id))
    programmer = result.scalar_one_or_none()
    
    if not programmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programmer not found",
        )
    
    if programmer.role != UserRole.PROGRAMMER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only message programmers",
        )
    
    # Check for existing conversation
    query = (
        select(Conversation)
        .where(
            Conversation.recruiter_id == current_user.id,
            Conversation.programmer_id == programmer_id,
        )
        .options(
            selectinload(Conversation.recruiter),
            selectinload(Conversation.programmer),
            selectinload(Conversation.messages).selectinload(Message.sender),
        )
    )
    
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    
    if not conv:
        # Create new conversation
        conv = Conversation(
            recruiter_id=current_user.id,
            programmer_id=programmer_id,
        )
        db.add(conv)
        await db.flush()
        await db.refresh(conv)
        
        # Reload with relationships
        result = await db.execute(
            select(Conversation)
            .where(Conversation.id == conv.id)
            .options(
                selectinload(Conversation.recruiter),
                selectinload(Conversation.programmer),
                selectinload(Conversation.messages),
            )
        )
        conv = result.scalar_one()
    
    messages = [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=m.sender.name if hasattr(m, 'sender') and m.sender else current_user.name,
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at,
            is_own_message=m.sender_id == current_user.id,
        )
        for m in conv.messages
    ]
    
    return ConversationDetailResponse(
        id=conv.id,
        other_user_id=programmer.id,
        other_user_name=programmer.name,
        other_user_github=programmer.github_username,
        messages=messages,
        created_at=conv.created_at,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: uuid.UUID,
    message_data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message in a conversation.
    """
    # Verify user is part of conversation
    query = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            or_(
                Conversation.recruiter_id == current_user.id,
                Conversation.programmer_id == current_user.id,
            ),
        )
    )
    
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message_data.content,
    )
    db.add(message)
    
    # Update conversation timestamp
    conv.updated_at = datetime.now(timezone.utc)
    
    await db.flush()
    await db.refresh(message)
    
    response = MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=current_user.name,
        content=message.content,
        is_read=message.is_read,
        created_at=message.created_at,
        is_own_message=True,
    )
    
    # Send real-time notification to the other user
    other_user_id = str(conv.programmer_id) if conv.recruiter_id == current_user.id else str(conv.recruiter_id)
    await manager.send_personal_message(
        {
            "type": "new_message",
            "data": {
                "id": str(message.id),
                "conversation_id": str(conversation_id),
                "sender_id": str(current_user.id),
                "sender_name": current_user.name,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            }
        },
        other_user_id,
    )
    
    return response


@router.post("/conversations/{conversation_id}/read")
async def mark_messages_read(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark all messages in a conversation as read.
    """
    # Verify user is part of conversation
    query = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            or_(
                Conversation.recruiter_id == current_user.id,
                Conversation.programmer_id == current_user.id,
            ),
        )
    )
    
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Mark all messages from other user as read
    await db.execute(
        update(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user.id,
            Message.is_read == False,
        )
        .values(is_read=True)
    )
    
    # Notify sender that messages were read
    other_user_id = str(conv.programmer_id) if conv.recruiter_id == current_user.id else str(conv.recruiter_id)
    await manager.send_personal_message(
        {
            "type": "messages_read",
            "data": {
                "conversation_id": str(conversation_id),
            }
        },
        other_user_id,
    )
    
    return {"status": "ok"}


@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get total unread message count for current user.
    """
    # Get all conversations for user
    conv_query = (
        select(Conversation.id)
        .where(
            or_(
                Conversation.recruiter_id == current_user.id,
                Conversation.programmer_id == current_user.id,
            )
        )
    )
    
    # Count unread messages
    count_query = (
        select(func.count(Message.id))
        .where(
            Message.conversation_id.in_(conv_query),
            Message.sender_id != current_user.id,
            Message.is_read == False,
        )
    )
    
    result = await db.execute(count_query)
    count = result.scalar()
    
    return {"unread_count": count or 0}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    """
    WebSocket endpoint for real-time messaging.
    
    Connect with: ws://host/chat/ws?token=<jwt_token>
    """
    # Must accept connection first before we can send/close
    await websocket.accept()
    
    try:
        # Verify token
        if not token:
            await websocket.close(code=4001, reason="Token required")
            return
            
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        # Register connection (already accepted)
        manager.active_connections[user_id] = websocket
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "data": {"user_id": user_id}
        })
        
        try:
            while True:
                # Receive and handle messages
                data = await websocket.receive_json()
                msg_type = data.get("type")
                
                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                
                elif msg_type == "typing":
                    # Forward typing indicator to other user
                    conversation_id = data.get("conversation_id")
                    if conversation_id:
                        # Get other user in conversation
                        async with AsyncSessionLocal() as db:
                            result = await db.execute(
                                select(Conversation).where(Conversation.id == conversation_id)
                            )
                            conv = result.scalar_one_or_none()
                            if conv:
                                other_user_id = str(conv.programmer_id) if str(conv.recruiter_id) == user_id else str(conv.recruiter_id)
                                await manager.send_personal_message(
                                    {
                                        "type": "typing",
                                        "data": {
                                            "conversation_id": conversation_id,
                                            "user_id": user_id,
                                        }
                                    },
                                    other_user_id,
                                )
                
        except WebSocketDisconnect:
            manager.disconnect(user_id)
            
    except Exception as e:
        await websocket.close(code=4000, reason=str(e))
