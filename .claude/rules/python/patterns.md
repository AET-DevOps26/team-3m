---
paths:
  - "**/*.py"
---
# Python Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Python-specific content.

## Project Structure

```
ai/
  src/ai/
    main.py        # FastAPI app, router registration
    <domain>.py    # one module per feature/domain
  tests/
    test_<domain>.py
```

## FastAPI Conventions

- Define routes on an `APIRouter`, not directly on `app` — mount routers in `main.py` with a prefix
- Always declare `response_model` on route handlers
- Use `pydantic.BaseModel` for all request and response bodies

```python
# router in a domain module
from fastapi import APIRouter
from pydantic import BaseModel

class Item(BaseModel):
    id: int
    name: str

router = APIRouter()

@router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: int) -> Item:
    ...

# main.py — mount with prefix
from .items import router as items_router
app.include_router(items_router, prefix="/ai")
```

## Pydantic Models

- One model per concept — do not reuse request models as response models
- Use `model_config = ConfigDict(frozen=True)` for value objects that should not be mutated

```python
from pydantic import BaseModel, ConfigDict

class SearchQuery(BaseModel):
    model_config = ConfigDict(frozen=True)
    query: str
    limit: int = 20
```

## Environment & Configuration

Use `pydantic-settings` for environment-driven configuration:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    log_level: str = "INFO"

settings = Settings()
```

## Dependency Injection

Use FastAPI's `Depends` for shared resources (settings, clients, DB sessions):

```python
from fastapi import Depends
from functools import lru_cache

@lru_cache
def get_settings() -> Settings:
    return Settings()

@router.get("/items")
async def list_items(settings: Settings = Depends(get_settings)) -> list[Item]:
    ...
```

## uv Workflow

```bash
uv add <package>          # add runtime dependency
uv add --dev <package>    # add dev dependency
uv sync --frozen          # install from lockfile (CI / Docker)
uv run <command>          # run command in project venv
```
