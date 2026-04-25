import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, PyEnum):
    """User role enumeration."""
    PROGRAMMER = "programmer"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class User(Base):
    """User model for authentication and profiles."""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.PROGRAMMER,
        nullable=False,
    )
    github_username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
    )
    linkedin_username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    twitter_username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    stackoverflow_user_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    devto_username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    hashnode_username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    website: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    bio: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    
    # Relationships
    skill_mappings = relationship("SkillMapping", back_populates="user", cascade="all, delete-orphan")
    stats = relationship("UserStats", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<User {self.email}>"
