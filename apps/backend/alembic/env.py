# alembic/env.py

import sys
import os
from dotenv import load_dotenv

# Agregar el directorio raíz del proyecto al sys.path
# El archivo env.py está en apps/backend/alembic/env.py
# Necesitamos ir dos niveles arriba para llegar a la raíz del proyecto
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, project_root)

# También agregar apps/backend para que funcionen las importaciones tipo "from app..."
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_root)

from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Importa tu Base para autogenerar migraciones
from app.db.db import Base

# Importar todos los modelos para que Alembic los detecte
# Nota: Importamos directamente models.py, no el __init__.py
from app.models import models  # noqa: F401

target_metadata = Base.metadata

# Cargar variables del archivo .env
# Buscar el archivo .env en el directorio backend
env_path = os.path.join(backend_root, '.env')
load_dotenv(env_path)

# Alembic Config
config = context.config

# Configurar la URL de conexión usando variables de entorno
pg_user = os.environ.get("POSTGRES_USER")
pg_password = os.environ.get("POSTGRES_PASSWORD")
pg_server = os.environ.get("POSTGRES_SERVER")
pg_db = os.environ.get("POSTGRES_DB")
url = f"postgresql://{pg_user}:{pg_password}@{pg_server}/{pg_db}"
config.set_main_option("sqlalchemy.url", url)

# Configura logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()