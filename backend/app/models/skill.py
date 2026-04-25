import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Skill(Base):
    """Skill model representing technical skills."""
    
    __tablename__ = "skills"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    
    # Relationships
    skill_mappings = relationship("SkillMapping", back_populates="skill", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Skill {self.name}>"


class SkillMapping(Base):
    """Mapping between users and their skills with proficiency levels."""
    
    __tablename__ = "skill_mappings"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    proficiency_level: Mapped[int] = mapped_column(
        Integer,
        default=1,  # 1-5 scale
        nullable=False,
    )
    years_experience: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    
    # Relationships
    user = relationship("User", back_populates="skill_mappings")
    skill = relationship("Skill", back_populates="skill_mappings")
    
    def __repr__(self) -> str:
        return f"<SkillMapping user={self.user_id} skill={self.skill_id}>"
