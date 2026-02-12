"""add_direccion_telefono_to_hospitales

Revision ID: 037a57260d1a
Revises: e4ede7603ed8
Create Date: 2025-11-20 19:20:52.953319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '037a57260d1a'
down_revision: Union[str, Sequence[str], None] = 'e4ede7603ed8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Agregar las nuevas columnas
    op.add_column('hospitales', sa.Column('direccion', sa.String(), nullable=True))
    op.add_column('hospitales', sa.Column('telefono', sa.String(), nullable=True))


def downgrade():
    # Remover las columnas si se hace rollback
    op.drop_column('hospitales', 'telefono')
    op.drop_column('hospitales', 'direccion')