"""Export the FastAPI OpenAPI schema to a JSON file."""

import json
import sys
from pathlib import Path

# Add services/api and repo root to path so app and contracts can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "services" / "api"))

from app.main import app


def export_schema(output_path: Path) -> None:
    schema = app.openapi()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)
    print(f"Exported OpenAPI schema to {output_path}")


if __name__ == "__main__":
    target = Path(__file__).parent.parent / "contracts" / "openapi.json"
    export_schema(target)
