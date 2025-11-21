
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@chronic-covid19/api-client';
import {
  updatePacienteSchema,
  UpdatePacienteFormData,
  updateMedicoSchema,
  UpdateMedicoFormData,
  updateAdminSchema,
  UpdateAdminFormData,
  updateCoordinadorProfileSchema,
  UpdateCoordinadorProfileFormData
} from '@chronic-covid19/api-client/dist/validation';
import { RolEnum, GeneroEnum, Especialidad } from '@chronic-covid19/shared-types';

// Importar LocationPicker de forma dinámica (no SSR)
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Cargando mapa...</div>
});

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // Estado para especialidades (médicos)
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<Especialidad[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false);

  // ✅ USAR EL SCHEMA CORRECTO SEGÚN EL ROL
  const getSchemaForRole = () => {
    if (!user) return updatePacienteSchema;

    switch (user.rol) {
      case RolEnum.PACIENTE:
        return updatePacienteSchema;
      case RolEnum.MEDICO:
        return updateMedicoSchema;
      case RolEnum.COORDINADOR:
      return updateCoordinadorProfileSchema;
      case RolEnum.ADMIN:
        return updateAdminSchema;
      default:
        return updatePacienteSchema;
    }
  };

const {
  register,
  handleSubmit,
  setValue,
  watch,
  formState: { errors },
  reset,
} = useForm<UpdatePacienteFormData | UpdateMedicoFormData | UpdateAdminFormData | UpdateCoordinadorProfileFormData>({
  resolver: zodResolver(getSchemaForRole()),
});

  const watchedFields = watch();

  // Log de debug cuando cambian los errores
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('⚠️ Errores de validación:', errors);
    }
  }, [errors]);

  // Cargar especialidades disponibles (solo para médicos)
  useEffect(() => {
    const loadEspecialidades = async () => {
      if (user?.rol === RolEnum.MEDICO && token) {
        try {
          setLoadingEspecialidades(true);
          apiClient.setToken(token);
          const especialidades = await apiClient.getAllEspecialidades();
          console.log('🩺 Especialidades disponibles:', especialidades);
          setEspecialidadesDisponibles(especialidades);
        } catch (err) {
          console.error('❌ Error al cargar especialidades:', err);
        } finally {
          setLoadingEspecialidades(false);
        }
      }
    };

    loadEspecialidades();
  }, [user, token]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Cargar datos completos del perfil
    const loadProfile = async () => {
      try {
        if (token && user) {
          apiClient.setToken(token);

          // Obtener datos completos según el rol
          let data;
          if (user.rol === RolEnum.PACIENTE) {
            data = await apiClient.getPaciente(user.id);
          } else if (user.rol === RolEnum.MEDICO) {
            data = await apiClient.getMedico(user.id);

            // Cargar especialidades del médico
            if (data.especialidades && data.especialidades.length > 0) {
              const especialidadIds = data.especialidades.map((esp: any) => esp.id);
              console.log('🩺 Especialidades actuales del médico:', especialidadIds);
              setEspecialidadesSeleccionadas(especialidadIds);
            }
          } else if (user.rol === RolEnum.ADMIN) {
            data = await apiClient.getAdmin(user.id);
            console.log('👑 Datos del administrador cargados:', data);
          } else if (user.rol === RolEnum.COORDINADOR) {
              console.log('👤 Cargando datos del coordinador para editar...');
              data = await apiClient.getCoordinadorById(user.id);
              console.log('✅ Datos del coordinador recibidos:', data);

          } else {
            data = await apiClient.getMe();
          }

          setProfileData(data);

          // Pre-llenar el formulario con los datos actuales
          reset({
            nombre: data.nombre || '',
            email: data.email || '',
            telefono: data.telefono || '',
            // Campos específicos de paciente
            ...(user.rol === RolEnum.PACIENTE && {
              fecha_nacimiento: data.fecha_nacimiento || '',
              genero: data.genero || '',
              direccion: data.direccion || '',
            }),
          });

          // Si tiene ubicación, guardarla y establecer en el formulario
          if (data.latitud && data.longitud) {
            const locationData = {
              lat: data.latitud,
              lng: data.longitud,
              address: data.direccion || ''
            };
            setLocation(locationData);
            setValue('latitud', data.latitud);
            setValue('longitud', data.longitud);
            setValue('direccion', data.direccion);
          }
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, router, token, user, reset, setValue]);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
    setValue('latitud', lat);
    setValue('longitud', lng);
    setValue('direccion', address);
  };

  const handleEspecialidadToggle = (especialidadId: number) => {
    setEspecialidadesSeleccionadas(prev => {
      if (prev.includes(especialidadId)) {
        return prev.filter(id => id !== especialidadId);
      } else {
        return [...prev, especialidadId];
      }
    });
  };

  const onSubmit = async (data: any) => {
    console.log('🟢 ========== onSubmit EJECUTADO ==========');
    console.log('📤 Datos del formulario:', data);

    if (!user) {
      console.log('❌ No hay usuario');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      console.log('👤 Usuario:', user);
      console.log('🔑 Token existe:', !!token);

      if (token) {
        apiClient.setToken(token);
      }

      // Actualizar según el rol
      if (user.rol === RolEnum.PACIENTE) {
        // Para pacientes: agregar coordenadas
        const updateData: UpdatePacienteFormData = {
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          fecha_nacimiento: data.fecha_nacimiento,
          genero: data.genero,
          direccion: data.direccion,
          latitud: location?.lat || profileData?.latitud,
          longitud: location?.lng || profileData?.longitud,
        };

        console.log('📤 Enviando actualización de PACIENTE:', updateData);
        const response = await apiClient.updatePaciente(user.id, updateData);
        console.log('✅ Respuesta del servidor (Paciente):', response);

      } else if (user.rol === RolEnum.MEDICO) {
        // Para médicos: solo datos básicos + especialidades (SIN coordenadas)
        const updateData: UpdateMedicoFormData = {
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          especialidad_ids: especialidadesSeleccionadas
        };

        console.log('📤 Enviando actualización de MÉDICO:', updateData);
        console.log('🩺 Especialidades seleccionadas:', especialidadesSeleccionadas);

        const response = await apiClient.updateMedico(user.id, updateData);
        console.log('✅ Respuesta del servidor (Médico):', response);

      } else if (user.rol === RolEnum.COORDINADOR) {
          const updateData: UpdateCoordinadorProfileFormData = {
            nombre: data.nombre,
            email: data.email,
            telefono: data.telefono,
          };

          console.log('📤 Enviando actualización de COORDINADOR:', updateData);
          const response = await apiClient.updateCoordinador(user.id, updateData);
          console.log('✅ Respuesta del servidor (Coordinador):', response);

      } else if (user.rol === RolEnum.ADMIN) {
        // Para administradores: solo datos básicos (nombre, email, telefono)
        const updateData: UpdateAdminFormData = {
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
        };

        console.log('📤 Enviando actualización de ADMINISTRADOR:', updateData);
        const response = await apiClient.updateAdmin(user.id, updateData);
        console.log('✅ Respuesta del servidor (Administrador):', response);
      }

      setSuccess('✅ Perfil actualizado correctamente. Redirigiendo...');

      // Redirigir con parámetro de actualización después de 1.5 segundos
      setTimeout(() => {
        router.push('/dashboard/profile?updated=true');
      }, 1500);

    } catch (err: any) {
      console.error('❌ Error completo:', err);
      console.error('❌ Error response:', err?.response);
      console.error('❌ Error data:', err?.response?.data);

      let errorMessage = 'Error al actualizar perfil';

      if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
      console.log('🟢 ========== onSubmit FINALIZADO ==========');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getRoleBadgeColor = (rol: RolEnum) => {
    switch (rol) {
      case RolEnum.PACIENTE:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case RolEnum.MEDICO:
        return 'bg-green-100 text-green-700 border-green-200';
      case RolEnum.COORDINADOR:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case RolEnum.ADMIN:
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleText = (rol: RolEnum) => {
    switch (rol) {
      case RolEnum.PACIENTE:
        return 'Paciente';
      case RolEnum.MEDICO:
        return 'Médico';
      case RolEnum.COORDINADOR:
        return 'Coordinador';
      case RolEnum.ADMIN:
        return 'Administrador';
      default:
        return rol;
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header/Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-custom">
          <div className="flex h-16 justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">MSP</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-900">PINV20-292</span>
                <span className="block text-xs text-gray-500">Editar Perfil</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.rol)}`}>
                      {getRoleText(user.rol)}
                    </span>
                  </div>
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
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/dashboard/profile" className="hover:text-blue-600 transition-colors">Mi Perfil</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold">Editar</span>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="card">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Editar Perfil</h2>
              <p className="text-gray-600">Actualiza tu información personal</p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-semibold">Error al guardar</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Personal</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Documento (Solo lectura para todos los roles que lo tienen) */}
                  {profileData?.documento && (
                    <div>
                      <label htmlFor="documento" className="block text-sm font-semibold text-gray-700 mb-2">
                        Documento de Identidad
                      </label>
                      <input
                        type="text"
                        value={profileData.documento}
                        disabled
                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">📌 El documento no puede ser modificado</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
                    </label>
                    <input
                      {...register('nombre')}
                      type="text"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Juan Pérez"
                    />
                    {errors.nombre && (
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{String(errors.nombre.message)}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tu@email.com"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{String(errors.email.message)}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="telefono" className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      {...register('telefono')}
                      type="tel"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0981234567"
                    />
                  </div>

                  {/* Campos específicos de PACIENTE */}
                  {user.rol === RolEnum.PACIENTE && (
                    <>
                      <div>
                        <label htmlFor="fecha_nacimiento" className="block text-sm font-semibold text-gray-700 mb-2">
                          Fecha de Nacimiento
                        </label>
                        <input
                          {...register('fecha_nacimiento')}
                          type="date"
                          className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="genero" className="block text-sm font-semibold text-gray-700 mb-2">
                          Género
                        </label>
                        <select
                          {...register('genero')}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar...</option>
                          <option value={GeneroEnum.MASCULINO}>Masculino</option>
                          <option value={GeneroEnum.FEMENINO}>Femenino</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Campos de solo lectura para ADMINISTRADOR */}
                  {user.rol === RolEnum.ADMIN && (
                    <>
                      {profileData?.fecha_creacion && (
                        <div className="md:col-span-2">
                          <label htmlFor="fecha_creacion" className="block text-sm font-semibold text-gray-700 mb-2">
                            Fecha de Creación de la Cuenta
                          </label>
                          <input
                            type="text"
                            value={new Date(profileData.fecha_creacion).toLocaleDateString('es-PY', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            disabled
                            className="block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                          <p className="mt-1 text-xs text-gray-500">📅 Fecha de registro en el sistema</p>
                        </div>
                      )}

                      {profileData?.activo !== undefined && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Estado de la Cuenta
                          </label>
                          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            {profileData.activo === 1 ? (
                              <>
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-green-900">Cuenta Activa</p>
                                  <p className="text-xs text-green-700">Tienes acceso completo al sistema</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-red-900">Cuenta Inactiva</p>
                                  <p className="text-xs text-red-700">Contacta a otro administrador</p>
                                </div>
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">🔒 El estado de la cuenta solo puede ser modificado por otro administrador</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Especialidades (solo para médicos) */}
              {user.rol === RolEnum.MEDICO && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Especialidades Médicas</span>
                  </h3>

                  {loadingEspecialidades ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Cargando especialidades...</p>
                    </div>
                  ) : especialidadesDisponibles.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Selecciona las especialidades médicas en las que ejerces:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                        {especialidadesDisponibles.map((especialidad) => (
                          <label
                            key={especialidad.id}
                            className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              especialidadesSeleccionadas.includes(especialidad.id)
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={especialidadesSeleccionadas.includes(especialidad.id)}
                              onChange={() => handleEspecialidadToggle(especialidad.id)}
                              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">
                                {especialidad.nombre}
                              </p>
                              {especialidad.descripcion && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {especialidad.descripcion}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <p className="text-sm text-green-800">
                          <strong>{especialidadesSeleccionadas.length}</strong> especialidad{especialidadesSeleccionadas.length !== 1 ? 'es' : ''} seleccionada{especialidadesSeleccionadas.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-600 font-semibold">No hay especialidades disponibles</p>
                      <p className="text-xs text-gray-500 mt-1">Contacta al administrador para agregar especialidades</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hospitales (solo mostrar, no editar - para médicos) */}
              {user.rol === RolEnum.MEDICO && profileData?.hospitales && profileData.hospitales.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Hospitales Vinculados (Solo Lectura)</span>
                  </h3>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-blue-800">
                        Los hospitales son asignados por el coordinador del sistema y no pueden ser editados desde aquí.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {profileData.hospitales.map((hospital: any) => (
                      <div
                        key={hospital.id}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-75"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900 text-base mb-1">
                              {hospital.nombre}
                            </h5>
                            <div className="space-y-1 text-sm text-gray-600">
                              {hospital.codigo && (
                                <p>Código: {hospital.codigo}</p>
                              )}
                              {(hospital.departamento || hospital.ciudad || hospital.barrio) && (
                                <p>
                                  📍 {[hospital.barrio, hospital.ciudad, hospital.departamento]
                                    .filter(Boolean)
                                    .join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ubicación (solo para pacientes) */}
              {user.rol === RolEnum.PACIENTE && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    📍 Ubicación de Residencia
                  </h3>
                  <p className="text-sm text-gray-600">
                    {location ? '✅ Ubicación actual registrada. ' : '⚠️ No hay ubicación registrada. '}
                    Puedes actualizar tu ubicación si te has mudado recientemente.
                  </p>

                  <LocationPicker
                    key={`edit-location-picker-${profileData?.id || 'new'}`}
                    onLocationSelect={handleLocationSelect}
                    initialLat={profileData?.latitud}
                    initialLng={profileData?.longitud}
                  />
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/profile"
                  className="flex-1 btn-outline text-center flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancelar</span>
                </Link>
              </div>
            </form>
          </div>
        </div>
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