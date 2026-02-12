"""rename_hospital_columns_provincia_to_departamento

Revision ID: a6bd03f75272
Revises: f010e78ee8f4
Create Date: 2025-01-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a6bd03f75272'
down_revision = 'f010e78ee8f4'
branch_labels = None
depends_on = None


def upgrade():
    # Renombrar provincia -> departamento
    op.alter_column('hospitales', 'provincia', new_column_name='departamento')

    # Renombrar distrito -> ciudad
    op.alter_column('hospitales', 'distrito', new_column_name='ciudad')

    # Agregar la nueva columna barrio
    op.add_column('hospitales', sa.Column('barrio', sa.String(), nullable=True))


def downgrade():
    # Revertir los cambios
    op.drop_column('hospitales', 'barrio')
    op.alter_column('hospitales', 'ciudad', new_column_name='distrito')
    op.alter_column('hospitales', 'departamento', new_column_name='provincia')