'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { RolEnum, HospitalesCercanosResponse, HospitalConDistancia } from '@chronic-covid19/shared-types';
import { apiClient } from '@chronic-covid19/api-client';

const HospitalesMap = dynamic(() => import('@/components/HospitalesMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full rounded-xl border-2 border-blue-300 shadow-lg flex items-center justify-center bg-blue-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  ),
});

function formatDistancia(km?: number): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function gmapsUrl(h: HospitalConDistancia, pacLat: number, pacLon: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${pacLat},${pacLon}&destination=${h.latitud},${h.longitud}`;
}

export default function HospitalesCercanosPage() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();

  const [data, setData] = useState<HospitalesCercanosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard de autenticación y rol
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.rol !== RolEnum.PACIENTE) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Cargar hospitales cercanos
  useEffect(() => {
    if (user?.rol !== RolEnum.PACIENTE || !token) return;
    apiClient.setToken(token);
    setLoading(true);
    setError(null);
    apiClient
      .getMisHospitalesCercanos()
      .then(setData)
      .catch((err: any) => setError(err?.message || 'No se pudieron cargar los hospitales cercanos'))
      .finally(() => setLoading(false));
  }, [user, token]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const hospitales = data?.hospitales ?? [];

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
                <span className="block text-xs text-gray-500">Hospitales Cercanos</span>
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Volver al Dashboard</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container-custom py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Buscar Hospitales Cercanos 🏥
          </h1>
          <p className="text-gray-600 text-lg">
            Hospitales ordenados según tu ubicación registrada, del más cercano al más lejano.
          </p>
        </div>

        {/* Estado: cargando */}
        {loading && (
          <div className="card flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Buscando hospitales cercanos...</span>
          </div>
        )}

        {/* Estado: error */}
        {!loading && error && (
          <div className="card border-red-200 bg-red-50">
            <p className="text-red-700 font-medium">Ocurrió un error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Estado: sin ubicación registrada */}
        {!loading && !error && data && !data.tiene_ubicacion && (
          <div className="card border-amber-200 bg-amber-50">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Ubicación no registrada</h3>
                <p className="text-gray-700 mb-4">
                  No tenemos registrada tu ubicación. Actualiza tu ubicación para poder buscar hospitales cercanos.
                </p>
                <Link
                  href="/dashboard/profile/edit"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Actualizar mi ubicación</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Estado: con ubicación */}
        {!loading && !error && data && data.tiene_ubicacion && (
          <div className="space-y-6">
            {/* Mapa */}
            {data.latitud != null && data.longitud != null && (
              <HospitalesMap
                pacienteLat={data.latitud}
                pacienteLon={data.longitud}
                hospitales={hospitales}
              />
            )}

            {/* Sin hospitales con coordenadas */}
            {hospitales.length === 0 && (
              <div className="card">
                <p className="text-gray-600">
                  No se encontraron hospitales con ubicación disponible en el sistema.
                </p>
              </div>
            )}

            {/* Lista de hospitales */}
            {hospitales.length > 0 && (
              <div className="space-y-4">
                {hospitales.map((h, index) => {
                  const esMasCercano = index === 0;
                  return (
                    <div
                      key={h.id}
                      className={`card transition-all duration-300 ${
                        esMasCercano
                          ? 'border-2 border-rose-400 shadow-xl ring-1 ring-rose-200'
                          : 'border border-gray-100 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                              esMasCercano
                                ? 'bg-gradient-to-br from-rose-500 to-rose-600'
                                : 'bg-gradient-to-br from-blue-500 to-blue-600'
                            }`}
                          >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900">{h.nombre}</h3>
                              {esMasCercano && (
                                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                                  Más cercano
                                </span>
                              )}
                            </div>
                            {h.direccion && (
                              <p className="text-sm text-gray-600">{h.direccion}</p>
                            )}
                            {(h.barrio || h.ciudad || h.departamento) && (
                              <p className="text-sm text-gray-500">
                                {[h.barrio, h.ciudad, h.departamento].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {h.distancia_km != null && (
                              <p className="text-sm font-semibold text-blue-600 mt-1">
                                📍 A {formatDistancia(h.distancia_km)} de ti
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col gap-2 md:items-end md:w-52 flex-shrink-0">
                          {h.latitud != null && h.longitud != null && data.latitud != null && data.longitud != null && (
                            <a
                              href={gmapsUrl(h, data.latitud, data.longitud)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 w-full"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              <span>Ir con Google Maps</span>
                            </a>
                          )}
                          {h.telefono && (
                            <a
                              href={`tel:${h.telefono}`}
                              className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all duration-200 w-full"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{h.telefono}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
