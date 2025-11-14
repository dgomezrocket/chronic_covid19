// Enums
export enum RolEnum {
  PACIENTE = "paciente",
  MEDICO = "medico",
  COORDINADOR = "coordinador",
  ADMIN = "admin"
}

export enum GeneroEnum {
  MASCULINO = "masculino",
  FEMENINO = "femenino"
}

// ========== ESPECIALIDAD ==========
export interface Especialidad {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: number;
}

// ========== HOSPITAL ==========
export interface Hospital {
  id: number;
  nombre: string;
  codigo?: string;
  departamento?: string;  // CAMBIO: provincia -> departamento
  ciudad?: string;        // CAMBIO: distrito -> ciudad
  barrio?: string;        // NUEVO: barrio/compañía/localidad
  latitud?: number;
  longitud?: number;
}

// ========== USER TYPES ==========
export interface Usuario {
  id: number;
  email: string;
  rol: RolEnum;
  nombre: string;
}

export interface Paciente extends Usuario {
  documento: string;
  fecha_nacimiento: string;
  genero: GeneroEnum;
  direccion?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
}

export interface Medico extends Usuario {
  documento: string;
  telefono?: string;
  especialidades: Especialidad[];
  hospitales: Hospital[];  // Array de objetos Hospital completos
}

export interface Coordinador extends Usuario {
  documento: string;
  hospital_id?: number;
  hospital?: Hospital;
}

// ========== AUTH TYPES ==========
export interface LoginCredentials {
  username: string; // email
  password: string;
}

export interface RegisterPacienteData {
  documento: string;
  nombre: string;
  fecha_nacimiento: string;
  genero: GeneroEnum;
  direccion?: string;
  email: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
  password: string;
}

export interface RegisterMedicoData {
  documento: string;
  nombre: string;
  email: string;
  telefono?: string;
  password: string;
  especialidad_ids?: number[];
  hospital_ids?: number[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ========== API RESPONSE TYPES ==========
export interface ApiError {
  detail: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// ========== MENSAJE ==========
export interface Mensaje {
  id: number;
  contenido: string;
  paciente_id: number;
  medico_id: number;
  timestamp: string;
  leido: number;
}

// ========== FORMULARIO ==========
export interface Formulario {
  id: number;
  tipo: string;
  preguntas: Record<string, any>;
  creador_id?: number;
  fecha_creacion: string;
}

export interface RespuestaFormulario {
  id: number;
  paciente_id: number;
  formulario_id: number;
  respuestas: Record<string, any>;
  timestamp: string;
}

// ========== ASIGNACION ==========
export interface Asignacion {
  id: number;
  paciente_id: number;
  medico_id: number;
  fecha_asignacion: string;
}

// ========== TIPOS PARA ESPECIALIDADES ==========

export interface Especialidad {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: number;
}

export interface EspecialidadCreate {
  nombre: string;
  descripcion?: string;
}

export interface EspecialidadUpdate {
  nombre?: string;
  descripcion?: string;
  activa?: number;
}

export interface MedicoEspecialidad {
  id: number;
  nombre: string;
  documento: string;
  email: string;
  hospital_id: number | null;
  hospital_nombre: string | null;
}

// ========== TIPOS PARA HOSPITALES ==========

export interface Hospital {
  id: number;
  nombre: string;
  codigo?: string;
  ciudad?: string;
  departamento?: string;
  barrio?: string;
  direccion?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
}

export interface HospitalCreate {
  nombre: string;
  codigo?: string;
  ciudad?: string;
  departamento?: string;
  barrio?: string;
  direccion?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
}

export interface HospitalUpdate {
  nombre?: string;
  codigo?: string;
  ciudad?: string;
  departamento?: string;
  barrio?: string;
  direccion?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
}

// ========== TIPOS PARA ADMINISTRADORES ==========

export interface Admin extends Usuario {
  documento: string;
  telefono?: string;
  activo: number;
  fecha_creacion: string;
}

export interface AdminCreate {
  nombre: string;
  email: string;
  documento: string;
  telefono?: string;
  password: string;
}

export interface AdminUpdate {
  nombre?: string;
  email?: string;
  telefono?: string;
  activo?: number;
}