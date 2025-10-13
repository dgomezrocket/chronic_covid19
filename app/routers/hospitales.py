from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.db import SessionLocal
from app.models.models import Hospital
from app.schemas.schemas import HospitalOut
from typing import List
import csv, io

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/nearby", response_model=List[HospitalOut])
def get_hospitales_cercanos(lat: float = Query(...), lon: float = Query(...), radio: float = Query(5.0), db: Session = Depends(get_db)):
    hospitales = db.query(Hospital).all()
    cercanos = []
    for h in hospitales:
        if h.latitud and h.longitud:
            distancia = ((h.latitud - lat)**2 + (h.longitud - lon)**2)**0.5
            if distancia <= radio:
                cercanos.append(h)
    return cercanos

@router.post("/import")
def importar_hospitales(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    count = 0
    for row in reader:
        hospital = Hospital(
            nombre=row.get("nombre"),
            codigo=row.get("codigo"),
            distrito=row.get("distrito"),
            provincia=row.get("provincia"),
            latitud=float(row.get("latitud", 0)),
            longitud=float(row.get("longitud", 0))
        )
        db.add(hospital)
        count += 1
    db.commit()
    return {"importados": count}

