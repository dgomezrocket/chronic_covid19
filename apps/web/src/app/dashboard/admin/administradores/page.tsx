'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@chronic-covid19/api-client';
import { Admin } from '@chronic-covid19/shared-types';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createAdminSchema,
  updateAdminSchema,
  inviteAdminSchema,
  CreateAdminFormData,
  InviteAdminFormData,
} from '@chronic-covid19/api-client/dist/validation';

export default function AdministradoresAdminPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal invitar
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateAdminFormData>({
    resolver: zodResolver(editingAdmin ? updateAdminSchema : createAdminSchema) as any,
  });

  const {
    register: registerInvite,
    handleSubmit: handleSubmitInvite,
    formState: { errors: inviteErrors },
    reset: resetInvite,
  } = useForm<InviteAdminFormData>({
    resolver: zodResolver(inviteAdminSchema),
  });

  // Protección de ruta: solo admins autenticados
  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (user && user.rol !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Sincronizar token defensivamente
  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getAllAdmins(incluirInactivos);
      setAdmins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar administradores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incluirInactivos]);

  const handleOpenCreateModal = () => {
    setEditingAdmin(null);
    reset({
      documento: '',
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      confirmPassword: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    reset({
      documento: admin.documento,
      nombre: admin.nombre,
      email: admin.email,
      telefono: admin.telefono || '',
      password: '',
      confirmPassword: '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    reset();
  };

  const onSubmit = async (data: CreateAdminFormData) => {
    setSubmitting(true);
    setError('');
    try {
      if (editingAdmin) {
        await apiClient.updateAdmin(editingAdmin.id, {
          documento: data.documento,
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono || undefined,
        });
      } else {
        await apiClient.createAdmin({
          documento: data.documento,
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono || undefined,
          password: data.password,
        });
      }
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar administrador');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas desactivar a este administrador? No podrá iniciar sesión hasta ser reactivado.')) {
      return;
    }
    try {
      await apiClient.deactivateAdmin(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar administrador');
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await apiClient.reactivateAdmin(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reactivar administrador');
    }
  };

  const handleOpenInviteModal = () => {
    setInviteError('');
    setInviteSuccess('');
    resetInvite({ email: '' });
    setShowInviteModal(true);
  };

  const onInvite = async (data: InviteAdminFormData) => {
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await apiClient.inviteAdmin(data.email);
      setInviteSuccess(res.message || 'Invitación enviada correctamente.');
      resetInvite({ email: '' });
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Error al enviar la invitación');
    } finally {
      setInviting(false);
    }
  };

  // Filtro de búsqueda
  const adminsFiltrados = admins.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.nombre.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.documento?.toLowerCase().includes(q)
    );
  });

  const formatFecha = (fecha: string) => {
    try {
      return new Date(fecha).toLocaleDateString('es-PY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando administradores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-rose-600 transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Volver al Dashboard</span>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Administradores</h1>
              <p className="mt-2 text-gray-600">Administra las cuentas con acceso administrativo al sistema.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleOpenInviteModal}
                className="flex items-center space-x-2 bg-white border-2 border-rose-600 text-rose-600 px-5 py-3 rounded-xl font-semibold hover:bg-rose-50 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Invitar Administrador</span>
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 bg-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-700 transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Administrador</span>
              </button>
            </div>
          </div>

          {/* Barra de búsqueda + toggle inactivos */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center space-x-3 flex-1">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, email o documento..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirInactivos}
                onChange={(e) => setIncluirInactivos(e.target.checked)}
                className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
              />
              <span className="text-sm text-gray-700 font-medium">Mostrar inactivos</span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 bg-gradient-to-r from-rose-500 to-rose-700 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-medium opacity-90">Total de Administradores</p>
              <p className="text-4xl font-bold mt-1">{adminsFiltrados.length}</p>
              {searchQuery && adminsFiltrados.length !== admins.length && (
                <p className="text-xs mt-1 opacity-75">
                  Mostrando {adminsFiltrados.length} de {admins.length}
                </p>
              )}
            </div>
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lista */}
        {adminsFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No se encontraron administradores' : 'No hay administradores'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Intenta con otros términos de búsqueda' : 'Crea el primer administrador para comenzar'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center space-x-2 bg-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-700 transition-colors"
              >
                <span>Limpiar Búsqueda</span>
              </button>
            ) : (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center space-x-2 bg-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Crear Primer Administrador</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminsFiltrados.map((admin) => {
              const activo = admin.activo === 1;
              const esYoMismo = user?.id === admin.id;
              return (
                <div
                  key={admin.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 transition-all hover:shadow-xl"
                >
                  {/* Header */}
                  <div className={`p-4 ${activo ? 'bg-gradient-to-r from-rose-500 to-rose-700' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white line-clamp-2">{admin.nombre}</h3>
                        <span className="inline-block mt-2 px-3 py-1 bg-white bg-opacity-20 text-white text-xs font-semibold rounded-full">
                          {activo ? '✅ Activo' : '⛔ Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start space-x-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-semibold">Email:</p>
                        <p className="break-all">{admin.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <p><span className="font-semibold">Doc:</span> {admin.documento}</p>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p><span className="font-semibold">Tel:</span> {admin.telefono || 'No registrado'}</p>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p><span className="font-semibold">Creado:</span> {formatFecha(admin.fecha_creacion)}</p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex space-x-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleOpenEditModal(admin)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Editar</span>
                      </button>

                      {activo ? (
                        !esYoMismo && (
                          <button
                            onClick={() => handleDeactivate(admin.id)}
                            className="flex-1 flex items-center justify-center space-x-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            <span>Desactivar</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleReactivate(admin.id)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Reactivar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingAdmin ? '✏️ Editar Administrador' : '➕ Nuevo Administrador'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Documento *</label>
                <input
                  {...register('documento')}
                  type="text"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="1234567"
                />
                {errors.documento && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.documento.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo *</label>
                <input
                  {...register('nombre')}
                  type="text"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                />
                {errors.nombre && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  {...register('email')}
                  type="email"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="admin@saludenmapa.com"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <input
                  {...register('telefono')}
                  type="text"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="0981234567"
                />
                {errors.telefono && (
                  <p className="mt-2 text-sm text-red-600">⚠️ {errors.telefono.message}</p>
                )}
              </div>

              {!editingAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña *</label>
                    <input
                      {...register('password')}
                      type="password"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600">⚠️ {errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña *</label>
                    <input
                      {...register('confirmPassword')}
                      type="password"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">⚠️ {errors.confirmPassword.message}</p>
                    )}
                  </div>
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-rose-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Guardando...' : editingAdmin ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Invitar */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Invitar Administrador</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Ingresá el correo electrónico de la persona que querés invitar. Recibirá un enlace para completar sus datos y crear su contraseña.
            </p>

            {inviteSuccess ? (
              <div className="mb-4 bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-800 text-sm">
                {inviteSuccess}
              </div>
            ) : (
              <form onSubmit={handleSubmitInvite(onInvite)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input
                    {...registerInvite('email')}
                    type="email"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    placeholder="persona@ejemplo.com"
                  />
                  {inviteErrors.email && (
                    <p className="mt-2 text-sm text-red-600">⚠️ {inviteErrors.email.message}</p>
                  )}
                </div>

                {inviteError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-800 text-sm">
                    {inviteError}
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 bg-rose-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {inviting ? 'Enviando...' : 'Enviar invitación'}
                  </button>
                </div>
              </form>
            )}

            {inviteSuccess && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="bg-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-500 border-t border-gray-200 pt-6 max-w-7xl mx-auto">
        Proyecto PINV20-292 · CONACYT &amp; FEEI · © {new Date().getFullYear()} FP-UNA
      </footer>
    </div>
  );
}
