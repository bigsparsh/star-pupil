import uuid
from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserStats(Base):
    """User GitHub statistics and activity metrics."""
    
    __tablename__ = "user_stats"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    merged_prs: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )
    total_commits: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )
    total_repos: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )
    followers: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )
    repo_activity_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    languages_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    contribution_graph_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    # Stack Overflow data (top tags, badges, reputation)
    stackoverflow_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    # Dev.to articles and reactions
    devto_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    # Hashnode articles
    hashnode_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    # Verified skills (auto-verified via badges, high-engagement content)
    verified_skills_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    # Contributions to popular repos (100+ stars)
    popular_repo_contributions_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    # Portfolio website scraped data
    portfolio_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )
    complexity_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    
    # Relationships
    user = relationship("User", back_populates="stats")
    
    def __repr__(self) -> str:
        return f"<UserStats user={self.user_id}>"
