/**
 * Servicio de autenticación del paciente. Separa la lógica de datos (llamadas al
 * ApiClient + validación de rol) de la UI. El backend de `login`/`registerPaciente`
 * solo devuelve el token, así que aquí completamos con `getMe` y validamos que la
 * cuenta sea de rol PACIENTE (esta app es exclusiva para pacientes).
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

/** Registra un paciente; el backend auto-loguea devolviendo el token. */
export async function registrarPaciente(data: RegisterPacienteData): Promise<SesionPaciente> {
  const { access_token } = await apiClient.registerPaciente(data);
  return obtenerPacienteValidado(access_token);
}
