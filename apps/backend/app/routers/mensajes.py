from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.db.db import get_db
from app.models.models import Mensaje, Paciente, Medico, Asignacion, RolEnum
from app.schemas.schemas import MensajeOut
from app.core.security import get_current_user, create_access_token, decode_token
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import json

router = APIRouter()

# Alcance (scope) y vida del ticket JWT de corta duración usado para autenticar
# la conexión WebSocket. El ticket NO reemplaza al access token normal; sólo
# autoriza una conversación concreta (paciente_id + medico_id) por unos segundos.
WS_TICKET_SCOPE = "websocket_chat"
WS_TICKET_EXPIRE_SECONDS = 60

# ========== SCHEMAS ADICIONALES ==========

class MensajeCreateRequest(BaseModel):
    contenido: str
    paciente_id: int
    medico_id: int
    # DEPRECADO: el backend ignora este campo y deriva el rol del remitente del
    # usuario autenticado. Se mantiene opcional sólo por compatibilidad con clientes
    # antiguos; no confiar nunca en él para decidir quién envió el mensaje.
    remitente_rol: Optional[str] = None


class WsTokenRequest(BaseModel):
    paciente_id: int
    medico_id: int


class WsTokenResponse(BaseModel):
    token: str
    expires_in: int

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

# ========== AUTORIZACIÓN DE ACCESO AL CHAT ==========

def existe_asignacion_activa(db: Session, paciente_id: int, medico_id: int) -> bool:
    """True si hay una asignación activa entre ese paciente y ese médico."""
    return db.query(Asignacion).filter(
        Asignacion.paciente_id == paciente_id,
        Asignacion.medico_id == medico_id,
        Asignacion.activo == True,
    ).first() is not None


def verificar_acceso_chat(current_user: dict, paciente_id: int, medico_id: int, db: Session) -> str:
    """
    Valida que ``current_user`` pueda acceder a la conversación (paciente_id, medico_id).

    Comprueba, en orden:
      1. Rol permitido (sólo ``paciente`` o ``medico`` pueden chatear).
      2. Identidad: un paciente sólo accede a su propio ``paciente_id``; un médico,
         a su propio ``medico_id``. Así nadie puede abrir una combinación arbitraria
         de IDs conociéndolos.
      3. Relación válida: debe existir una ``Asignacion`` activa entre ambos.

    Devuelve el rol del usuario ("paciente"/"medico"). Lanza HTTP 403 si algo falla.
    """
    rol = current_user.get("rol")

    if rol == "paciente":
        if current_user["id"] != paciente_id:
            raise HTTPException(status_code=403, detail="No tienes acceso a este chat")
    elif rol == "medico":
        if current_user["id"] != medico_id:
            raise HTTPException(status_code=403, detail="No tienes acceso a este chat")
    else:
        raise HTTPException(status_code=403, detail="No tienes acceso a este chat")

    if not existe_asignacion_activa(db, paciente_id, medico_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este chat")

    return rol

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
            
            # Sólo cuentan como "no leídos" los mensajes que envió el paciente.
            no_leidos = db.query(func.count(Mensaje.id)).filter(
                Mensaje.paciente_id == paciente_id,
                Mensaje.medico_id == current_user["id"],  # ← Cambio
                Mensaje.leido == 0,
                Mensaje.remitente_rol == RolEnum.paciente,
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
        
        # Normalizar a naive para evitar TypeError al comparar timestamps de mensajes
        # (naive, datetime.utcnow) con fecha_asignacion (tz-aware).
        def _clave_orden(c: ConversacionOut):
            ts = c.ultimo_timestamp
            return ts.replace(tzinfo=None) if ts.tzinfo is not None else ts

        return sorted(conversaciones, key=_clave_orden, reverse=True)
    
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
        
        # Sólo cuentan como "no leídos" los mensajes que envió el médico.
        no_leidos = db.query(func.count(Mensaje.id)).filter(
            Mensaje.paciente_id == current_user["id"],  # ← Cambio
            Mensaje.medico_id == medico.id,
            Mensaje.leido == 0,
            Mensaje.remitente_rol == RolEnum.medico,
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

    # Identidad + rol + asignación activa entre paciente y médico.
    verificar_acceso_chat(current_user, paciente_id, medico_id, db)

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

    # Identidad + rol + asignación activa. Devuelve el rol REAL del remitente.
    rol = verificar_acceso_chat(
        current_user, mensaje_data.paciente_id, mensaje_data.medico_id, db
    )

    # El rol del remitente se deriva del usuario autenticado; se ignora
    # mensaje_data.remitente_rol (deprecado) para impedir suplantaciones.
    remitente_rol_enum = RolEnum.medico if rol == "medico" else RolEnum.paciente

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
        "paciente_id": nuevo_mensaje.paciente_id,
        "medico_id": nuevo_mensaje.medico_id,
        "timestamp": nuevo_mensaje.timestamp.isoformat(),
        "leido": nuevo_mensaje.leido,
        "remitente_rol": remitente_rol_enum.value,
        "remitente_nombre": current_user.get("nombre", ""),
    }

@router.put("/marcar-leidos/{paciente_id}/{medico_id}")
def marcar_mensajes_leidos(
    paciente_id: int,
    medico_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marca todos los mensajes de un chat como leídos (solo los del remitente contrario)"""

    # Identidad + rol + asignación activa entre paciente y médico.
    verificar_acceso_chat(current_user, paciente_id, medico_id, db)

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


@router.post("/ws-token", response_model=WsTokenResponse)
def crear_ws_token(
    body: WsTokenRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Emite un ticket JWT de corta duración para autenticar la conexión WebSocket
    a una conversación concreta. Requiere Bearer token normal y valida el acceso
    (identidad + rol + asignación activa) antes de entregarlo.
    """
    rol = verificar_acceso_chat(current_user, body.paciente_id, body.medico_id, db)

    token = create_access_token(
        {
            "sub": str(current_user["id"]),
            "rol": rol,
            "paciente_id": body.paciente_id,
            "medico_id": body.medico_id,
            "scope": WS_TICKET_SCOPE,
        },
        expires_delta=timedelta(seconds=WS_TICKET_EXPIRE_SECONDS),
    )
    return WsTokenResponse(token=token, expires_in=WS_TICKET_EXPIRE_SECONDS)


# ========== WEBSOCKET PARA CHAT EN TIEMPO REAL ==========

@router.websocket("/ws/{paciente_id}/{medico_id}")
async def chat_websocket(
    websocket: WebSocket,
    paciente_id: int,
    medico_id: int,
    token: Optional[str] = Query(default=None),
):
    """
    WebSocket para chat en tiempo real. Exige un ticket JWT (query param ``token``)
    emitido por ``POST /mensajes/ws-token``. Se valida ANTES de aceptar la conexión:
    firma, expiración, ``scope`` y que el ticket corresponda exactamente a este par
    (paciente_id, medico_id). El rol del remitente se deriva del ticket, nunca del
    payload del cliente.
    """
    # 1008 = Policy Violation. Cerrar sin aceptar rechaza el handshake.
    payload = decode_token(token) if token else None
    if (
        payload is None
        or payload.get("scope") != WS_TICKET_SCOPE
        or payload.get("paciente_id") != paciente_id
        or payload.get("medico_id") != medico_id
        or payload.get("rol") not in ("paciente", "medico")
    ):
        await websocket.close(code=1008)
        return

    # El rol del remitente queda fijado por el ticket para toda la conexión.
    remitente_rol = payload["rol"]
    remitente_rol_enum = RolEnum.medico if remitente_rol == "medico" else RolEnum.paciente

    await manager.connect(websocket, paciente_id, medico_id)

    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)

            # Sólo se acepta 'contenido' del cliente; ids y rol vienen de la conexión.
            contenido = str(msg_data.get("contenido", "")).strip()
            if not contenido:
                continue

            # Guardar mensaje en la BD
            from app.db.db import SessionLocal
            db = SessionLocal()
            try:
                mensaje = Mensaje(
                    contenido=contenido,
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

