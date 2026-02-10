'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@chronic-covid19/api-client';
import { Formulario, Paciente, FormularioAsignacion, RespuestaFormulario } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';

export default function AsignarFormularioPage() {
  const router = useRouter();
  const params = useParams();
  const formularioId = Number(params.id);
  const { user, token } = useAuthStore();

  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [asignaciones, setAsignaciones] = useState<FormularioAsignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados del modal de asignación
  const [showModal, setShowModal] = useState(false);
  const [selectedPacientes, setSelectedPacientes] = useState<number[]>([]);
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Búsqueda de pacientes
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Paciente[]>([]);
  const [searching, setSearching] = useState(false);

  const [allPacientes, setAllPacientes] = useState<Paciente[]>([]);

  // Estado para ver respuesta
  const [showRespuestaModal, setShowRespuestaModal] = useState(false);
  const [selectedAsignacionId, setSelectedAsignacionId] = useState<number | null>(null);
  const [respuestaActual, setRespuestaActual] = useState<RespuestaFormulario | null>(null);
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);

  // Verificar que sea médico
  useEffect(() => {
    if (user && user.rol !== 'medico') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Cargar datos iniciales
  useEffect(() => {
    if (formularioId) {
      loadData();
    }
  }, [formularioId]);

    // Cargar pacientes cuando se abre el modal
  useEffect(() => {
    if (showModal && allPacientes.length === 0) {
      loadPacientes();
    }
  }, [showModal]);

  const loadPacientes = async () => {
    try {
      setSearching(true);
      const results = await apiClient.listarMisPacientes();
      const pacientesFormateados = results.map(r => ({
        id: r.id,
        documento: r.documento,
        nombre: r.nombre,
        email: r.email,
        telefono: r.telefono,
      } as Paciente));
      setAllPacientes(pacientesFormateados);
      setSearchResults(pacientesFormateados);
    } catch (err) {
      console.error('Error al cargar pacientes:', err);
    } finally {
      setSearching(false);
    }
  };

  // Filtrar pacientes localmente
  const filteredPacientes = searchQuery.trim()
    ? allPacientes.filter(p =>
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.documento.includes(searchQuery)
      )
    : allPacientes;

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [formularioData, asignacionesData] = await Promise.all([
        apiClient.getFormularioById(formularioId),
        apiClient.getAsignacionesFormulario(formularioId),
      ]);

      setFormulario(formularioData);
      setAsignaciones(asignacionesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const togglePacienteSelection = (pacienteId: number) => {
    setSelectedPacientes(prev =>
      prev.includes(pacienteId)
        ? prev.filter(id => id !== pacienteId)
        : [...prev, pacienteId]
    );
  };

  const handleAsignar = async () => {
    if (selectedPacientes.length === 0) {
      setError('Debe seleccionar al menos un paciente');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Asignar a cada paciente seleccionado
      const promises = selectedPacientes.map(pacienteId =>
        apiClient.asignarFormulario({
          formulario_id: formularioId,
          paciente_id: pacienteId,
          fecha_expiracion: fechaExpiracion || undefined,
        })
      );

      await Promise.all(promises);

      setSuccessMessage(`Formulario asignado exitosamente a ${selectedPacientes.length} paciente(s)`);
      setShowModal(false);
      setSelectedPacientes([]);
      setFechaExpiracion('');
      setSearchQuery('');
      setSearchResults([]);

      // Recargar asignaciones
      await loadData();

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar formulario');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700';
      case 'completado':
        return 'bg-green-100 text-green-700';
      case 'expirado':
        return 'bg-red-100 text-red-700';
      case 'cancelado':
        return 'bg-gray-100 text-gray-700';
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
      case 'cancelado':
        return '❌ Cancelado';
      default:
        return estado;
    }
  };

const verRespuesta = async (asignacionId: number) => {
    try {
      setLoadingRespuesta(true);
      setSelectedAsignacionId(asignacionId);
      setShowRespuestaModal(true);

      const respuesta = await apiClient.getRespuestaAsignacion(asignacionId);
      setRespuestaActual(respuesta);
    } catch (err) {
      console.error('Error al cargar respuesta:', err);
      setRespuestaActual(null);
    } finally {
      setLoadingRespuesta(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Formulario no encontrado</h3>
          <Link
            href="/dashboard/medico/formularios"
            className="text-indigo-600 font-semibold hover:text-indigo-700"
          >
            Volver a mis formularios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              href="/dashboard/medico/formularios"
              className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Volver a Formularios</span>
            </Link>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asignar Formulario</h1>
              <p className="mt-2 text-gray-600">Asigna este formulario a uno o más pacientes</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nueva Asignación</span>
            </button>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start space-x-3">
            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Info del Formulario */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{formulario.titulo || 'Sin título'}</h2>
              {formulario.descripcion && (
                <p className="text-gray-600 mt-1">{formulario.descripcion}</p>
              )}
              <div className="flex items-center space-x-4 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-700">
                  {formulario.tipo}
                </span>
                <span className="text-sm text-gray-500">
                  {formulario.preguntas?.length || 0} pregunta(s)
                </span>
                <span className="text-sm text-gray-500">
                  Creado: {formatDate(formulario.fecha_creacion)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Total Asignaciones</p>
            <p className="text-2xl font-bold text-gray-900">{asignaciones.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">
              {asignaciones.filter(a => a.estado === 'pendiente').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Completados</p>
            <p className="text-2xl font-bold text-green-600">
              {asignaciones.filter(a => a.estado === 'completado').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Expirados</p>
            <p className="text-2xl font-bold text-red-600">
              {asignaciones.filter(a => a.estado === 'expirado').length}
            </p>
          </div>
        </div>

        {/* Lista de Asignaciones */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Historial de Asignaciones</h3>
            <p className="text-sm text-gray-500 mt-1">
              Haz clic en "Ver Respuesta" para ver las respuestas de los formularios completados
            </p>
          </div>

          {asignaciones.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Sin asignaciones</h4>
              <p className="text-gray-600 mb-4">Este formulario aún no ha sido asignado a ningún paciente</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
              >
                + Crear primera asignación
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Instancia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fecha Asignación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Expira
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {asignaciones.map((asignacion) => (
                    <tr key={asignacion.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {asignacion.paciente_id}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-semibold text-gray-900">
                              Paciente #{asignacion.paciente_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          #{asignacion.numero_instancia}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(asignacion.fecha_asignacion)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {asignacion.fecha_expiracion
                          ? formatDate(asignacion.fecha_expiracion)
                          : <span className="text-gray-400">Sin fecha límite</span>
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getEstadoBadge(asignacion.estado)}`}>
                          {getEstadoLabel(asignacion.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {asignacion.estado === 'completado' && (
                          <button
                            onClick={() => verRespuesta(asignacion.id)}
                            className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors"
                          >
                            Ver Respuesta
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-500 border-t border-gray-200 pt-6">
          Proyecto PINV20-292 · CONACYT & FEEI · © {new Date().getFullYear()} FP-UNA
        </footer>
      </div>

      {/* Modal de Asignación */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header del Modal */}
            <div className="p-6 border-b bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Asignar Formulario</h2>
                  <p className="text-green-100 mt-1">Selecciona los pacientes para asignar</p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedPacientes([]);
                    setSearchQuery('');
                    setSearchResults([]);
                    setFechaExpiracion('');
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Búsqueda de pacientes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buscar Pacientes
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o documento..."
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                    </div>
                  )}
                </div>
              </div>

                  {/* Resultados / Lista de pacientes */}
                  {filteredPacientes.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {searchQuery ? `Resultados (${filteredPacientes.length})` : `Mis Pacientes (${filteredPacientes.length})`}
                      </label>
                      <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                        {filteredPacientes.map((paciente) => (
                          <label
                            key={paciente.id}
                            className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                              selectedPacientes.includes(paciente.id) ? 'bg-green-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPacientes.includes(paciente.id)}
                              onChange={() => togglePacienteSelection(paciente.id)}
                              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-semibold text-gray-900">{paciente.nombre}</p>
                              <p className="text-xs text-gray-500">
                                Doc: {paciente.documento} • {paciente.email}
                              </p>
                            </div>
                            {selectedPacientes.includes(paciente.id) && (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensaje si no hay pacientes */}
                  {!searching && allPacientes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="font-semibold">No tienes pacientes asignados</p>
                      <p className="text-sm mt-1">Contacta al coordinador para que te asignen pacientes.</p>
                    </div>
                  )}

                  {/* Pacientes seleccionados */}
                  {selectedPacientes.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pacientes seleccionados ({selectedPacientes.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedPacientes.map((id) => {
                          const paciente = allPacientes.find(p => p.id === id); // ← Cambio aquí
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                            >
                              {paciente?.nombre || `Paciente #${id}`}
                              <button
                                onClick={() => togglePacienteSelection(id)}
                                className="ml-2 text-green-600 hover:text-green-800"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

              {/* Fecha de expiración */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de Expiración (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={fechaExpiracion}
                  onChange={(e) => setFechaExpiracion(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si no se define, el formulario no tendrá fecha límite
                </p>
              </div>

              {/* Nota informativa */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold">Múltiples asignaciones permitidas</p>
                    <p className="mt-1">
                      Puedes asignar el mismo formulario múltiples veces al mismo paciente.
                      Cada asignación se identifica con un número de instancia único.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-6 border-t bg-gray-50 flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedPacientes([]);
                  setSearchQuery('');
                  setSearchResults([]);
                  setFechaExpiracion('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignar}
                disabled={selectedPacientes.length === 0 || submitting}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting
                  ? 'Asignando...'
                  : `Asignar a ${selectedPacientes.length} paciente(s)`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Respuesta */}
      {showRespuestaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Respuestas del Paciente</h2>
                  <p className="text-green-100 mt-1">{formulario?.titulo}</p>
                </div>
                <button
                  onClick={() => {
                    setShowRespuestaModal(false);
                    setRespuestaActual(null);
                    setSelectedAsignacionId(null);
                  }}
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
                          const pregunta = formulario?.preguntas?.find(p => p.id === preguntaId);
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
                onClick={() => {
                  setShowRespuestaModal(false);
                  setRespuestaActual(null);
                  setSelectedAsignacionId(null);
                }}
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