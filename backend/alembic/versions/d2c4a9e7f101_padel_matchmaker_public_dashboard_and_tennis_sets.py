"""Padel matchmaker public dashboard + tennis sets

Revision ID: d2c4a9e7f101
Revises: b7e8f9a1c2d3
Create Date: 2026-05-06

"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str | None = "d2c4a9e7f101"
down_revision: str | None = "b7e8f9a1c2d3"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "padel_matches",
        sa.Column("dashboard_public", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column("padel_matches", sa.Column("dashboard_endpoint", sa.Text(), nullable=True))
    op.create_index(
        "ix_padel_matches_dashboard_endpoint",
        "padel_matches",
        ["dashboard_endpoint"],
        unique=True,
    )

    op.add_column(
        "padel_match_games",
        sa.Column("sets_json", JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("padel_match_games", "sets_json")

    op.drop_index("ix_padel_matches_dashboard_endpoint", table_name="padel_matches")
    op.drop_column("padel_matches", "dashboard_endpoint")
    op.drop_column("padel_matches", "dashboard_public")

