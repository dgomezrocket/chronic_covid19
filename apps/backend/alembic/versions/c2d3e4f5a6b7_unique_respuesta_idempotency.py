"""unique (asignacion_id, idempotency_key) en respuestas_formularios

Revision ID: c2d3e4f5a6b7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-02 00:00:00.000000

Última línea de defensa contra los reenvíos del transporte. El endpoint ya serializa dos
envíos concurrentes con `with_for_update()`, pero esa garantía vive solo en el código: si
el lock alguna vez no alcanza (un dialecto que ignore el FOR UPDATE, una réplica, un
refactor futuro), la base rechaza el segundo INSERT y el router lo convierte en la
respuesta idempotente en vez de duplicar la respuesta del paciente.

Seguro sobre los datos existentes: Postgres considera los NULL distintos entre sí en una
constraint UNIQUE, así que las filas históricas (`idempotency_key IS NULL`) no chocan
aunque haya más de una por asignación.

NO se agrega UNIQUE(asignacion_id): si en producción quedó alguna asignación con dos
respuestas de antes de la guarda "no se puede responder dos veces", crear esa constraint
haría fallar `alembic upgrade head` y el contenedor entraría en crash-loop. Esa garantía
la siguen dando `with_for_update()` + el chequeo de estado del endpoint.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint(
        'uq_respuestas_asignacion_idempotency',
        'respuestas_formularios',
        ['asignacion_id', 'idempotency_key'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'uq_respuestas_asignacion_idempotency',
        'respuestas_formularios',
        type_='unique',
    )
