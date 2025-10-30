// Enums
export enum RolEnum {
  PACIENTE = "paciente",
  MEDICO = "medico",
  COORDINADOR = "coordinador"
}

export enum GeneroEnum {
  MASCULINO = "masculino",
  FEMENINO = "femenino",
  OTRO = "otro"
}

// User types
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
  especialidad?: string;
  hospital_id?: number;
}

export interface Coordinador extends Usuario {
  documento: string;
  hospital_id?: number;
}

// Auth types
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
  password: string;
  especialidad?: string;
  hospital_id?: number;
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

// API Response types
export interface ApiError {
  detail: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}