'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum, BuscarPacienteResult, FormularioAsignacionDetalle, RespuestaFormulario, Formulario } from '@chronic-covid19/shared-types';

export default function MedicoPacientesPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  const [pacientes, setPacientes] = useState<BuscarPacienteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de asignaciones
  const [showAsignacionesModal, setShowAsignacionesModal] = useState(false);
  const [asignacionesPaciente, setAsignacionesPaciente] = useState<FormularioAsignacionDetalle[]>([]);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<BuscarPacienteResult | null>(null);

  // Modal de respuestas (NUEVO)
  const [showRespuestaModal, setShowRespuestaModal] = useState(false);
  const [respuestaActual, setRespuestaActual] = useState<RespuestaFormulario | null>(null);
  const [formularioActual, setFormularioActual] = useState<Formulario | null>(null);
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<FormularioAsignacionDetalle | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.rol !== RolEnum.MEDICO) {
      router.push('/dashboard');
      return;
    }

    loadPacientes();
  }, [isAuthenticated, user, router, token]);

  const loadPacientes = async () => {
    try {
      setLoading(true);
      setError('');

      if (token) {
        apiClient.setToken(token);
        const pacientesData = await apiClient.listarMisPacientes();
        console.log('👥 Mis pacientes:', pacientesData);
        setPacientes(pacientesData);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar pacientes:', err);
      setError(err?.message || 'Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleVerAsignaciones = async (paciente: BuscarPacienteResult) => {
    setPacienteSeleccionado(paciente);
    setShowAsignacionesModal(true);
    setLoadingAsignaciones(true);
    
    try {
      // Usar el método correcto del API client
      const formulariosData = await apiClient.getFormulariosPaciente(paciente.id);
      
      // Mapear al formato esperado por el modal
      const asignaciones: FormularioAsignacionDetalle[] = formulariosData.map((f: any) => ({
        id: f.asignacion_id,
        formulario_id: f.formulario_id,
        paciente_id: paciente.id,
        asignado_por: 0,
        formulario_titulo: f.formulario_titulo,
        formulario_tipo: f.formulario_tipo,
        fecha_asignacion: f.fecha_asignacion,
        fecha_expiracion: f.fecha_expiracion,
        estado: f.estado,
        numero_instancia: f.numero_instancia,
      }));
      
      setAsignacionesPaciente(asignaciones);
    } catch (err: any) {
      console.error('Error al cargar asignaciones:', err);
      setAsignacionesPaciente([]);
    } finally {
      setLoadingAsignaciones(false);
    }
  };

  // Nueva función para ver respuesta
  const verRespuesta = async (asignacion: FormularioAsignacionDetalle) => {
    try {
      setAsignacionSeleccionada(asignacion);
      setShowRespuestaModal(true);
      setLoadingRespuesta(true);

      // Cargar el formulario y la respuesta en paralelo
      const [formularioData, respuestaData] = await Promise.all([
        apiClient.getFormularioById(asignacion.formulario_id),
        apiClient.getRespuestaAsignacion(asignacion.id),
      ]);

      setFormularioActual(formularioData);
      setRespuestaActual(respuestaData);
    } catch (err: any) {
      console.error('Error al cargar respuesta:', err);
      setRespuestaActual(null);
    } finally {
      setLoadingRespuesta(false);
    }
  };

  const cerrarModalRespuesta = () => {
    setShowRespuestaModal(false);
    setRespuestaActual(null);
    setFormularioActual(null);
    setAsignacionSeleccionada(null);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700';
      case 'completado':
        return 'bg-green-100 text-green-700';
      case 'expirado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '⏳ Pendiente';
      case 'completado':
        return '✅ Completado';
      case 'expirado':
        return '⏰ Expirado';
      default:
        return estado;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filtrar pacientes por búsqueda
  const pacientesFiltrados = pacientes.filter((paciente) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const nombreMatch = paciente.nombre.toLowerCase().includes(query);
    const emailMatch = paciente.email.toLowerCase().includes(query);
    const documentoMatch = paciente.documento?.toLowerCase().includes(query);

    return nombreMatch || emailMatch || documentoMatch;
  });

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">Mis Pacientes</span>
                <span className="block text-xs text-gray-500">Panel Médico</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                    Médico
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-custom py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-teal-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">Mis Pacientes</span>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Pacientes Asignados</h1>
          <p className="text-gray-600">Lista de pacientes bajo tu cuidado</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Estadísticas */}
        <div className="card mb-6 bg-gradient-to-r from-teal-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Total de Pacientes Asignados</p>
              <p className="text-4xl font-bold mt-1">{pacientes.length}</p>
            </div>
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="card mb-6">
          <div>
            <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
              Buscar paciente
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Nombre, email o documento..."
            />
          </div>
        </div>

        {/* Lista de pacientes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Pacientes ({pacientesFiltrados.length})
            </h2>
            <Link
              href="/dashboard/medico/formularios"
              className="text-teal-600 hover:text-teal-700 font-semibold text-sm"
            >
              Ir a Formularios →
            </Link>
          </div>

          {pacientesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-600 font-semibold">
                {searchQuery
                  ? 'No se encontraron pacientes con esos criterios'
                  : 'No tienes pacientes asignados'}
              </p>
              {!searchQuery && (
                <p className="text-sm text-gray-500 mt-2">
                  Contacta al coordinador de tu hospital para que te asignen pacientes.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {pacientesFiltrados.map((paciente) => (
                <div
                  key={paciente.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{paciente.nombre}</h3>
                          <p className="text-sm text-gray-600">{paciente.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        {paciente.documento && (
                          <p>📋 Documento: {paciente.documento}</p>
                        )}
                        {paciente.telefono && (
                          <p>📞 Teléfono: {paciente.telefono}</p>
                        )}
                        {paciente.hospital && (
                          <p>🏥 Hospital: {paciente.hospital.nombre}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleVerAsignaciones(paciente)}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition-colors text-sm"
                      >
                        Ver Asignaciones
                      </button>
                      <Link
                        href="/dashboard/medico/formularios"
                        className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-semibold hover:bg-teal-100 transition-colors text-sm text-center"
                      >
                        Asignar Formulario
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="container-custom py-6 mt-12 border-t border-gray-100">
        <p className="text-center text-xs text-gray-500">
          Proyecto PINV20-292 · CONACYT & FEEI · © {new Date().getFullYear()} FP-UNA
        </p>
      </footer>

      {/* Modal de Asignaciones del Paciente */}
      {showAsignacionesModal && pacienteSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header del Modal */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-teal-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Formularios Asignados</h2>
                  <p className="text-blue-100 mt-1">{pacienteSeleccionado.nombre}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAsignacionesModal(false);
                    setPacienteSeleccionado(null);
                    setAsignacionesPaciente([]);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body del Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAsignaciones ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <span className="ml-3 text-gray-600">Cargando asignaciones...</span>
                </div>
              ) : asignacionesPaciente.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 font-semibold">Sin formularios asignados</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Este paciente aún no tiene formularios asignados.
                  </p>
                  <Link
                    href="/dashboard/medico/formularios"
                    className="inline-block mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                  >
                    Asignar Formulario
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {asignacionesPaciente.map((asignacion) => (
                    <div
                      key={asignacion.id}
                      className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">
                            {asignacion.formulario_titulo || `Formulario #${asignacion.formulario_id}`}
                          </h4>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                            <span>📅 Asignado: {formatDate(asignacion.fecha_asignacion)}</span>
                            {asignacion.fecha_expiracion && (
                              <span>⏰ Vence: {formatDate(asignacion.fecha_expiracion)}</span>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(asignacion.estado)}`}>
                          {getEstadoLabel(asignacion.estado)}
                        </span>
                      </div>
                      {asignacion.estado === 'completado' && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => verRespuesta(asignacion)}
                            className="text-sm text-green-600 font-semibold hover:text-green-700 flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Ver Respuesta</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAsignacionesModal(false);
                  setPacienteSeleccionado(null);
                  setAsignacionesPaciente([]);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Respuesta */}
      {showRespuestaModal && asignacionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Respuestas del Formulario</h2>
                  <p className="text-green-100 mt-1">
                    {asignacionSeleccionada.formulario_titulo || `Formulario #${asignacionSeleccionada.formulario_id}`}
                  </p>
                </div>
                <button
                  onClick={cerrarModalRespuesta}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingRespuesta ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">Cargando respuesta...</span>
                </div>
              ) : respuestaActual ? (
                <div className="space-y-4">
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Paciente:</strong> {pacienteSeleccionado?.nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Respondido:</strong> {formatDate(respuestaActual.timestamp)}
                    </p>
                  </div>

                  {(() => {
                    // Extraer las respuestas reales (pueden estar anidadas)
                    const respuestasData = respuestaActual.respuestas?.respuestas 
                      || respuestaActual.respuestas 
                      || {};
                
                    return Object.entries(respuestasData).map(([preguntaId, respuesta]) => {
                      // Buscar la pregunta en el formulario para obtener el label
                      const pregunta = formularioActual?.preguntas?.find((p: any) => p.id === preguntaId);
                      const etiqueta = pregunta?.label || preguntaId;
                  
                      // Formatear la respuesta según el tipo
                      let respuestaFormateada: string;
                      if (typeof respuesta === 'boolean') {
                        respuestaFormateada = respuesta ? 'Sí' : 'No';
                      } else if (respuesta === 'true' || respuesta === 'Sí') {
                        respuestaFormateada = 'Sí';
                      } else if (respuesta === 'false' || respuesta === 'No') {
                        respuestaFormateada = 'No';
                      } else if (typeof respuesta === 'object' && respuesta !== null) {
                        respuestaFormateada = JSON.stringify(respuesta, null, 2);
                      } else {
                        respuestaFormateada = String(respuesta || '—');
                      }

                      return (
                        <div key={preguntaId} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <p className="text-sm font-semibold text-gray-700">
                              📋 {etiqueta}
                            </p>
                          </div>
                          <div className="px-4 py-3">
                            <p className="text-gray-900 whitespace-pre-wrap">
                              {respuestaFormateada}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600">No se encontró la respuesta</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={cerrarModalRespuesta}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}