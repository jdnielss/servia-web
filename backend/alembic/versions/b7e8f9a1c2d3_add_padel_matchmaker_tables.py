"""Add padel matchmaker tables

Revision ID: b7e8f9a1c2d3
Revises: c1ab44651e79
Create Date: 2026-05-05

"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from alembic import op

revision: str | None = "b7e8f9a1c2d3"
down_revision: str | None = "c1ab44651e79"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "padel_matches",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=False),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("created", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("match_type", sa.Text(), nullable=False),
        sa.Column("scoring_type", sa.Text(), nullable=False),
        sa.Column("points_per_match", sa.Integer(), nullable=False),
        sa.Column("courts", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column(
            "settings_json",
            JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_padel_matches_id"), "padel_matches", ["id"], unique=False)
    op.create_index(op.f("ix_padel_matches_user_id"), "padel_matches", ["user_id"], unique=False)

    op.create_table(
        "padel_match_players",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=False),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("padel_match_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["padel_match_id"], ["padel_matches.id"], ondelete="CASCADE"),
    )
    op.create_index(
        op.f("ix_padel_match_players_padel_match_id"),
        "padel_match_players",
        ["padel_match_id"],
        unique=False,
    )

    op.create_table(
        "padel_match_rounds",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=False),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("padel_match_id", sa.BigInteger(), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["padel_match_id"], ["padel_matches.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("padel_match_id", "round_number", name="uq_padel_match_round_number"),
    )
    op.create_index(
        op.f("ix_padel_match_rounds_padel_match_id"),
        "padel_match_rounds",
        ["padel_match_id"],
        unique=False,
    )

    op.create_table(
        "padel_match_games",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=False),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("round_id", sa.BigInteger(), nullable=False),
        sa.Column("court_index", sa.Integer(), nullable=False),
        sa.Column("court_name", sa.Text(), nullable=True),
        sa.Column("team1_player_ids", ARRAY(sa.BigInteger()), nullable=False),
        sa.Column("team2_player_ids", ARRAY(sa.BigInteger()), nullable=False),
        sa.Column("score1", sa.Integer(), nullable=True),
        sa.Column("score2", sa.Integer(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["round_id"], ["padel_match_rounds.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("round_id", "court_index", name="uq_padel_game_round_court"),
    )
    op.create_index(op.f("ix_padel_match_games_round_id"), "padel_match_games", ["round_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_padel_match_games_round_id"), table_name="padel_match_games")
    op.drop_table("padel_match_games")
    op.drop_index(op.f("ix_padel_match_rounds_padel_match_id"), table_name="padel_match_rounds")
    op.drop_table("padel_match_rounds")
    op.drop_index(op.f("ix_padel_match_players_padel_match_id"), table_name="padel_match_players")
    op.drop_table("padel_match_players")
    op.drop_index(op.f("ix_padel_matches_user_id"), table_name="padel_matches")
    op.drop_index(op.f("ix_padel_matches_id"), table_name="padel_matches")
    op.drop_table("padel_matches")
