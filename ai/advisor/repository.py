from datetime import datetime
from typing import cast

from sqlalchemy import CursorResult, delete, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .models import NewsArticle, Recommendation

# ponytail: lenient cosine-distance cut (pgvector 0=identical, 2=opposite) so clearly
# unrelated news is not grounded as evidence. Tune against real embeddings if recall suffers.
MAX_NEWS_COSINE_DISTANCE = 0.6


async def save_recommendation(
    session: AsyncSession,
    *,
    user_id: str,
    recommendation: str,
    rationale: str,
    risk_tolerance: str | None,
    news_summary: str | None = None,
    news_references: list | None = None,
) -> None:
    session.add(
        Recommendation(
            user_id=user_id,
            recommendation=recommendation,
            rationale=rationale,
            risk_tolerance=risk_tolerance,
            news_summary=news_summary,
            news_references=news_references,
        )
    )
    await session.commit()


async def get_latest_recommendation(session: AsyncSession, user_id: str) -> Recommendation | None:
    result = await session.execute(
        select(Recommendation)
        .where(Recommendation.user_id == user_id)
        .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def save_news_article(
    session: AsyncSession,
    *,
    external_id: str | None,
    content_hash: str,
    title: str,
    content: str,
    url: str | None,
    source: str | None,
    symbols: list[str],
    published_at: datetime | None,
    embedding: list[float],
    embedding_model: str,
    embedding_dim: int,
    raw: dict | None,
) -> None:
    # Bare ON CONFLICT DO NOTHING: either unique index (content_hash or the partial
    # external_id) suppresses a duplicate, so at-least-once redelivery is idempotent.
    stmt = (
        pg_insert(NewsArticle)
        .values(
            external_id=external_id,
            content_hash=content_hash,
            title=title,
            content=content,
            url=url,
            source=source,
            symbols=symbols,
            published_at=published_at,
            embedding=embedding,
            embedding_model=embedding_model,
            embedding_dim=embedding_dim,
            raw=raw,
        )
        .on_conflict_do_nothing()
    )
    await session.execute(stmt)
    await session.commit()


async def delete_news_older_than(session: AsyncSession, cutoff: datetime) -> int:
    """Delete news articles ingested before ``cutoff``; returns the number removed."""
    result = cast(CursorResult, await session.execute(delete(NewsArticle).where(NewsArticle.created_at < cutoff)))
    await session.commit()
    return result.rowcount or 0


async def find_relevant_news(
    session: AsyncSession,
    *,
    symbols: list[str],
    query_embedding: list[float] | None,
    embedding_model: str | None,
    limit: int = 5,
) -> list[NewsArticle]:
    found: dict = {}

    if symbols:
        # ponytail: dead until the news aggregator emits ticker tags — _store persists symbols=[],
        # so this branch matches no rows today. Unindexed jsonb-overlap filter; symbols are stored
        # uppercased, so no per-row normalization. Add a default-jsonb_ops GIN if volume grows.
        symbol_stmt = (
            select(NewsArticle)
            .where(
                text(
                    "EXISTS (SELECT 1 FROM jsonb_array_elements_text(news_article.symbols::jsonb) s "
                    "WHERE s = ANY(:syms))"
                )
            )
            .params(syms=symbols)
            .order_by(NewsArticle.published_at.desc().nullslast())
            .limit(limit)
        )
        for article in (await session.execute(symbol_stmt)).scalars():
            found[article.id] = article

    if query_embedding is not None and embedding_model is not None:
        semantic_stmt = (
            select(NewsArticle)
            .where(
                NewsArticle.embedding_model == embedding_model,
                NewsArticle.embedding_dim == len(query_embedding),
                NewsArticle.embedding.cosine_distance(query_embedding) <= MAX_NEWS_COSINE_DISTANCE,
            )
            .order_by(NewsArticle.embedding.cosine_distance(query_embedding))
            .limit(limit)
        )
        for article in (await session.execute(semantic_stmt)).scalars():
            found.setdefault(article.id, article)

    ordered = sorted(found.values(), key=lambda a: a.published_at or a.created_at, reverse=True)
    return ordered[:limit]
