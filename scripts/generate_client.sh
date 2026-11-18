#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Exporting OpenAPI schema..."
python3 "${ROOT_DIR}/scripts/export_openapi.py"

echo "==> Generating TypeScript types..."
mkdir -p "${ROOT_DIR}/apps/web/src/api/generated"
(cd "${ROOT_DIR}/apps/web" && npx openapi-typescript "${ROOT_DIR}/contracts/openapi.json" -o "${ROOT_DIR}/apps/web/src/api/generated/schema.ts")

echo "==> API client types generated successfully."
