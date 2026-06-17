"""Export the FastAPI OpenAPI spec to a committed file.

Mirrors the core service's `generateOpenApiDocs` task: the spec is generated from
code (FastAPI's `app.openapi()`) and written to `docs/openapi.json`, which the
client consumes to generate TypeScript interfaces.
"""

import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "docs" / "openapi.json"


def main() -> None:
    from .main import app

    spec = app.openapi()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(spec, indent=2) + "\n")


if __name__ == "__main__":
    main()
