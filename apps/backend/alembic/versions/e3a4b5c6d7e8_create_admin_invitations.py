"""create admin_invitations table

Revision ID: e3a4b5c6d7e8
Revises: d2f3a4b5c6d7
Create Date: 2026-08-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3a4b5c6d7e8'
down_revision: Union[str, Sequence[str], None] = 'd2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'admin_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('invited_by_admin_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_admin_invitations_id'), 'admin_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_admin_invitations_email'), 'admin_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_admin_invitations_token_hash'), 'admin_invitations', ['token_hash'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_admin_invitations_token_hash'), table_name='admin_invitations')
    op.drop_index(op.f('ix_admin_invitations_email'), table_name='admin_invitations')
    op.drop_index(op.f('ix_admin_invitations_id'), table_name='admin_invitations')
    op.drop_table('admin_invitations')
