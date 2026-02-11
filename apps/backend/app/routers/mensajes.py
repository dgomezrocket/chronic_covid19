from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.db.db import get_db
from app.models.models import Mensaje, Paciente, Medico, Asignacion, RolEnum
from app.schemas.schemas import MensajeOut
from app.core.security import get_current_user  # ← Cambio aquí: de auth a security
from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel
import json

router = APIRouter()

# ========== SCHEMAS ADICIONALES ==========

class MensajeCreateRequest(BaseModel):
    contenido: str
    paciente_id: int
    medico_id: int
    remitente_rol: str  # "paciente" o "medico"

class ConversacionOut(BaseModel):
    paciente_id: int
    paciente_nombre: str
    medico_id: int
    medico_nombre: str
    ultimo_mensaje: str
    ultimo_timestamp: datetime
    no_leidos: int

    class Config:
        from_attributes = True

class MensajeDetalleOut(BaseModel):
    id: int
    contenido: str
    paciente_id: int
    medico_id: int
    timestamp: datetime
    leido: int
    remitente_rol: str  # "paciente" o "medico"
    remitente_nombre: str

    class Config:
        from_attributes = True

# ========== GESTIÓN DE CONEXIONES WEBSOCKET ==========

class ConnectionManager:
    def __init__(self):
        # Diccionario de conexiones: {(paciente_id, medico_id): [websockets]}
        self.active_connections: Dict[tuple, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, paciente_id: int, medico_id: int):
        await websocket.accept()
        key = (paciente_id, medico_id)
        if key not in self.active_connections:
            self.active_connections[key] = []
        self.active_connections[key].append(websocket)
    
    def disconnect(self, websocket: WebSocket, paciente_id: int, medico_id: int):
        key = (paciente_id, medico_id)
        if key in self.active_connections:
            if websocket in self.active_connections[key]:
                self.active_connections[key].remove(websocket)
            if not self.active_connections[key]:
                del self.active_connections[key]
    
    async def broadcast_to_chat(self, paciente_id: int, medico_id: int, message: dict):
        key = (paciente_id, medico_id)
        if key in self.active_connections:
            for connection in self.active_connections[key]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# ========== ENDPOINTS REST ==========

@router.get("/conversaciones", response_model=List[ConversacionOut])
def get_mis_conversaciones(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene todas las conversaciones del usuario actual (médico o paciente)"""
    
    if current_user["rol"] == "medico":  # ← Cambio: usar diccionario
        # Para médicos: obtener conversaciones con sus pacientes asignados
        subquery = db.query(
            Mensaje.paciente_id,
            func.max(Mensaje.timestamp).label('max_timestamp')
        ).filter(
            Mensaje.medico_id == current_user["id"]  # ← Cambio
        ).group_by(Mensaje.paciente_id).subquery()
        
        conversaciones = []
        pacientes_con_mensajes = db.query(Mensaje.paciente_id).filter(
            Mensaje.medico_id == current_user["id"]  # ← Cambio
        ).distinct().all()
        
        for (paciente_id,) in pacientes_con_mensajes:
            paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
            if not paciente:
                continue
                
            ultimo_msg = db.query(Mensaje).filter(
                Mensaje.paciente_id == paciente_id,
                Mensaje.medico_id == current_user["id"]  # ← Cambio
            ).order_by(Mensaje.timestamp.desc()).first()
            
            no_leidos = db.query(func.count(Mensaje.id)).filter(
                Mensaje.paciente_id == paciente_id,
                Mensaje.medico_id == current_user["id"],  # ← Cambio
                Mensaje.leido == 0,
            ).scalar()
            
            conversaciones.append(ConversacionOut(
                paciente_id=paciente_id,
                paciente_nombre=paciente.nombre,
                medico_id=current_user["id"],  # ← Cambio
                medico_nombre=current_user["nombre"],  # ← Cambio
                ultimo_mensaje=ultimo_msg.contenido if ultimo_msg else "",
                ultimo_timestamp=ultimo_msg.timestamp if ultimo_msg else datetime.utcnow(),
                no_leidos=no_leidos
            ))
        
        # También agregar pacientes asignados sin mensajes
        asignaciones = db.query(Asignacion).filter(
            Asignacion.medico_id == current_user["id"],  # ← Cambio
            Asignacion.activo == True
        ).all()
        
        pacientes_con_chat = [c.paciente_id for c in conversaciones]
        for asig in asignaciones:
            if asig.paciente_id not in pacientes_con_chat:
                paciente = db.query(Paciente).filter(Paciente.id == asig.paciente_id).first()
                if paciente:
                    conversaciones.append(ConversacionOut(
                        paciente_id=asig.paciente_id,
                        paciente_nombre=paciente.nombre,
                        medico_id=current_user["id"],  # ← Cambio
                        medico_nombre=current_user["nombre"],  # ← Cambio
                        ultimo_mensaje="",
                        ultimo_timestamp=asig.fecha_asignacion,
                        no_leidos=0
                    ))
        
        return sorted(conversaciones, key=lambda x: x.ultimo_timestamp, reverse=True)
    
    elif current_user["rol"] == "paciente":  # ← Cambio
        # Para pacientes: obtener conversación con su médico asignado
        asignacion = db.query(Asignacion).filter(
            Asignacion.paciente_id == current_user["id"],  # ← Cambio
            Asignacion.activo == True
        ).first()
        
        if not asignacion:
            return []
        
        medico = db.query(Medico).filter(Medico.id == asignacion.medico_id).first()
        if not medico:
            return []
        
        ultimo_msg = db.query(Mensaje).filter(
            Mensaje.paciente_id == current_user["id"],  # ← Cambio
            Mensaje.medico_id == medico.id
        ).order_by(Mensaje.timestamp.desc()).first()
        
        no_leidos = db.query(func.count(Mensaje.id)).filter(
            Mensaje.paciente_id == current_user["id"],  # ← Cambio
            Mensaje.medico_id == medico.id,
            Mensaje.leido == 0
        ).scalar()
        
        return [ConversacionOut(
            paciente_id=current_user["id"],  # ← Cambio
            paciente_nombre=current_user["nombre"],  # ← Cambio
            medico_id=medico.id,
            medico_nombre=medico.nombre,
            ultimo_mensaje=ultimo_msg.contenido if ultimo_msg else "",
            ultimo_timestamp=ultimo_msg.timestamp if ultimo_msg else asignacion.fecha_asignacion,
            no_leidos=no_leidos
        )]
    
    return []

@router.get("/chat/{paciente_id}/{medico_id}", response_model=List[MensajeDetalleOut])
def get_chat_messages(
    paciente_id: int,
    medico_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene los mensajes de un chat específico"""
    
    # Verificar que el usuario tiene acceso a este chat
    if current_user["rol"] == "paciente" and current_user["id"] != paciente_id:  # ← Cambio
        raise HTTPException(status_code=403, detail="No tienes acceso a este chat")
    elif current_user["rol"] == "medico" and current_user["id"] != medico_id:  # ← Cambio
        raise HTTPException(status_code=403, detail="No tienes acceso a este chat")
    
    mensajes = db.query(Mensaje).filter(
        Mensaje.paciente_id == paciente_id,
        Mensaje.medico_id == medico_id
    ).order_by(Mensaje.timestamp.desc()).offset(skip).limit(limit).all()
    
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    medico = db.query(Medico).filter(Medico.id == medico_id).first()
    
    result = []
    for msg in reversed(mensajes):
        # Usar el campo remitente_rol del modelo
        remitente_rol = msg.remitente_rol.value if hasattr(msg.remitente_rol, 'value') else str(msg.remitente_rol)
        remitente_nombre = medico.nombre if remitente_rol == "medico" else paciente.nombre
        
        result.append(MensajeDetalleOut(
            id=msg.id,
            contenido=msg.contenido,
            paciente_id=msg.paciente_id,
            medico_id=msg.medico_id,
            timestamp=msg.timestamp,
            leido=msg.leido,
            remitente_rol=remitente_rol,
            remitente_nombre=remitente_nombre
        ))
    
    return result

@router.post("/enviar")
def enviar_mensaje(
    mensaje_data: MensajeCreateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envía un mensaje nuevo (endpoint REST alternativo al WebSocket)"""
    
    # Verificar permisos
    if current_user["rol"] == "paciente" and current_user["id"] != mensaje_data.paciente_id:  # ← Cambio
        raise HTTPException(status_code=403, detail="No puedes enviar mensajes como otro paciente")
    elif current_user["rol"] == "medico" and current_user["id"] != mensaje_data.medico_id:
        raise HTTPException(status_code=403, detail="No puedes enviar mensajes como otro médico")
    
    # Convertir el string a RolEnum
    remitente_rol_enum = RolEnum.medico if mensaje_data.remitente_rol == "medico" else RolEnum.paciente
    
    nuevo_mensaje = Mensaje(
        contenido=mensaje_data.contenido,
        paciente_id=mensaje_data.paciente_id,
        medico_id=mensaje_data.medico_id,
        timestamp=datetime.utcnow(),
        leido=0,
        remitente_rol=remitente_rol_enum
    )
    
    db.add(nuevo_mensaje)
    db.commit()
    db.refresh(nuevo_mensaje)
    
    return {
        "id": nuevo_mensaje.id,
        "contenido": nuevo_mensaje.contenido,
        "timestamp": nuevo_mensaje.timestamp.isoformat(),
        "remitente_rol": mensaje_data.remitente_rol
    }

@router.put("/marcar-leidos/{paciente_id}/{medico_id}")
def marcar_mensajes_leidos(
    paciente_id: int,
    medico_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marca todos los mensajes de un chat como leídos (solo los del remitente contrario)"""
    
    # Determinar qué mensajes marcar como leídos (los del otro usuario)
    if current_user["rol"] == "medico":
        # El médico marca como leídos los mensajes del paciente
        db.query(Mensaje).filter(
            Mensaje.paciente_id == paciente_id,
            Mensaje.medico_id == medico_id,
            Mensaje.leido == 0,
            Mensaje.remitente_rol == RolEnum.paciente
        ).update({"leido": 1})
    elif current_user["rol"] == "paciente":
        # El paciente marca como leídos los mensajes del médico
        db.query(Mensaje).filter(
            Mensaje.paciente_id == paciente_id,
            Mensaje.medico_id == medico_id,
            Mensaje.leido == 0,
            Mensaje.remitente_rol == RolEnum.medico
        ).update({"leido": 1})
    else:
        # Para otros roles, marcar todos
        db.query(Mensaje).filter(
            Mensaje.paciente_id == paciente_id,
            Mensaje.medico_id == medico_id,
            Mensaje.leido == 0
        ).update({"leido": 1})
    
    db.commit()
    return {"message": "Mensajes marcados como leídos"}

# ========== WEBSOCKET PARA CHAT EN TIEMPO REAL ==========

@router.get("/no-leidos/count")
def get_mensajes_no_leidos_count(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el conteo total de mensajes no leídos para el usuario actual"""
    
    if current_user["rol"] == "medico":
        # Para médicos: contar mensajes no leídos de pacientes
        count = db.query(func.count(Mensaje.id)).filter(
            Mensaje.medico_id == current_user["id"],
            Mensaje.leido == 0,
            Mensaje.remitente_rol == RolEnum.paciente
        ).scalar()
    elif current_user["rol"] == "paciente":
        # Para pacientes: contar mensajes no leídos del médico
        count = db.query(func.count(Mensaje.id)).filter(
            Mensaje.paciente_id == current_user["id"],
            Mensaje.leido == 0,
            Mensaje.remitente_rol == RolEnum.medico
        ).scalar()
    else:
        count = 0
    
    return {"count": count or 0}

@router.websocket("/ws/{paciente_id}/{medico_id}")
async def chat_websocket(
    websocket: WebSocket, 
    paciente_id: int, 
    medico_id: int
):
    """WebSocket para chat en tiempo real"""
    await manager.connect(websocket, paciente_id, medico_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            
            # Guardar mensaje en la BD
            from app.db.db import SessionLocal
            db = SessionLocal()
            try:
                # Convertir el string a RolEnum
                remitente_rol = msg_data.get("remitente_rol", "paciente")
                remitente_rol_enum = RolEnum.medico if remitente_rol == "medico" else RolEnum.paciente
                
                mensaje = Mensaje(
                    contenido=msg_data.get("contenido", ""),
                    paciente_id=paciente_id,
                    medico_id=medico_id,
                    timestamp=datetime.utcnow(),
                    leido=0,
                    remitente_rol=remitente_rol_enum
                )
                db.add(mensaje)
                db.commit()
                db.refresh(mensaje)
                
                # Obtener nombres para el broadcast
                paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
                medico = db.query(Medico).filter(Medico.id == medico_id).first()
                
                response = {
                    "id": mensaje.id,
                    "contenido": mensaje.contenido,
                    "timestamp": mensaje.timestamp.isoformat(),
                    "remitente_rol": remitente_rol,
                    "remitente_nombre": medico.nombre if remitente_rol == "medico" else paciente.nombre,
                    "paciente_id": paciente_id,
                    "medico_id": medico_id
                }
                
                # Broadcast a todos en el chat
                await manager.broadcast_to_chat(paciente_id, medico_id, response)
                
            finally:
                db.close()
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, paciente_id, medico_id)

