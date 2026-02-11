'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum } from '@chronic-covid19/shared-types';

interface Mensaje {
  id: number;
  contenido: string;
  timestamp: string;
  remitente_rol: string;
  remitente_nombre: string;
  paciente_id: number;
  medico_id: number;
}

interface Conversacion {
  paciente_id: number;
  paciente_nombre: string;
  medico_id: number;
  medico_nombre: string;
  ultimo_mensaje: string;
  ultimo_timestamp: string;
  no_leidos: number;
}

interface ChatProps {
  onClose?: () => void;
  conversacionInicial?: Conversacion | null;
}

export default function Chat({ onClose, conversacionInicial }: ChatProps) {
  const { user, token } = useAuthStore();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<Conversacion | null>(conversacionInicial || null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mensajesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll al último mensaje
  const scrollToBottom = useCallback(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Cargar conversaciones
  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
      loadConversaciones();
    }
  }, [token]);

  // Cargar mensajes cuando cambia la conversación activa
  useEffect(() => {
    if (conversacionActiva && token) {
      loadMensajes();
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [conversacionActiva, token]);

  // Scroll cuando llegan nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [mensajes, scrollToBottom]);

  const loadConversaciones = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMisConversaciones();
      setConversaciones(data);

      // Si hay conversación inicial, usarla; si no, seleccionar la primera
      if (conversacionInicial) {
        setConversacionActiva(conversacionInicial);
      } else if (data.length > 0 && !conversacionActiva) {
        setConversacionActiva(data[0]);
      }
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMensajes = async () => {
    if (!conversacionActiva) return;

    try {
      const data = await apiClient.getChatMessages(
        conversacionActiva.paciente_id,
        conversacionActiva.medico_id
      );
      setMensajes(data);

      // Marcar como leídos
      await apiClient.marcarMensajesLeidos(
        conversacionActiva.paciente_id,
        conversacionActiva.medico_id
      );
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    }
  };

  const connectWebSocket = () => {
    if (!conversacionActiva || !token) return;

    // Cerrar conexión anterior si existe
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = apiClient.getWebSocketUrl(
      conversacionActiva.paciente_id,
      conversacionActiva.medico_id
    );

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🔌 WebSocket conectado');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const mensaje = JSON.parse(event.data);
      setMensajes(prev => [...prev, mensaje]);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevoMensaje.trim() || !conversacionActiva || !user) return;

    setEnviando(true);

    const mensajeData = {
      contenido: nuevoMensaje.trim(),
      paciente_id: conversacionActiva.paciente_id,
      medico_id: conversacionActiva.medico_id,
      remitente_rol: user.rol
    };

    try {
      // Intentar enviar por WebSocket primero
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(mensajeData));
      } else {
        // Fallback a REST
        const response = await apiClient.enviarMensaje(mensajeData);
        setMensajes(prev => [...prev, {
          ...response,
          remitente_nombre: user.nombre
        }]);
      }

      setNuevoMensaje('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setEnviando(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const esMiMensaje = (msg: Mensaje) => {
    if (!user) return false;
    if (user.rol === RolEnum.PACIENTE) {
      return msg.remitente_rol === 'paciente';
    }
    return msg.remitente_rol === 'medico';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      {/* Lista de conversaciones (sidebar) */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Header del sidebar */}
        <div className="p-4 bg-gradient-to-r from-green-600 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">💬 Mensajes</h2>
            <div className="flex items-center space-x-2">
              {wsConnected && (
                <span className="flex items-center text-xs bg-green-500 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                  En línea
                </span>
              )}
            </div>
          </div>
          <p className="text-green-100 text-sm mt-1">
            {user?.rol === RolEnum.MEDICO ? 'Chats con pacientes' : 'Chat con tu médico'}
          </p>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {conversaciones.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="font-medium">Sin conversaciones</p>
              <p className="text-sm mt-1">
                {user?.rol === RolEnum.PACIENTE
                  ? 'Aún no tienes un médico asignado'
                  : 'No tienes pacientes asignados'}
              </p>
            </div>
          ) : (
            conversaciones.map((conv) => (
              <button
                key={`${conv.paciente_id}-${conv.medico_id}`}
                onClick={() => setConversacionActiva(conv)}
                className={`w-full p-4 flex items-start space-x-3 hover:bg-gray-100 transition-colors border-b border-gray-100 ${
                  conversacionActiva?.paciente_id === conv.paciente_id && 
                  conversacionActiva?.medico_id === conv.medico_id
                    ? 'bg-green-50 border-l-4 border-l-green-500'
                    : ''
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {user?.rol === RolEnum.MEDICO
                      ? conv.paciente_nombre.charAt(0).toUpperCase()
                      : conv.medico_nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {user?.rol === RolEnum.MEDICO ? conv.paciente_nombre : conv.medico_nombre}
                    </h3>
                    {conv.no_leidos > 0 && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {conv.no_leidos}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {conv.ultimo_mensaje || 'Iniciar conversación...'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTime(conv.ultimo_timestamp)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {conversacionActiva ? (
          <>
            {/* Header del chat */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.rol === RolEnum.MEDICO
                      ? conversacionActiva.paciente_nombre.charAt(0).toUpperCase()
                      : conversacionActiva.medico_nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {user?.rol === RolEnum.MEDICO
                      ? conversacionActiva.paciente_nombre
                      : conversacionActiva.medico_nombre.startsWith('Dr.') 
                        ? conversacionActiva.medico_nombre 
                        : `Dr. ${conversacionActiva.medico_nombre}`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {user?.rol === RolEnum.MEDICO ? 'Paciente' : 'Tu médico asignado'}
                  </p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {mensajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="font-medium">¡Inicia la conversación!</p>
                  <p className="text-sm">Envía un mensaje para comenzar</p>
                </div>
              ) : (
                mensajes.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex ${esMiMensaje(msg) ? 'justify-end' : 'justify-start'}`}
                  >
                    {!esMiMensaje(msg) && (
                      <div className="flex items-end space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {msg.remitente_rol === 'medico' ? 'Dr' : msg.remitente_nombre?.charAt(0)?.toUpperCase() || 'P'}
                          </span>
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                        esMiMensaje(msg)
                          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md ml-2'
                      }`}
                    >
                      {!esMiMensaje(msg) && (
                        <p className={`text-xs font-semibold mb-1 ${
                          msg.remitente_rol === 'medico' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {msg.remitente_rol === 'medico' 
                            ? (msg.remitente_nombre?.startsWith('Dr.') ? msg.remitente_nombre : `Dr. ${msg.remitente_nombre}`)
                            : msg.remitente_nombre}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.contenido}</p>
                      <p className={`text-xs mt-1 ${esMiMensaje(msg) ? 'text-green-100' : 'text-gray-400'}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={mensajesEndRef} />
            </div>

            {/* Input de mensaje */}
            <form onSubmit={handleEnviarMensaje} className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                  disabled={enviando}
                />
                <button
                  type="submit"
                  disabled={!nuevoMensaje.trim() || enviando}
                  className="p-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  {enviando ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="font-medium text-lg">Selecciona una conversación</p>
              <p className="text-sm mt-1">Elige un chat de la lista para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}