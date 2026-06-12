---
paths:
  - "**/*.py"
---
# Python Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Python-specific content.

## Formatting

Enforced by ruff — do not manually fix formatting or linting errors, run the toolchain instead:

| Tool | Purpose | Check | Fix |
|------|---------|-------|-----|
| ruff format | Code formatting | `uv run ruff format --check .` | `uv run ruff format .` |
| ruff check | Linting | `uv run ruff check .` | `uv run ruff check --fix .` |

- **Indent:** 4 spaces
- **Max line length:** 120 characters

## Type Hints

Always annotate function signatures — parameters and return types:

```python
# GOOD
def get_user(user_id: int) -> User:
    ...

async def fetch_items(query: str) -> list[Item]:
    ...

# BAD — unannotated
def get_user(user_id):
    ...
```

Use `pydantic.BaseModel` for all data structures that cross a boundary (request body, response, config).

## Naming

Follow PEP 8:
- `snake_case` for functions, methods, variables, modules
- `PascalCase` for classes
- `UPPER_SNAKE_CASE` for module-level constants
- `_private` prefix for implementation details not part of the public API

## Immutability

- Prefer `pydantic` models (immutable by default) over plain dicts for structured data
- Use `tuple` over `list` for fixed-size collections
- Avoid mutating function arguments — return new values instead

## Modern Python

Use Python 3.13+ features:
- Built-in generics: `list[str]`, `dict[str, int]`, `tuple[int, ...]` — never `List`, `Dict` from `typing`
- `X | None` over `Optional[X]`
- `match` statements for exhaustive case handling
