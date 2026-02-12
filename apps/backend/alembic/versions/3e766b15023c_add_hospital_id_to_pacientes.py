"""add hospital_id to pacientes

Revision ID: 3e766b15023c
Revises: 8aff0f3f2ca6
Create Date: 2025-11-18 23:25:44.428006

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '3e766b15023c'
down_revision = '8aff0f3f2ca6'  # 🔧 Cambiar por el último revision ID que tengas
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Agregar columna hospital_id a la tabla pacientes"""

    # Agregar columna hospital_id
    op.add_column(
        'pacientes',
        sa.Column('hospital_id', sa.Integer(), nullable=True)
    )

    # Crear foreign key constraint
    op.create_foreign_key(
        'fk_pacientes_hospital_id',
        'pacientes',
        'hospitales',
        ['hospital_id'],
        ['id'],
        ondelete='SET NULL'  # Si se elimina el hospital, el paciente queda sin hospital
    )

    # Crear índice para mejorar performance en queries
    op.create_index(
        'ix_pacientes_hospital_id',
        'pacientes',
        ['hospital_id']
    )


def downgrade() -> None:
    """Revertir cambios"""

    # Eliminar índice
    op.drop_index('ix_pacientes_hospital_id', table_name='pacientes')

    # Eliminar foreign key
    op.drop_constraint('fk_pacientes_hospital_id', 'pacientes', type_='foreignkey')

    # Eliminar columna
    op.drop_column('pacientes', 'hospital_id')