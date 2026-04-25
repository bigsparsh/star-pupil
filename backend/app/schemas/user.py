import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.PROGRAMMER
    github_username: str | None = None
    linkedin_username: str | None = None
    twitter_username: str | None = None
    stackoverflow_user_id: str | None = None
    devto_username: str | None = None
    hashnode_username: str | None = None
    website: str | None = None
    location: str | None = None
    bio: str | None = None


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    github_username: str | None = None
    linkedin_username: str | None = None
    twitter_username: str | None = None
    stackoverflow_user_id: str | None = None
    devto_username: str | None = None
    hashnode_username: str | None = None
    website: str | None = None
    location: str | None = None
    bio: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    name: str | None = None
    github_username: str | None = None
    linkedin_username: str | None = None
    twitter_username: str | None = None
    stackoverflow_user_id: str | None = None
    devto_username: str | None = None
    hashnode_username: str | None = None
    website: str | None = None
    location: str | None = None
    bio: str | None = None


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
