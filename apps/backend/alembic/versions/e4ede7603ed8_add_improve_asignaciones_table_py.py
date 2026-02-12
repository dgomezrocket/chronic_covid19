"""add improve_asignaciones_table.py

Revision ID: e4ede7603ed8
Revises: 3e766b15023c
Create Date: 2025-11-18 23:32:04.706860

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e4ede7603ed8'
down_revision = '3e766b15023c'  # 🔧 El revision ID de la migration anterior
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Mejorar la tabla asignaciones si ya existe, o crearla si no existe"""

    # Verificar si la tabla ya existe
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'asignaciones' not in tables:
        # ========== CASO 1: Tabla NO existe - Crearla desde cero ==========
        print("🔨 Creando tabla asignaciones desde cero...")

        op.create_table(
            'asignaciones',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('paciente_id', sa.Integer(), nullable=False),
            sa.Column('medico_id', sa.Integer(), nullable=False),
            sa.Column('fecha_asignacion', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notas', sa.String(), nullable=True),
            sa.Column('fecha_desactivacion', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['medico_id'], ['medicos.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['paciente_id'], ['pacientes.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        # Crear índices
        op.create_index('ix_asignaciones_paciente_id', 'asignaciones', ['paciente_id'])
        op.create_index('ix_asignaciones_medico_id', 'asignaciones', ['medico_id'])
        op.create_index('ix_asignaciones_activo', 'asignaciones', ['activo'])

        # Crear constraint único: un paciente solo puede tener UNA asignación activa
        try:
            op.create_index(
                'uq_asignacion_activa_por_paciente',
                'asignaciones',
                ['paciente_id'],
                unique=True,
                postgresql_where=sa.text('activo = true')
            )
        except Exception as e:
            print(f"⚠️ No se pudo crear índice único condicional: {e}")

    else:
        # ========== CASO 2: Tabla YA existe - Agregar columnas faltantes ==========
        print("🔧 Tabla asignaciones ya existe, agregando columnas faltantes...")

        existing_columns = [col['name'] for col in inspector.get_columns('asignaciones')]
        print(f"📋 Columnas existentes: {existing_columns}")

        # 🆕 AGREGAR COLUMNA 'activo' si no existe
        if 'activo' not in existing_columns:
            print("➕ Agregando columna 'activo'...")
            op.add_column('asignaciones', sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'))
        else:
            print("✅ Columna 'activo' ya existe")

        # 🆕 AGREGAR COLUMNA 'notas' si no existe
        if 'notas' not in existing_columns:
            print("➕ Agregando columna 'notas'...")
            op.add_column('asignaciones', sa.Column('notas', sa.String(), nullable=True))
        else:
            print("✅ Columna 'notas' ya existe")

        # 🆕 AGREGAR COLUMNA 'fecha_desactivacion' si no existe
        if 'fecha_desactivacion' not in existing_columns:
            print("➕ Agregando columna 'fecha_desactivacion'...")
            op.add_column('asignaciones', sa.Column('fecha_desactivacion', sa.DateTime(timezone=True), nullable=True))
        else:
            print("✅ Columna 'fecha_desactivacion' ya existe")

        # Crear índices si no existen
        existing_indexes = [idx['name'] for idx in inspector.get_indexes('asignaciones')]
        print(f"📋 Índices existentes: {existing_indexes}")

        # Índice en paciente_id
        if 'ix_asignaciones_paciente_id' not in existing_indexes:
            print("➕ Creando índice ix_asignaciones_paciente_id...")
            op.create_index('ix_asignaciones_paciente_id', 'asignaciones', ['paciente_id'])

        # Índice en medico_id
        if 'ix_asignaciones_medico_id' not in existing_indexes:
            print("➕ Creando índice ix_asignaciones_medico_id...")
            op.create_index('ix_asignaciones_medico_id', 'asignaciones', ['medico_id'])

        # Índice en activo (SOLO DESPUÉS de que la columna existe)
        if 'ix_asignaciones_activo' not in existing_indexes:
            print("➕ Creando índice ix_asignaciones_activo...")
            op.create_index('ix_asignaciones_activo', 'asignaciones', ['activo'])
        else:
            print("✅ Índice ix_asignaciones_activo ya existe")

        # Índice único condicional
        if 'uq_asignacion_activa_por_paciente' not in existing_indexes:
            try:
                print("➕ Creando índice único condicional uq_asignacion_activa_por_paciente...")
                op.create_index(
                    'uq_asignacion_activa_por_paciente',
                    'asignaciones',
                    ['paciente_id'],
                    unique=True,
                    postgresql_where=sa.text('activo = true')
                )
            except Exception as e:
                print(f"⚠️ No se pudo crear índice único condicional: {e}")
        else:
            print("✅ Índice único ya existe")


def downgrade() -> None:
    """Revertir cambios"""

    # Eliminar índice único
    try:
        op.drop_index('uq_asignacion_activa_por_paciente', table_name='asignaciones')
        print("🗑️ Índice único eliminado")
    except:
        pass

    # Eliminar otros índices
    try:
        op.drop_index('ix_asignaciones_activo', table_name='asignaciones')
        print("🗑️ Índice activo eliminado")
    except:
        pass

    try:
        op.drop_index('ix_asignaciones_medico_id', table_name='asignaciones')
    except:
        pass

    try:
        op.drop_index('ix_asignaciones_paciente_id', table_name='asignaciones')
    except:
        pass

    # Eliminar columnas agregadas
    try:
        op.drop_column('asignaciones', 'fecha_desactivacion')
        print("🗑️ Columna fecha_desactivacion eliminada")
    except:
        pass

    try:
        op.drop_column('asignaciones', 'notas')
        print("🗑️ Columna notas eliminada")
    except:
        pass

    try:
        op.drop_column('asignaciones', 'activo')
        print("🗑️ Columna activo eliminada")
    except:
        pass

    # NO eliminamos la tabla completa para no perder datos
    print("✅ Downgrade completado (tabla asignaciones conservada)")