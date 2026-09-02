"""decodificar los textos de formularios guardados con escapes literales

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f7
Create Date: 2026-09-01 22:30:00.000000

Los textos de algunos formularios quedaron guardados con los escapes Unicode como
caracteres literales, así que el paciente veía la pregunta
'\\u00bfC\\u00f3mo se ha sentido en las \\u00faltimas 24 horas?' en lugar de
'¿Cómo se ha sentido en las últimas 24 horas?'.

No lo produce el código actual: `POST /formularios/` escribe `preguntas` tal como llega y
el schema la declara `List[dict]` sin validar el contenido, así que un payload que ya venía
codificado entró sin resistencia. La interfaz lo viene tapando al renderizar (hay varias
copias de un decodificador en la web y `normalizarTextoVisible` en el móvil); esta
migración es la contraparte de datos, para que los formularios queden legibles en la base
y no dependan de ese parche.

Alcance deliberadamente acotado a `formularios` (`titulo`, `descripcion` y los textos
dentro del JSON `preguntas`). No toca `respuestas_formularios.respuestas` ni los nombres
de pacientes: son datos escritos por usuarios, quedan cubiertos por la normalización en
pantalla y no vale el riesgo de reescribirlos acá.

Es idempotente: solo actualiza las filas cuyo valor efectivamente cambia, así que correrla
de nuevo no hace nada.
"""
import json
import re
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Mismas reglas que `normalizarTextoVisible` (apps/mobile/src/lib/text.ts): un set acotado
# de entidades nombradas que aparecen de forma realista en textos en español, no todo HTML.
# La función se replica acá en vez de importarse de la app: una migración tiene que seguir
# corriendo igual cuando el código de la app cambie.
ENTIDADES = {
    'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': ' ',
    'iquest': '¿', 'iexcl': '¡',
    'aacute': 'á', 'eacute': 'é', 'iacute': 'í', 'oacute': 'ó', 'uacute': 'ú',
    'ntilde': 'ñ', 'uuml': 'ü',
    'Aacute': 'Á', 'Eacute': 'É', 'Iacute': 'Í', 'Oacute': 'Ó', 'Uacute': 'Ú',
    'Ntilde': 'Ñ', 'Uuml': 'Ü',
}

# Claves de una pregunta cuyo valor es texto que se le muestra al paciente. El `id` y el
# `type` quedan afuera a propósito: son identificadores, no texto visible.
CLAVES_TEXTO = ('label', 'placeholder')

RE_UNICODE = re.compile(r'\\u([0-9a-fA-F]{4})')
RE_ENT_HEX = re.compile(r'&#x([0-9a-fA-F]+);')
RE_ENT_DEC = re.compile(r'&#(\d+);')
RE_ENT_NOMBRE = re.compile(r'&([a-zA-Z]+);')


def _decodificar(texto: str) -> str:
    """Convierte a texto legible los escapes Unicode y las entidades HTML."""
    if '\\u' in texto:
        texto = RE_UNICODE.sub(lambda m: chr(int(m.group(1), 16)), texto)
    if '&' in texto:
        texto = RE_ENT_HEX.sub(lambda m: chr(int(m.group(1), 16)), texto)
        texto = RE_ENT_DEC.sub(lambda m: chr(int(m.group(1))), texto)
        # Las entidades desconocidas se dejan intactas.
        texto = RE_ENT_NOMBRE.sub(lambda m: ENTIDADES.get(m.group(1), m.group(0)), texto)
    return texto


def _normalizar_preguntas(preguntas: Any) -> Any:
    """Decodifica los textos visibles de cada pregunta, dejando el resto igual."""
    if not isinstance(preguntas, list):
        return preguntas

    resultado = []
    for pregunta in preguntas:
        if not isinstance(pregunta, dict):
            resultado.append(pregunta)
            continue

        nueva = dict(pregunta)
        for clave in CLAVES_TEXTO:
            if isinstance(nueva.get(clave), str):
                nueva[clave] = _decodificar(nueva[clave])
        # Las opciones son a la vez texto visible y valor guardado en las respuestas. Se
        # decodifican igual porque las respuestas históricas también están codificadas, así
        # que ambos lados se corrigen a la par.
        if isinstance(nueva.get('options'), list):
            nueva['options'] = [
                _decodificar(o) if isinstance(o, str) else o for o in nueva['options']
            ]
        resultado.append(nueva)
    return resultado


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # `preguntas` se vuelve a escribir como texto JSON con `ensure_ascii=False`, para que el
    # valor guardado quede legible también mirando la columna directamente. Postgres necesita
    # el cast explícito porque el parámetro viaja como texto y la columna es `json`; en SQLite
    # (que se usa en los tests) el JSON es texto y el cast a un tipo desconocido lo estropea.
    cast_json = "CAST(:preguntas AS json)" if conn.dialect.name == "postgresql" else ":preguntas"

    filas = conn.execute(sa.text(
        "SELECT id, titulo, descripcion, preguntas FROM formularios"
    )).fetchall()

    for fila in filas:
        cambios: dict[str, Any] = {}

        for columna in ('titulo', 'descripcion'):
            actual = getattr(fila, columna)
            if isinstance(actual, str):
                nuevo = _decodificar(actual)
                if nuevo != actual:
                    cambios[columna] = nuevo

        # Según el driver, una columna JSON puede llegar ya deserializada o como string.
        preguntas = fila.preguntas
        if isinstance(preguntas, str):
            try:
                preguntas = json.loads(preguntas)
            except ValueError:
                preguntas = None

        if preguntas is not None:
            nuevas = _normalizar_preguntas(preguntas)
            if nuevas != preguntas:
                cambios['preguntas'] = json.dumps(nuevas, ensure_ascii=False)

        if not cambios:
            continue

        asignaciones = ', '.join(
            f"{col} = {cast_json if col == 'preguntas' else f':{col}'}" for col in cambios
        )
        conn.execute(
            sa.text(f"UPDATE formularios SET {asignaciones} WHERE id = :id"),
            {**cambios, 'id': fila.id},
        )


def downgrade() -> None:
    """Downgrade schema."""
    # No hay vuelta atrás: volver a codificar perdería la distinción entre un texto que
    # estaba corrupto y uno que siempre estuvo bien. Los textos decodificados son válidos
    # para el código viejo (los decodificadores de la interfaz dejan intacto lo que no
    # tiene escapes), así que bajar de revisión no rompe nada.
    pass
