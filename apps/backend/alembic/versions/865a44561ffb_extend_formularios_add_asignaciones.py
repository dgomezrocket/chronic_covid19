
"""extend_formularios_add_asignaciones

Revision ID: 865a44561ffb
Revises: 8e87c495bd52
Create Date: 2026-01-05 14:24:02.652545

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '865a44561ffb'
down_revision: Union[str, Sequence[str], None] = '8e87c495bd52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Crear tabla formulario_asignaciones
    op.create_table('formulario_asignaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('formulario_id', sa.Integer(), nullable=False),
        sa.Column('paciente_id', sa.Integer(), nullable=False),
        sa.Column('asignado_por', sa.Integer(), nullable=False),
        sa.Column('fecha_asignacion', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('fecha_expiracion', sa.DateTime(), nullable=True),
        sa.Column('fecha_completado', sa.DateTime(), nullable=True),
        sa.Column('numero_instancia', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('estado', sa.String(length=50), nullable=False, server_default='pendiente'),
        sa.Column('datos_extra', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['asignado_por'], ['medicos.id'], name='fk_form_asign_medico'),
        sa.ForeignKeyConstraint(['formulario_id'], ['formularios.id'], name='fk_form_asign_formulario'),
        sa.ForeignKeyConstraint(['paciente_id'], ['pacientes.id'], name='fk_form_asign_paciente'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_formulario_asignaciones_formulario_id'), 'formulario_asignaciones', ['formulario_id'], unique=False)
    op.create_index(op.f('ix_formulario_asignaciones_id'), 'formulario_asignaciones', ['id'], unique=False)
    op.create_index(op.f('ix_formulario_asignaciones_paciente_id'), 'formulario_asignaciones', ['paciente_id'], unique=False)
    op.create_index('ix_formulario_asignaciones_estado', 'formulario_asignaciones', ['estado'], unique=False)

    # 2. Agregar columnas a formularios (con server_default para datos existentes)
    op.add_column('formularios', sa.Column('titulo', sa.String(length=255), nullable=True))
    op.add_column('formularios', sa.Column('descripcion', sa.Text(), nullable=True))
    op.add_column('formularios', sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True))
    op.add_column('formularios', sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('formularios', sa.Column('meta', sa.JSON(), nullable=True))

    # 3. Agregar FK en respuestas_formularios
    op.add_column('respuestas_formularios', sa.Column('asignacion_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_respuestas_asignacion',
        'respuestas_formularios',
        'formulario_asignaciones',
        ['asignacion_id'],
        ['id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remover FK de respuestas_formularios
    op.drop_constraint('fk_respuestas_asignacion', 'respuestas_formularios', type_='foreignkey')
    op.drop_column('respuestas_formularios', 'asignacion_id')

    # Remover columnas de formularios
    op.drop_column('formularios', 'meta')
    op.drop_column('formularios', 'activo')
    op.drop_column('formularios', 'fecha_actualizacion')
    op.drop_column('formularios', 'descripcion')
    op.drop_column('formularios', 'titulo')

    # Eliminar tabla formulario_asignaciones
    op.drop_index('ix_formulario_asignaciones_estado', table_name='formulario_asignaciones')
    op.drop_index(op.f('ix_formulario_asignaciones_paciente_id'), table_name='formulario_asignaciones')
    op.drop_index(op.f('ix_formulario_asignaciones_id'), table_name='formulario_asignaciones')
    op.drop_index(op.f('ix_formulario_asignaciones_formulario_id'), table_name='formulario_asignaciones')
    op.drop_table('formulario_asignaciones')