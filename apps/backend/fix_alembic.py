import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Cargar variables de entorno
load_dotenv()

# Crear engine directamente
user = os.getenv("POSTGRES_USER", "postgres")
pw = os.getenv("POSTGRES_PASSWORD", "")
host = os.getenv("POSTGRES_SERVER", "localhost")
db = os.getenv("POSTGRES_DB", "chronic_covid19")
database_url = f"postgresql+psycopg2://{user}:{pw}@{host}:5432/{db}"

engine = create_engine(database_url)

print(f"🔗 Conectando a: {database_url.replace(pw, '***')}")

with engine.connect() as conn:
    try:
        # Ver qué migraciones están registradas
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        existing = [row[0] for row in result]
        print(f"\n📋 Migraciones registradas actualmente: {existing}")

        # LIMPIAR TODAS las migraciones registradas
        conn.execute(text("DELETE FROM alembic_version"))
        print("\n🧹 Todas las migraciones eliminadas de la BD")

        # Marcar SOLO la última migración antes de la nueva
        # f010e78ee8f4 es la última migración que ya está aplicada físicamente
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('f010e78ee8f4')"))
        print("✅ Marcada como HEAD: f010e78ee8f4")

        conn.commit()

        # Ver estado final
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        print("\n📋 Migraciones después de limpiar:")
        for row in result:
            print(f"  - {row[0]}")

        print("\n🎯 Ahora ejecuta: alembic upgrade head")
        print("   Esto aplicará solo la migración a6bd03f75272 que renombra las columnas")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()