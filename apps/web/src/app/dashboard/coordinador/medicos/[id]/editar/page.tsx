'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import {
  updateMedicoCoordinadorSchema,
  UpdateMedicoCoordinadorFormData,
} from '@chronic-covid19/api-client/dist/validation';
import { RolEnum, Medico, Especialidad } from '@chronic-covid19/shared-types';

export default function EditarMedicoCoordinadorPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, token, logout } = useAuthStore();

  const medicoId = Number(params?.id);

  const [medico, setMedico] = useState<Medico | null>(null);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Error de carga: incluye el 403 del backend cuando el médico es de otro hospital.
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateMedicoCoordinadorFormData>({
    resolver: zodResolver(updateMedicoCoordinadorSchema),
    defaultValues: { especialidad_ids: [] },
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.rol !== RolEnum.COORDINADOR) {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [isAuthenticated, user, router, token, medicoId]);

  const loadData = async () => {
    if (!Number.isInteger(medicoId) || medicoId <= 0) {
      setLoadError('El identificador del médico no es válido');
      setLoading(false);
      return;
    }

    try {
      if (token) {
        apiClient.setToken(token);

        // getCoordinadorMedico (no getMedico): es el endpoint acotado al hospital del
        // coordinador, así que un médico de otro hospital devuelve 403 acá.
        const [medicoData, especialidadesData] = await Promise.all([
          apiClient.getCoordinadorMedico(medicoId),
          apiClient.getAllEspecialidades(),
        ]);

        setMedico(medicoData);
        setEspecialidades(especialidadesData);

        const idsEspecialidades = (medicoData.especialidades || []).map((esp) => esp.id);
        setEspecialidadesSeleccionadas(idsEspecialidades);

        reset({
          documento: medicoData.documento,
          nombre: medicoData.nombre,
          email: medicoData.email,
          telefono: medicoData.telefono || '',
          especialidad_ids: idsEspecialidades,
        });
      }
    } catch (err: any) {
      console.error('❌ Error al cargar el médico:', err);
      setLoadError(err?.message || 'Error al cargar el médico');
    } finally {
      setLoading(false);
    }
  };

  const toggleEspecialidad = (especialidadId: number) => {
    const nuevasSeleccionadas = especialidadesSeleccionadas.includes(especialidadId)
      ? especialidadesSeleccionadas.filter((id) => id !== especialidadId)
      : [...especialidadesSeleccionadas, especialidadId];

    setEspecialidadesSeleccionadas(nuevasSeleccionadas);
    setValue('especialidad_ids', nuevasSeleccionadas);
  };

  const onSubmit = async (data: UpdateMedicoCoordinadorFormData) => {
    if (!token) {
      setError('No hay sesión activa. Por favor inicia sesión nuevamente.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      apiClient.setToken(token);

      await apiClient.updateCoordinadorMedico(medicoId, {
        documento: data.documento,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || '',
        especialidad_ids: especialidadesSeleccionadas,
      });

      setSuccess('✅ Médico actualizado correctamente. Redirigiendo...');
      setTimeout(() => router.push('/dashboard/coordinador/medicos'), 1500);
    } catch (err: any) {
      console.error('❌ Error al actualizar médico:', err);
      setError(err?.message || 'Error al guardar los cambios');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos del médico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard/coordinador" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">Editar Médico</span>
                <span className="block text-xs text-gray-500">Médicos del hospital</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border-purple-200">
                    Coordinador
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
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
          <Link href="/dashboard" className="hover:text-purple-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/dashboard/coordinador" className="hover:text-purple-600 transition-colors">Coordinador</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/dashboard/coordinador/medicos" className="hover:text-purple-600 transition-colors">Médicos</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">Editar</span>
        </div>

        {loadError ? (
          <div className="card">
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-900">No se pudo abrir el médico</p>
                <p className="text-sm text-red-800 mt-1">{loadError}</p>
              </div>
            </div>
            <Link
              href="/dashboard/coordinador/medicos"
              className="inline-block mt-4 text-sm font-semibold text-purple-700 hover:text-purple-900"
            >
              ← Volver a la lista de médicos
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Médico</h1>
              <p className="text-gray-600">
                Modifica los datos de {medico?.nombre}
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Datos del médico</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    {...register('nombre')}
                    type="text"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.nombre && 'message' in errors.nombre && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Documento de identidad *
                  </label>
                  <input
                    {...register('documento')}
                    type="text"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.documento && 'message' in errors.documento && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.documento.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.email && 'message' in errors.email && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.email.message}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Es el usuario con el que inicia sesión: si lo cambiás, cambia su acceso.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                  <input
                    {...register('telefono')}
                    type="tel"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {errors.telefono && 'message' in errors.telefono && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.telefono.message}</p>
                  )}
                </div>
              </div>

              {/* Especialidades */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Especialidades</h3>

                {especialidades.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">
                      No hay especialidades disponibles. Contacta al administrador.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Selecciona una o más especialidades (opcional):
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                      {especialidades.map((esp) => (
                        <button
                          key={esp.id}
                          type="button"
                          onClick={() => toggleEspecialidad(esp.id)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            especialidadesSeleccionadas.includes(esp.id)
                              ? 'bg-purple-50 border-purple-500 shadow-md'
                              : 'bg-white border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {especialidadesSeleccionadas.includes(esp.id) ? (
                                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className={`font-semibold text-sm ${
                                especialidadesSeleccionadas.includes(esp.id) ? 'text-purple-900' : 'text-gray-900'
                              }`}>
                                {esp.nombre}
                              </p>
                              {esp.descripcion && (
                                <p className={`text-xs mt-1 ${
                                  especialidadesSeleccionadas.includes(esp.id) ? 'text-purple-700' : 'text-gray-600'
                                }`}>
                                  {esp.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {especialidadesSeleccionadas.length > 0 && (
                      <p className="text-sm text-purple-700 font-semibold">
                        ✅ {especialidadesSeleccionadas.length} especialidad(es) seleccionada(s)
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Hospitales: solo lectura. El vínculo se gestiona con Asignar/Remover. */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Hospitales</h3>

                {medico?.hospitales && medico.hospitales.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {medico.hospitales.map((hosp) => (
                      <span
                        key={hosp.id}
                        className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg"
                      >
                        {hosp.nombre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin hospitales asociados.</p>
                )}

                <p className="text-xs text-gray-500">
                  Los hospitales no se editan desde acá: se gestionan con "Asignar Médico" y
                  "Remover" en la lista de médicos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/dashboard/coordinador/medicos"
                  className="flex-1 btn-outline text-center"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="container-custom py-6 mt-12 border-t border-gray-100">
        <p className="text-center text-xs text-gray-500">
          Proyecto PINV20-292 · CONACYT & FEEI · © {new Date().getFullYear()} FP-UNA
        </p>
      </footer>
    </div>
  );
}
