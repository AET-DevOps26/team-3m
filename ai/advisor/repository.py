from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Recommendation


async def save_recommendation(
    session: AsyncSession,
    *,
    user_id: str,
    recommendation: str,
    rationale: str,
    risk_tolerance: str | None,
) -> None:
    session.add(
        Recommendation(
            user_id=user_id,
            recommendation=recommendation,
            rationale=rationale,
            risk_tolerance=risk_tolerance,
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
