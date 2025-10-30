from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.db import SessionLocal
from app.models.models import Mensaje, RolEnum
from app.schemas.schemas import MensajeOut
from typing import List
from datetime import datetime
import json

router = APIRouter()

# REST: consulta histórica de mensajes
@router.get("/history/{paciente_id}", response_model=List[MensajeOut])
def get_chat_history(paciente_id: int, db: Session = Depends(lambda: SessionLocal())):
    mensajes = db.query(Mensaje).filter(Mensaje.paciente_id == paciente_id).order_by(Mensaje.timestamp).all()
    return mensajes

# WebSocket: chat médico-paciente
@router.websocket("/{paciente_id}/{medico_id}")
async def chat_ws(websocket: WebSocket, paciente_id: int, medico_id: int):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            # Guardar mensaje en la BD
            db = SessionLocal()
            mensaje = Mensaje(
                remitente_id=msg["remitente_id"],
                remitente_rol=RolEnum(msg["remitente_rol"]),
                destinatario_id=msg["destinatario_id"],
                destinatario_rol=RolEnum(msg["destinatario_rol"]),
                contenido=msg["contenido"],
                timestamp=datetime.utcnow(),
                paciente_id=paciente_id,
                medico_id=medico_id
            )
            db.add(mensaje)
            db.commit()
            db.refresh(mensaje)
            db.close()
            await websocket.send_text(json.dumps({"id": mensaje.id, "contenido": mensaje.contenido, "timestamp": str(mensaje.timestamp)}))
    except WebSocketDisconnect:
        await websocket.close()

