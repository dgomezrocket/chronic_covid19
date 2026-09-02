'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import {
  RolEnum,
  ResumenRespuestaItem,
  RespuestaFormularioDetalle,
  PreguntaFormulario,
  Hospital,
  Medico,
} from '@chronic-covid19/shared-types';
import { normalizarTextoVisible } from '@/lib/text';

const LIMIT = 50;

type EstadoFiltro = 'todos' | 'pendiente' | 'completado' | 'expirado';

export default function RespuestasFormulariosPage() {
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  // Datos
  const [items, setItems] = useState<ResumenRespuestaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<EstadoFiltro>('todos');
  const [hospitalId, setHospitalId] = useState<string>(''); // '' = todos (solo admin)
  const [medicoId, setMedicoId] = useState<string>(''); // '' = todos (solo admin)
  const [skip, setSkip] = useState(0);

  // Datos para filtros de admin
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  // Modal "Ver respuesta"
  const [showModal, setShowModal] = useState(false);
  const [detalle, setDetalle] = useState<RespuestaFormularioDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const isAdmin = user?.rol === RolEnum.ADMIN;
  const isMedico = user?.rol === RolEnum.MEDICO;

  // ---------- Guardas de acceso ----------
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.rol !== RolEnum.MEDICO && user.rol !== RolEnum.ADMIN) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Inyectar token en el apiClient (patrón del proyecto)
  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    }
  }, [token]);

  // ---------- Debounce de la búsqueda ----------
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setSkip(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ---------- Cargar catálogos para filtros de admin ----------
  useEffect(() => {
    if (!token || !isAdmin) return;
    let activo = true;
    Promise.all([apiClient.getAllHospitales(0, 500), apiClient.getAllMedicos()])
      .then(([hs, ms]) => {
        if (!activo) return;
        setHospitales(hs);
        setMedicos(ms);
      })
      .catch((err) => console.error('Error cargando catálogos de filtros:', err));
    return () => {
      activo = false;
    };
  }, [token, isAdmin]);

  // ---------- Cargar el listado ----------
  useEffect(() => {
    if (!token || !user) return;
    if (user.rol !== RolEnum.MEDICO && user.rol !== RolEnum.ADMIN) return;

    let activo = true;
    const cargar = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getResumenRespuestas({
          paciente: search || undefined,
          estado: estado === 'todos' ? undefined : estado,
          medico_id: isAdmin && medicoId ? Number(medicoId) : undefined,
          hospital_id: isAdmin && hospitalId ? Number(hospitalId) : undefined,
          skip,
          limit: LIMIT,
        });
        if (!activo) return;
        setItems(data.items);
        setTotal(data.total);
      } catch (err) {
        if (!activo) return;
        setError(err instanceof Error ? err.message : 'Error al cargar los formularios');
        setItems([]);
        setTotal(0);
      } finally {
        if (activo) setLoading(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [token, user, search, estado, medicoId, hospitalId, skip, isAdmin]);

  // Médicos disponibles según el hospital seleccionado (admin)
  const medicosFiltrados = useMemo(() => {
    if (!hospitalId) return medicos;
    const hid = Number(hospitalId);
    return medicos.filter((m) => (m.hospitales || []).some((h) => h.id === hid));
  }, [medicos, hospitalId]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const limpiarFiltros = () => {
    setSearchInput('');
    setSearch('');
    setEstado('todos');
    setHospitalId('');
    setMedicoId('');
    setSkip(0);
  };

  const hayFiltrosActivos =
    !!search || estado !== 'todos' || (isAdmin && (!!hospitalId || !!medicoId));

  // ---------- Helpers de presentación (consistentes con el resto del proyecto) ----------
  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstadoBadge = (est: string) => {
    switch (est) {
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

  const getEstadoLabel = (est: string) => {
    switch (est) {
      case 'pendiente':
        return '⏳ Pendiente';
      case 'completado':
        return '✅ Completado';
      case 'expirado':
        return '⏰ Expirado';
      case 'cancelado':
        return '❌ Cancelado';
      default:
        return est;
    }
  };

  const getInitials = (nombre: string) =>
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('') || 'P';

  // ---------- Modal: cargar detalle ----------
  const verRespuesta = async (asignacionId: number) => {
    try {
      setShowModal(true);
      setLoadingDetalle(true);
      setErrorDetalle(null);
      setDetalle(null);
      const data = await apiClient.getRespuestaFormularioDetalle(asignacionId);
      setDetalle(data);
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : 'Error al cargar la respuesta');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setDetalle(null);
    setErrorDetalle(null);
  };

  const obtenerRespuestasData = (d: RespuestaFormularioDetalle): Record<string, any> => {
    const r = d.respuestas as any;
    return (r && r.respuestas) || r || {};
  };

  const renderRespuesta = (campo: PreguntaFormulario, respuestasData: Record<string, any>) => {
    const valor = respuestasData[campo.id];

    if (valor === undefined || valor === null || valor === '') {
      return <span className="text-gray-400 italic">Sin respuesta</span>;
    }

    switch (campo.type) {
      case 'checkbox' as string:
      case 'boolean' as string: {
        const valorBooleano =
          valor === true ||
          valor === 'true' ||
          valor === 'Sí' ||
          valor === 'Si' ||
          valor === 'sí' ||
          valor === 'si';
        return (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              valorBooleano ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {valorBooleano ? '✓ Sí' : '✗ No'}
          </span>
        );
      }

      case 'fecha' as string:
      case 'date':
        return (
          <span className="text-gray-900">
            {new Date(valor).toLocaleDateString('es-PY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        );

      default:
        if (Array.isArray(valor)) {
          return <span className="text-gray-900">{valor.map(normalizarTextoVisible).join(', ')}</span>;
        }
        if (typeof valor === 'object') {
          return (
            <span className="text-gray-900 whitespace-pre-wrap">
              {normalizarTextoVisible(JSON.stringify(valor, null, 2))}
            </span>
          );
        }
        return <span className="text-gray-900">{normalizarTextoVisible(valor)}</span>;
    }
  };

  // ---------- Paginación ----------
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const currentPage = Math.floor(skip / LIMIT) + 1;
  const puedeAnterior = skip > 0;
  const puedeSiguiente = skip + LIMIT < total;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">Respuestas Formularios</span>
                <span className="block text-xs text-gray-500">Asignaciones y respuestas</span>
              </div>
            </Link>

            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Volver</span>
              </Link>
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

      <main className="container-custom py-8">
        {/* Título */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Respuestas Formularios</h1>
          <p className="text-gray-600">
            Consulta formularios asignados, respuestas de pacientes y seguimientos pendientes.
          </p>
        </div>

        {/* Filtros */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar paciente</label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar paciente por nombre o CI"
                className="input"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value as EstadoFiltro);
                  setSkip(0);
                }}
                className="input"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="completado">Respondido / Completado</option>
                <option value="expirado">Vencido</option>
              </select>
            </div>

            {/* Hospital */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
              {isAdmin ? (
                <select
                  value={hospitalId}
                  onChange={(e) => {
                    setHospitalId(e.target.value);
                    setMedicoId(''); // reiniciar médico al cambiar hospital
                    setSkip(0);
                  }}
                  className="input"
                >
                  <option value="">Todos los hospitales</option>
                  {hospitales.map((h) => (
                    <option key={h.id} value={h.id}>
                      {normalizarTextoVisible(h.nombre)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value="Derivado de tus pacientes"
                  disabled
                  readOnly
                  className="input bg-gray-100 text-gray-500 cursor-not-allowed"
                  title="El alcance se deriva automáticamente de tus pacientes asignados"
                />
              )}
            </div>

            {/* Médico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico</label>
              {isAdmin ? (
                <select
                  value={medicoId}
                  onChange={(e) => {
                    setMedicoId(e.target.value);
                    setSkip(0);
                  }}
                  className="input"
                >
                  <option value="">Todos los médicos</option>
                  {medicosFiltrados.map((m) => (
                    <option key={m.id} value={m.id}>
                      {normalizarTextoVisible(m.nombre)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={user.nombre}
                  disabled
                  readOnly
                  className="input bg-gray-100 text-gray-500 cursor-not-allowed"
                  title="Solo puedes ver tus propios pacientes"
                />
              )}
            </div>

            {/* Limpiar */}
            <div className="flex items-end">
              <button
                onClick={limpiarFiltros}
                disabled={!hayFiltrosActivos}
                className="btn btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando formularios...</p>
            </div>
          ) : error ? (
            <div className="m-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">
                No se encontraron formularios con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">CI / Documento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Formulario</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Médico</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hospital</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">F. Asignación</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">F. Respuesta</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => {
                      const nombre = normalizarTextoVisible(item.paciente_nombre || '') || `Paciente #${item.paciente_id}`;
                      return (
                        <tr key={item.asignacion_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {getInitials(nombre)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {item.paciente_documento || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {normalizarTextoVisible(item.formulario_titulo || '') || `Formulario #${item.formulario_id}`}
                            {item.numero_instancia > 1 && (
                              <span className="ml-2 text-xs text-gray-400">#{item.numero_instancia}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getEstadoBadge(item.estado)}`}>
                              {getEstadoLabel(item.estado)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {normalizarTextoVisible(item.medico_nombre || '') || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {normalizarTextoVisible(item.hospital_nombre || '') || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(item.fecha_asignacion)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(item.fecha_completado)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.estado === 'completado' && item.tiene_respuesta ? (
                              <button
                                onClick={() => verRespuesta(item.asignacion_id)}
                                className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors"
                              >
                                Ver respuesta
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 italic">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {total} resultado{total !== 1 ? 's' : ''} · Página {currentPage} de {totalPages}
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSkip(Math.max(0, skip - LIMIT))}
                    disabled={!puedeAnterior}
                    className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setSkip(skip + LIMIT)}
                    disabled={!puedeSiguiente}
                    className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal Ver respuesta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={cerrarModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {detalle ? normalizarTextoVisible(detalle.formulario_titulo || 'Respuesta del formulario') : 'Respuesta del formulario'}
              </h2>
              <button onClick={cerrarModal} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetalle ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto"></div>
                  <p className="mt-3 text-gray-600 text-sm">Cargando respuesta...</p>
                </div>
              ) : errorDetalle ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{errorDetalle}</div>
              ) : detalle ? (
                <>
                  {/* Metadatos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-gray-50 rounded-xl p-4 text-sm">
                    <div>
                      <span className="text-gray-500">Paciente:</span>{' '}
                      <span className="font-medium text-gray-900">{normalizarTextoVisible(detalle.paciente_nombre || '') || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">CI / Documento:</span>{' '}
                      <span className="font-medium text-gray-900">{detalle.paciente_documento || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Médico:</span>{' '}
                      <span className="font-medium text-gray-900">{normalizarTextoVisible(detalle.medico_nombre || '') || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Hospital:</span>{' '}
                      <span className="font-medium text-gray-900">{normalizarTextoVisible(detalle.hospital_nombre || '') || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Asignado:</span>{' '}
                      <span className="font-medium text-gray-900">{formatDate(detalle.fecha_asignacion)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Respondido:</span>{' '}
                      <span className="font-medium text-gray-900">{formatDate(detalle.fecha_completado)}</span>
                    </div>
                  </div>

                  {detalle.formulario_descripcion && (
                    <p className="text-sm text-gray-600 mb-4">{normalizarTextoVisible(detalle.formulario_descripcion)}</p>
                  )}

                  {/* Preguntas + respuestas */}
                  {detalle.preguntas && detalle.preguntas.length > 0 ? (
                    <div className="space-y-5">
                      {detalle.preguntas.map((campo, index) => {
                        const respuestasData = obtenerRespuestasData(detalle);
                        return (
                          <div key={campo.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {index + 1}. {normalizarTextoVisible(campo.label)}
                              {campo.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <div className="mt-1 p-3 bg-gray-50 rounded-lg">{renderRespuesta(campo, respuestasData)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Este formulario no tiene preguntas registradas.</p>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer modal */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button onClick={cerrarModal} className="btn btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
