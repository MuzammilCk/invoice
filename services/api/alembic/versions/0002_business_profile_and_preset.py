"""Add business_profile and presets tables (BP 3.2, 3.4).

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "presets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspace.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False, server_default="Default"),
        sa.Column("design_id", sa.String(50), nullable=False, server_default="design1"),
        sa.Column("columns", sa.JSON(), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "business_profile",
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspace.id"), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address_lines", sa.JSON(), nullable=False),
        sa.Column("phones", sa.JSON(), nullable=False),
        sa.Column("footer", sa.Text(), nullable=False, server_default=""),
        sa.Column("currency", sa.String(10), nullable=False, server_default="₹"),
        sa.Column("date_format", sa.String(50), nullable=False, server_default="DD MMMM YYYY"),
        sa.Column("default_preset_id", sa.String(36), sa.ForeignKey("presets.id"), nullable=True),
        sa.Column("pin_hash", sa.Text(), nullable=True),
        sa.Column("help_improve_voice", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("business_profile")
    op.drop_table("presets")
