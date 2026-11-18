# Stage 1: Build Frontend
FROM node:22-alpine AS web-builder

WORKDIR /build/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web ./
COPY contracts /build/contracts
RUN npm run build

# Stage 2: Python Backend & Final Image
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    VTI_STATIC_DIR=/app/web/dist \
    VTI_DATABASE_URL=sqlite:////app/data/invoice.db

WORKDIR /app

# Install system dependencies (sqlite3 for backups)
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY services/api/pyproject.toml /app/services/api/
WORKDIR /app/services/api
RUN pip install --no-cache-dir .

# Copy application source
WORKDIR /app
COPY services/api /app/services/api
COPY contracts /app/contracts
COPY scripts /app/scripts

# Copy built frontend assets
COPY --from=web-builder /build/apps/web/dist /app/web/dist

# Ensure data directories exist
RUN mkdir -p /app/data/files /app/data/backups

EXPOSE 8000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
