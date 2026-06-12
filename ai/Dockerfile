# syntax=docker/dockerfile:1

FROM ghcr.io/astral-sh/uv:python3.14-alpine AS build

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY advisor/ ./advisor/
RUN uv sync --frozen --no-dev

FROM python:3.14-alpine

WORKDIR /app

RUN apk add --no-cache wget && \
    addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/.venv ./.venv
COPY --from=build --chown=app:app /app/advisor ./advisor

USER app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "advisor.main:app", "--host", "0.0.0.0", "--port", "8000"]
