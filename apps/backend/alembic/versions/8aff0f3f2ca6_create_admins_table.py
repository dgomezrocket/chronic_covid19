"""create_admins_table

Revision ID: 8aff0f3f2ca6
Revises: a6bd03f75272
Create Date: 2025-11-13 13:57:31.664195

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '8aff0f3f2ca6'
down_revision = 'a6bd03f75272'
branch_labels = None
depends_on = None


def upgrade():
    # Usar el tipo ENUM existente 'rolenum' en lugar de crearlo de nuevo
    rolenum = postgresql.ENUM('paciente', 'medico', 'coordinador', 'admin', name='rolenum', create_type=False)

    # Crear tabla admins
    op.create_table(
        'admins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('documento', sa.String(), nullable=False),
        sa.Column('nombre', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('telefono', sa.String(), nullable=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('rol', rolenum, nullable=False),
        sa.Column('activo', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )

    # Crear índices
    op.create_index(op.f('ix_admins_id'), 'admins', ['id'], unique=False)
    op.create_index(op.f('ix_admins_documento'), 'admins', ['documento'], unique=True)
    op.create_index(op.f('ix_admins_email'), 'admins', ['email'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_admins_email'), table_name='admins')
    op.drop_index(op.f('ix_admins_documento'), table_name='admins')
    op.drop_index(op.f('ix_admins_id'), table_name='admins')
    op.drop_table('admins')