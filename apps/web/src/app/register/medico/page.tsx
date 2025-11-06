'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { apiClient } from '@chronic-covid19/api-client';
import { registerMedicoSchema, RegisterMedicoFormData } from '@chronic-covid19/api-client/dist/validation';
import { useAuthStore } from '@/store/authStore';
import { RolEnum, type Especialidad } from '@chronic-covid19/shared-types';

export default function RegisterMedicoPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterMedicoFormData>({
    resolver: zodResolver(registerMedicoSchema),
    defaultValues: {
      especialidad_ids: [],  // CAMBIO: de especialidades a especialidad_ids
      hospital_ids: [],
    },
  });

  // Cargar especialidades al montar el componente
  useEffect(() => {
    const loadEspecialidades = async () => {
      try {
        console.log('📡 Cargando especialidades desde la API...');
        const data = await apiClient.getAllEspecialidades(false);
        console.log('✅ Especialidades cargadas:', data);
        setEspecialidades(data);
      } catch (err) {
        console.error('❌ Error al cargar especialidades:', err);
        setError('No se pudieron cargar las especialidades. Por favor, recarga la página.');
      } finally {
        setLoadingEspecialidades(false);
      }
    };

    loadEspecialidades();
  }, []);

  const toggleEspecialidad = (id: number) => {
    let nuevasSeleccionadas;
    if (especialidadesSeleccionadas.includes(id)) {
      nuevasSeleccionadas = especialidadesSeleccionadas.filter(e => e !== id);
    } else {
      nuevasSeleccionadas = [...especialidadesSeleccionadas, id];
    }
    setEspecialidadesSeleccionadas(nuevasSeleccionadas);
    setValue('especialidad_ids', nuevasSeleccionadas);  // CAMBIO: de especialidades a especialidad_ids
  };

  const onSubmit = async (data: RegisterMedicoFormData) => {
    setLoading(true);
    setError('');

    try {
      console.log('📤 Datos del médico a registrar:', data);

      const response = await apiClient.registerMedico(data);

      console.log('✅ Médico registrado exitosamente:', response);

      const userInfo = await apiClient.getMe();

      login({
        user: {
          id: userInfo.id,
          email: userInfo.email,
          nombre: userInfo.nombre,
          rol: RolEnum.MEDICO,
        },
        token: response.access_token,
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('❌ Error en registro:', err);
      setError(err instanceof Error ? err.message : 'Error al registrar médico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Registro de Médico 🩺
          </h2>
          <p className="text-gray-600 text-lg">
            Completa tus datos para unirte al sistema
          </p>
        </div>

        {/* Formulario */}
        <div className="card">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Información Personal
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="documento" className="block text-sm font-semibold text-gray-700 mb-2">
                    Documento de Identidad *
                  </label>
                  <input
                    {...register('documento')}
                    type="text"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="1234567"
                  />
                  {errors.documento && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.documento.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    {...register('nombre')}
                    type="text"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Dr. Juan Pérez"
                  />
                  {errors.nombre && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="doctor@hospital.com"
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="telefono" className="block text-sm font-semibold text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    {...register('telefono')}
                    type="tel"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0981234567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {errors.password.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Especialidades (SELECCIÓN MÚLTIPLE) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Especialidades Médicas
              </h3>

              {loadingEspecialidades ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-3 text-gray-600">Cargando especialidades...</span>
                </div>
              ) : especialidades.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800">
                    No hay especialidades disponibles. Contacta al administrador.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Selecciona una o más especialidades (puedes elegir varias):
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                    {especialidades.map((esp) => (
                      <button
                        key={esp.id}
                        type="button"
                        onClick={() => toggleEspecialidad(esp.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          especialidadesSeleccionadas.includes(esp.id)
                            ? 'bg-green-50 border-green-500 shadow-md'
                            : 'bg-white border-gray-300 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {especialidadesSeleccionadas.includes(esp.id) ? (
                              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold text-sm ${
                              especialidadesSeleccionadas.includes(esp.id) ? 'text-green-900' : 'text-gray-900'
                            }`}>
                              {esp.nombre}
                            </p>
                            {esp.descripcion && (
                              <p className={`text-xs mt-1 ${
                                especialidadesSeleccionadas.includes(esp.id) ? 'text-green-700' : 'text-gray-600'
                              }`}>
                                {esp.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Contador de especialidades seleccionadas */}
                  {especialidadesSeleccionadas.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-sm text-green-800 font-semibold">
                        ✅ {especialidadesSeleccionadas.length} especialidad(es) seleccionada(s)
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Botones */}
            <div className="flex flex-col space-y-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-4 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 text-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Registrarse como Médico</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes una cuenta?{' '}
                  <Link href="/login" className="font-semibold text-green-600 hover:text-green-700 transition-colors">
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Volver al inicio</span>
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}