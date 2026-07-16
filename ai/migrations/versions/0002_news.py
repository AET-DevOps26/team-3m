"""news_article table + recommendation news columns

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-08

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "news_article",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("external_id", sa.Text(), nullable=True),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("symbols", sa.JSON(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("embedding", Vector(), nullable=False),
        sa.Column("embedding_model", sa.Text(), nullable=False),
        sa.Column("embedding_dim", sa.Integer(), nullable=False),
        sa.Column("raw", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("uq_news_article_content_hash", "news_article", ["content_hash"], unique=True)
    op.create_index(
        "uq_news_article_external_id",
        "news_article",
        ["external_id"],
        unique=True,
        postgresql_where=sa.text("external_id IS NOT NULL"),
    )

    op.add_column("recommendation", sa.Column("news_summary", sa.Text(), nullable=True))
    op.add_column("recommendation", sa.Column("news_references", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("recommendation", "news_references")
    op.drop_column("recommendation", "news_summary")
    op.drop_index("uq_news_article_external_id", table_name="news_article")
    op.drop_index("uq_news_article_content_hash", table_name="news_article")
    op.drop_table("news_article")
