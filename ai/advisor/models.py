import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, DateTime, Index, Integer, String, Text, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import Uuid


class Base(DeclarativeBase):
    pass


class Recommendation(Base):
    __tablename__ = "recommendation"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    risk_tolerance: Mapped[str | None] = mapped_column(String(32), nullable=True)
    news_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    news_references: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # ponytail: ascending composite index; btree scans backwards for the
    # ORDER BY created_at DESC, id DESC "latest" query.
    __table_args__ = (Index("ix_recommendation_user_latest", "user_id", "created_at", "id"),)


class NewsArticle(Base):
    __tablename__ = "news_article"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    external_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_hash: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    symbols: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    # ponytail: dimensionless Vector (rows mix embedding models/dims), so no single HNSW/IVFFlat
    # index — cosine search full-scans. Add per-model partial indexes on a fixed dim before scale.
    embedding: Mapped[list[float]] = mapped_column(Vector, nullable=False)
    embedding_model: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_dim: Mapped[int] = mapped_column(Integer, nullable=False)
    raw: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("uq_news_article_content_hash", "content_hash", unique=True),
        Index(
            "uq_news_article_external_id",
            "external_id",
            unique=True,
            postgresql_where=text("external_id IS NOT NULL"),
        ),
    )
