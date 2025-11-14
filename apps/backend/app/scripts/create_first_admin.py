"""
Script para crear el primer administrador del sistema
Ejecutar con: python -m app.scripts.create_first_admin
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Agregar el directorio raíz al path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

# Cargar variables de entorno
env_path = backend_dir / '.env'
load_dotenv(env_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.models.models import Admin, RolEnum
from app.core.security import get_password_hash
from datetime import datetime


def get_database_url():
    """Obtiene la URL de conexión a la base de datos desde las variables de entorno"""
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "")
    host = os.getenv("POSTGRES_SERVER", "localhost")
    db = os.getenv("POSTGRES_DB", "chronic_covid19")

    return f"postgresql://{user}:{password}@{host}:5432/{db}"


def create_first_admin():
    """Crea el primer administrador del sistema"""

    print("🔗 Conectando a la base de datos...")

    # Crear engine y sesión
    database_url = get_database_url()
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db: Session = SessionLocal()

    try:
        # Verificar si ya existe un admin
        print("🔍 Verificando administradores existentes...")
        existing_admin = db.query(Admin).first()
        if existing_admin:
            print("\n❌ Ya existe al menos un administrador en el sistema.")
            print(f"   Admin existente: {existing_admin.nombre} ({existing_admin.email})")
            print("\n💡 Si necesitas crear otro admin, usa la API una vez iniciado sesión.")
            return

        print("✅ No se encontraron administradores. Procediendo con la creación...")

        # Datos del primer admin
        print("\n🔐 Creando primer administrador del sistema...")
        print("\n📝 Ingresa los datos del administrador:")

        nombre = input("Nombre completo: ").strip()
        if not nombre:
            print("❌ El nombre no puede estar vacío")
            return

        email = input("Email: ").strip().lower()
        if not email or '@' not in email:
            print("❌ Email inválido")
            return

        documento = input("Documento de identidad: ").strip()
        if not documento:
            print("❌ El documento no puede estar vacío")
            return

        telefono = input("Teléfono (opcional, presiona Enter para omitir): ").strip() or None

        password = input("Contraseña: ").strip()
        if len(password) < 6:
            print("❌ La contraseña debe tener al menos 6 caracteres")
            return

        password_confirm = input("Confirmar contraseña: ").strip()
        if password != password_confirm:
            print("❌ Las contraseñas no coinciden")
            return

        print("\n⏳ Creando administrador...")

        # Crear el admin
        admin = Admin(
            nombre=nombre,
            email=email,
            documento=documento,
            telefono=telefono,
            hashed_password=get_password_hash(password),
            rol=RolEnum.admin,
            activo=1,
            fecha_creacion=datetime.utcnow()
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("\n✅ ¡Administrador creado exitosamente!")
        print(f"\n📋 Datos del administrador:")
        print(f"   ID: {admin.id}")
        print(f"   Nombre: {admin.nombre}")
        print(f"   Email: {admin.email}")
        print(f"   Documento: {admin.documento}")
        print(f"   Rol: {admin.rol.value}")
        print(f"\n🔑 Puedes iniciar sesión con:")
        print(f"   Usuario: {admin.email}")
        print(f"   Contraseña: (la que ingresaste)")
        print(f"\n🌐 URL de login: http://localhost:3000/login")

    except Exception as e:
        print(f"\n❌ Error al crear administrador: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    print("=" * 60)
    print("   CREAR PRIMER ADMINISTRADOR - Sistema PINV20-292")
    print("=" * 60)
    print()

    try:
        create_first_admin()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operación cancelada por el usuario")
    except Exception as e:
        print(f"\n\n❌ Error inesperado: {e}")
        import traceback

        traceback.print_exc()

    print("\n" + "=" * 60)