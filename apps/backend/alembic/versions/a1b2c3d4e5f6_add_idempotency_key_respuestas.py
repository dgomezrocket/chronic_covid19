"""add idempotency_key a respuestas_formularios

Revision ID: a1b2c3d4e5f6
Revises: b7c8d9e0f1a2
Create Date: 2026-09-01 00:00:00.000000

Permite distinguir un REENVÍO del mismo intento (retry de red) de una respuesta nueva.
Sin esto, cuando el transporte reintentaba el POST el primer pedido ya había commiteado
`estado = 'completado'` y el reintento devolvía 400 "Ya respondiste este formulario.",
aunque el dato SÍ se había guardado.

Nullable y sin backfill a propósito: las filas viejas quedan en NULL y nunca matchean
con una clave entrante, que es exactamente el comportamiento deseado.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'respuestas_formularios',
        sa.Column('idempotency_key', sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f('ix_respuestas_formularios_idempotency_key'),
        'respuestas_formularios',
        ['idempotency_key'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_respuestas_formularios_idempotency_key'),
        table_name='respuestas_formularios',
    )
    op.drop_column('respuestas_formularios', 'idempotency_key')
