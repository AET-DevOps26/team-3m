---
paths:
  - "**/*.py"
---
# Python Testing

> This file extends [common/testing.md](../common/testing.md) with Python-specific content.

## Test Framework

- **pytest** with `asyncio_mode = "auto"` (configured in `pyproject.toml`)
- **httpx `AsyncClient`** with `ASGITransport` for FastAPI endpoint tests — no running server needed
- **pytest fixtures** for shared setup

## FastAPI Endpoint Tests

```python
import pytest
from httpx import ASGITransport, AsyncClient
from ai.main import app

@pytest.fixture
def transport() -> ASGITransport:
    return ASGITransport(app=app)

async def test_liveness(transport: ASGITransport) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ai/health/liveness")
    assert response.status_code == 200
    assert response.json() == {"status": "up"}
```

## Test Organization

```text
tests/
  test_health.py       # one test file per router/module
  test_<feature>.py
```

## Running Tests

```bash
uv run pytest          # all tests
uv run pytest -v       # verbose
uv run pytest -x       # stop on first failure
```
