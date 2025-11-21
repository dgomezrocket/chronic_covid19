from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.db import get_db
from app.models.models import Hospital
from app.schemas.schemas import HospitalCreate, HospitalUpdate, HospitalOut
from app.core.security import get_current_user
import csv
import io

router = APIRouter()


@router.get("/", response_model=List[HospitalOut])
def get_all_hospitales(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    nombre: Optional[str] = None,
    departamento: Optional[str] = None,
    ciudad: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtiene todos los hospitales con filtros opcionales (público)"""
    query = db.query(Hospital)
    
    # Aplicar filtros si existen
    if nombre:
        query = query.filter(Hospital.nombre.ilike(f"%{nombre}%"))
    if departamento:
        query = query.filter(Hospital.departamento.ilike(f"%{departamento}%"))
    if ciudad:
        query = query.filter(Hospital.ciudad.ilike(f"%{ciudad}%"))
    
    hospitales = query.offset(skip).limit(limit).all()
    return hospitales


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital_by_id(
    hospital_id: int,
    db: Session = Depends(get_db)
):
    """Obtiene un hospital por ID (público)"""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )
    
    return hospital


@router.get("/nearby", response_model=List[HospitalOut])
def get_hospitales_cercanos(
    lat: float = Query(...),
    lon: float = Query(...),
    radio: float = Query(5.0),
    db: Session = Depends(get_db)
):
    """Obtiene hospitales cercanos a una ubicación (público)"""
    hospitales = db.query(Hospital).all()
    cercanos = []
    
    for h in hospitales:
        if h.latitud and h.longitud:
            # Cálculo simple de distancia (no es exacto pero funciona para distancias cortas)
            distancia = ((h.latitud - lat)**2 + (h.longitud - lon)**2)**0.5
            if distancia <= radio:
                cercanos.append(h)
    
    return cercanos


@router.post("/", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(
    hospital: HospitalCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Crea un nuevo hospital (solo admin)"""
    # ✅ Validar que sea admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden crear hospitales"
        )

    # Verificar si ya existe un hospital con ese código
    if hospital.codigo:
        existing = db.query(Hospital).filter(Hospital.codigo == hospital.codigo).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un hospital con ese código"
            )
    
    # Crear el hospital
    nuevo_hospital = Hospital(
        nombre=hospital.nombre,
        codigo=hospital.codigo,
        ciudad=hospital.ciudad,
        departamento=hospital.departamento,
        barrio=hospital.barrio,
        direccion=hospital.direccion,
        telefono=hospital.telefono,
        latitud=hospital.latitud,
        longitud=hospital.longitud
    )
    
    db.add(nuevo_hospital)
    db.commit()
    db.refresh(nuevo_hospital)
    
    return nuevo_hospital


@router.put("/{hospital_id}", response_model=HospitalOut)
def update_hospital(
    hospital_id: int,
    hospital_update: HospitalUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Actualiza un hospital (solo admin)"""
    # ✅ Validar que sea admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden actualizar hospitales"
        )

    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()

    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )
    
    # Verificar código duplicado si se está cambiando
    update_data = hospital_update.model_dump(exclude_unset=True)
    if "codigo" in update_data and update_data["codigo"] != hospital.codigo:
        existing = db.query(Hospital).filter(
            Hospital.codigo == update_data["codigo"]
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un hospital con ese código"
            )
    
    # Actualizar campos
    for field, value in update_data.items():
        setattr(hospital, field, value)
    
    db.commit()
    db.refresh(hospital)
    
    return hospital


@router.delete("/{hospital_id}", status_code=status.HTTP_200_OK)
def delete_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Elimina un hospital (solo admin)"""
    # ✅ Validar que sea admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden eliminar hospitales"
        )

    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()

    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital no encontrado"
        )
    
    # Verificar si hay médicos asignados a este hospital
    if hospital.medicos and len(hospital.medicos) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el hospital porque tiene {len(hospital.medicos)} médico(s) asignado(s)"
        )
    
    db.delete(hospital)
    db.commit()
    
    return {"message": "Hospital eliminado exitosamente", "id": hospital_id}


@router.post("/import")
def importar_hospitales(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Importa hospitales desde un archivo CSV (solo admin)"""
    # ✅ Validar que sea admin
    if current_user["rol"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden importar hospitales"
        )

    try:
        content = file.file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))
        count = 0
        errors = []

        for idx, row in enumerate(reader, start=2):  # start=2 porque la línea 1 es el header
            try:
                # Validar que tenga al menos nombre
                if not row.get("nombre"):
                    errors.append(f"Línea {idx}: Falta el campo 'nombre'")
                    continue
                
                hospital = Hospital(
                    nombre=row.get("nombre"),
                    codigo=row.get("codigo") or None,
                    ciudad=row.get("ciudad") or row.get("distrito"),  # compatibilidad con campo antiguo
                    departamento=row.get("departamento") or row.get("provincia"),  # compatibilidad
                    barrio=row.get("barrio") or None,
                    direccion=row.get("direccion") or None,
                    telefono=row.get("telefono") or None,
                    latitud=float(row.get("latitud", 0)) if row.get("latitud") else None,
                    longitud=float(row.get("longitud", 0)) if row.get("longitud") else None
                )
                db.add(hospital)
                count += 1
            except Exception as e:
                errors.append(f"Línea {idx}: {str(e)}")
        
        db.commit()
        
        return {
            "importados": count,
            "errores": errors if errors else None,
            "total_errores": len(errors)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar el archivo: {str(e)}"
        )

