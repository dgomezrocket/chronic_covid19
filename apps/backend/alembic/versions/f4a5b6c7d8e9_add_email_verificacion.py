"""add email_verificado a pacientes/medicos y tabla email_verification_tokens (F04)

Revision ID: f4a5b6c7d8e9
Revises: e3a4b5c6d7e8
Create Date: 2026-08-24 00:00:00.000000

Las columnas se agregan con server_default 'true' A PROPÓSITO: así las cuentas que ya
existen en producción quedan verificadas y siguen pudiendo iniciar sesión. Solo el
auto-registro público crea cuentas con email_verificado = False.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a5b6c7d8e9'
down_revision: Union[str, Sequence[str], None] = 'e3a4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Cuentas existentes -> verificadas (no bloquear a nadie que ya usaba el sistema).
    op.add_column(
        'pacientes',
        sa.Column(
            'email_verificado',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('true'),
        ),
    )
    op.add_column(
        'medicos',
        sa.Column(
            'email_verificado',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('true'),
        ),
    )

    op.create_table(
        'email_verification_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('rol', sa.String(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_email_verification_tokens_id'), 'email_verification_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_email_verification_tokens_token_hash'), 'email_verification_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_email_verification_tokens_email'), 'email_verification_tokens', ['email'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_email_verification_tokens_email'), table_name='email_verification_tokens')
    op.drop_index(op.f('ix_email_verification_tokens_token_hash'), table_name='email_verification_tokens')
    op.drop_index(op.f('ix_email_verification_tokens_id'), table_name='email_verification_tokens')
    op.drop_table('email_verification_tokens')
    op.drop_column('medicos', 'email_verificado')
    op.drop_column('pacientes', 'email_verificado')
