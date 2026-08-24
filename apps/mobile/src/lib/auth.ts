/**
 * Servicio de autenticación del paciente. Separa la lógica de datos (llamadas al
 * ApiClient + validación de rol) de la UI. El backend de `login` solo devuelve el
 * token, así que aquí completamos con `getMe` y validamos que la cuenta sea de rol
 * PACIENTE (esta app es exclusiva para pacientes).
 *
 * F04: `registerPaciente` NO devuelve token. La cuenta nueva queda pendiente de
 * verificar el email y recién después puede iniciar sesión, así que el registro no
 * abre sesión. La verificación se hace desde el enlace del correo (web /verify-email).
 */
import { RolEnum } from '@chronic-covid19/shared-types';
import type { Usuario, RegisterPacienteData } from '@chronic-covid19/shared-types';
import { apiClient } from './api';

export interface SesionPaciente {
  user: Usuario;
  token: string;
}

/** Se lanza cuando la cuenta autenticada no es de un paciente. */
export class RolNoPermitidoError extends Error {
  constructor() {
    super('Esta cuenta no corresponde a un paciente. Usá el portal web correspondiente.');
    this.name = 'RolNoPermitidoError';
  }
}

/**
 * Con el token ya seteado en el ApiClient, obtiene el usuario, valida el rol y
 * arma el objeto Usuario. Si el rol no es PACIENTE, limpia el token y lanza error.
 */
async function obtenerPacienteValidado(token: string): Promise<SesionPaciente> {
  const me = await apiClient.getMe();

  if (!me || me.rol !== RolEnum.PACIENTE) {
    apiClient.clearToken();
    throw new RolNoPermitidoError();
  }

  const user: Usuario = {
    id: me.id,
    email: me.email,
    nombre: me.nombre,
    rol: RolEnum.PACIENTE,
    debe_cambiar_password: Boolean(me.debe_cambiar_password),
  };

  return { user, token };
}

/** Inicia sesión y valida que sea un paciente. */
export async function loginPaciente(username: string, password: string): Promise<SesionPaciente> {
  const { access_token } = await apiClient.login({ username, password });
  return obtenerPacienteValidado(access_token);
}

/** Resultado del registro: la cuenta existe pero falta verificar el correo. */
export interface RegistroPendienteVerificacion {
  email: string;
  mensaje: string;
}

/**
 * Registra un paciente. No inicia sesión: el backend deja la cuenta pendiente de
 * verificar el email y envía un correo con el enlace de verificación (F04).
 */
export async function registrarPaciente(
  data: RegisterPacienteData,
): Promise<RegistroPendienteVerificacion> {
  const res = await apiClient.registerPaciente(data);
  return { email: res.email, mensaje: res.message };
}
