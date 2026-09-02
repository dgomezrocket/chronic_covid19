"""normalizar a minúsculas los emails de las tablas de usuarios

Revision ID: a1b2c3d4e5f7
Revises: f4a5b6c7d8e9
Create Date: 2026-09-01 21:00:00.000000

El email es la credencial de login. Hasta ahora el alta lo guardaba tal cual se tipeaba
y `/auth/login` lo comparaba de forma exacta, así que una cuenta creada como
'Juan@Gmail.com' devolvía 401 al escribirla en minúsculas, y `/auth/forgot-password`
—que pasaba el input a minúsculas antes de comparar— nunca la encontraba: respondía 200
sin generar token ni intentar enviar el correo.

El código ya busca sin distinguir mayúsculas, así que esta migración es la contraparte de
datos: deja todos los emails en su forma canónica para que los índices únicos y las
comparaciones directas vuelvan a ser confiables.

ABORTA SIN TOCAR NADA si detecta colisiones, porque las cuatro tablas tienen `email`
único y porque `/auth/login` recorre las tablas en orden y se queda con la primera
coincidencia (dos cuentas con el mismo email dejarían a la segunda inaccesible). En ese
caso hay que resolver los duplicados a mano y volver a correr la migración.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = 'f4a5b6c7d8e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Tablas de cuentas de usuario, en el mismo orden en que las recorre `/auth/login`.
TABLAS_USUARIOS = ('pacientes', 'medicos', 'coordinadores', 'admins')

# Tablas donde el email es solo una referencia (no hay índice único), pero conviene
# normalizar para que los tokens vivos sigan cruzando con la cuenta.
TABLAS_TOKENS = ('password_reset_tokens', 'email_verification_tokens')


def _colisiones_dentro_de_tabla(conn, tabla: str) -> list[str]:
    """Emails que colapsarían entre sí al pasar a minúsculas dentro de la misma tabla."""
    filas = conn.execute(sa.text(
        f"SELECT lower(email) AS e, count(*) AS n FROM {tabla} "
        f"GROUP BY lower(email) HAVING count(*) > 1"
    )).fetchall()
    return [f"{tabla}: '{fila.e}' aparece {fila.n} veces" for fila in filas]


def _colisiones_entre_tablas(conn) -> list[str]:
    """El mismo email (ya normalizado) presente en dos tablas de cuentas distintas."""
    # El `::text` es necesario: sin él los literales quedan de tipo `unknown` y Postgres
    # no puede resolver `count(DISTINCT ...)` ni `string_agg` sobre ellos.
    union = " UNION ALL ".join(
        f"SELECT lower(email) AS e, '{t}'::text AS tabla FROM {t}" for t in TABLAS_USUARIOS
    )
    filas = conn.execute(sa.text(
        f"SELECT e, string_agg(DISTINCT tabla, ', ') AS tablas "
        f"FROM ({union}) AS todos GROUP BY e "
        f"HAVING count(DISTINCT tabla) > 1"
    )).fetchall()
    return [f"'{fila.e}' existe en varias tablas: {fila.tablas}" for fila in filas]


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    problemas: list[str] = []
    for tabla in TABLAS_USUARIOS:
        problemas.extend(_colisiones_dentro_de_tabla(conn, tabla))
    problemas.extend(_colisiones_entre_tablas(conn))

    if problemas:
        raise RuntimeError(
            "No se normalizaron los emails: hay cuentas que colisionarían al pasarlos a "
            "minúsculas. Resolvé estos casos a mano (unificando o cambiando el email de "
            "una de las cuentas) y volvé a correr la migración:\n  - "
            + "\n  - ".join(problemas)
        )

    for tabla in TABLAS_USUARIOS + TABLAS_TOKENS:
        conn.execute(sa.text(
            f"UPDATE {tabla} SET email = lower(trim(email)) WHERE email <> lower(trim(email))"
        ))


def downgrade() -> None:
    """Downgrade schema."""
    # No hay vuelta atrás: el casing original no se guarda en ningún lado. Volver a la
    # revisión anterior deja los emails en minúsculas, que es un estado válido para el
    # código viejo salvo para quien tuviera mayúsculas (que ya estaba roto de todos modos).
    pass
