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

// ========== USER TYPES ==========
export interface Usuario {
  id: number;
  email: string;
  rol: RolEnum;
  nombre: string;
  debe_cambiar_password?: boolean;
}

export interface Paciente extends Usuario {
  documento: string;
  fecha_nacimiento: string;
  genero: GeneroEnum;
  direccion?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
  hospital_id?: number;
  hospital?: Hospital;
  medico_asignado?: Medico;
}

export interface Medico extends Usuario {
  documento: string;
  telefono?: string;
  especialidades: Especialidad[];
  hospitales: Hospital[];  // Array de objetos Hospital completos
}

export interface Coordinador extends Usuario {
  documento: string;
  telefono?: string;
  hospital_id?: number;
  hospital?: Hospital;
}

// ========== AUTH TYPES ==========
export interface LoginCredentials {
  username: string; // email
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  new_password: string;
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

// ========== IMPORTACIÓN MASIVA DE MÉDICOS ==========
export interface MedicoImportErrorRow {
  fila: number;
  medico?: string;
  resultado: string;
}

export interface MedicoImportResult {
  hospital: string;
  procesados: number;
  creados: number;
  con_error: number;
  correos_enviados: number;
  correos_con_error: number;
  errores: MedicoImportErrorRow[];
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

// ========== ASIGNACION ==========
export interface Asignacion {
  id: number;
  paciente_id: number;
  medico_id: number;
  fecha_asignacion: string;
  activo: boolean;          // 🆕 NUEVO
  notas?: string;           // 🆕 NUEVO
  fecha_desactivacion?: string;  // 🆕 NUEVO
  paciente?: Paciente;      // 🆕 NUEVO
  medico?: Medico;          // 🆕 NUEVO
}

// ========== TIPOS PARA ESPECIALIDADES ==========

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

// ========== 🆕 COORDINADORES (adicionales) ==========

export interface CoordinadorCreate {
  documento: string;
  nombre: string;
  email: string;
  password: string;
  hospital_id?: number;
}

export interface CoordinadorUpdate {
  documento?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  hospital_id?: number;
}

// ========== 🆕 ASIGNACIONES (adicionales) ==========

export interface AsignacionCreate {
  paciente_id: number;
  medico_id: number;
  notas?: string;
}

export interface AsignacionMedicoHospital {
  medico_id: number;
  hospital_id: number;
}

// ========== 🆕 INTERFACES EXTENDIDAS ==========

export interface HospitalDetallado extends Hospital {
  coordinadores?: Coordinador[];
  medicos?: Medico[];
  pacientes_count?: number;
}

export interface PacienteConAsignacion extends Paciente {
  asignaciones?: Asignacion[];
  medico_asignado?: Medico;
}

export interface MedicoConHospitales extends Medico {
  hospitales: Hospital[];
}

export interface HospitalConDistancia extends Hospital {
  distancia_km?: number;
}

export interface HospitalesCercanosResponse {
  tiene_ubicacion: boolean;
  latitud?: number;
  longitud?: number;
  hospitales: HospitalConDistancia[];
}

export interface PacienteSinHospital {
  id: number;
  documento: string;
  nombre: string;
  email: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
  direccion?: string;
  hospitales_cercanos?: HospitalConDistancia[];
}

export interface BuscarPacienteResult {
  id: number;
  documento: string;
  nombre: string;
  email: string;
  telefono?: string;
  hospital?: Hospital;
  medico_asignado?: Medico;
  asignacion_activa?: Asignacion;
}

// ========== 🆕 DASHBOARD DE COORDINADOR ==========

export interface CoordinadorDashboard {
  coordinador: Coordinador;
  hospital?: HospitalDetallado;
  total_medicos: number;
  total_pacientes: number;
  pacientes_asignados: number;
  pacientes_sin_asignar: number;
}

export interface EstadisticasHospital {
  hospital_id: number;
  hospital_nombre: string;
  total_medicos: number;
  total_pacientes: number;
  pacientes_asignados: number;
  pacientes_sin_medico: number;
  porcentaje_cobertura: number;
  medicos_por_especialidad: Record<string, number>;
}

// ========== 🆕 RESPUESTAS DE OPERACIONES ==========

export interface OperacionExitosa {
  message: string;
  id?: number;
}

export interface AsignacionSuccess {
  message: string;
  asignacion: Asignacion;
}

// ========== FORMULARIOS (Extendidos) ==========

export interface PreguntaFormulario {
  id: string;
  type: 'text' | 'number' | 'select' | 'date';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
}

export interface Formulario {
  id: number;
  tipo: string;
  titulo?: string;
  descripcion?: string;
  preguntas: PreguntaFormulario[];
  creador_id?: number;
  fecha_creacion: string;
  fecha_actualizacion?: string;
  activo: boolean;
  meta?: Record<string, any>;
}

export interface FormularioCreate {
  tipo?: string;
  titulo: string;
  descripcion?: string;
  preguntas: PreguntaFormulario[];
  meta?: Record<string, any>;
}

export interface FormularioUpdate {
  tipo?: string;
  titulo?: string;
  descripcion?: string;
  preguntas?: PreguntaFormulario[];
  activo?: boolean;
  meta?: Record<string, any>;
}

export interface FormularioListItem {
  id: number;
  tipo: string;
  titulo?: string;
  descripcion?: string;
  creador_id?: number;
  fecha_creacion: string;
  activo: boolean;
}

// ========== ASIGNACIONES DE FORMULARIOS ==========

export type EstadoAsignacion = 'pendiente' | 'completado' | 'expirado' | 'cancelado';

export interface FormularioAsignacion {
  id: number;
  formulario_id: number;
  paciente_id: number;
  asignado_por: number;
  fecha_asignacion: string;
  fecha_expiracion?: string;
  fecha_completado?: string;
  numero_instancia: number;
  estado: EstadoAsignacion;
  datos_extra?: Record<string, any>;
}

export interface FormularioAsignacionCreate {
  formulario_id: number;
  paciente_id: number;
  fecha_expiracion?: string;
  datos_extra?: Record<string, any>;
}

export interface FormularioAsignacionDetalle extends FormularioAsignacion {
  formulario_titulo?: string;
  formulario_tipo: string;
  formulario_descripcion?: string;
  paciente_nombre?: string;
  paciente_documento?: string;
}

// ========== RESPUESTAS DE FORMULARIOS ==========

export interface RespuestaFormulario {
  id: number;
  paciente_id: number;
  formulario_id: number;
  asignacion_id?: number;
  respuestas: Record<string, any>;
  timestamp: string;
}

export interface RespuestaFormularioCreate {
  formulario_id: number;
  asignacion_id?: number;
  respuestas: Record<string, any>;
}

// ========== NUEVOS TIPOS PARA VER RESPUESTAS ==========

export interface FormularioPacienteDetalle {
  asignacion_id: number;
  formulario_id: number;
  formulario_titulo?: string;
  formulario_tipo: string;
  fecha_asignacion: string;
  fecha_expiracion?: string;
  fecha_completado?: string;
  estado: EstadoAsignacion;
  numero_instancia: number;
  tiene_respuesta: boolean;
  respuesta?: {
    id: number;
    respuestas: Record<string, any>;
    timestamp: string;
  };
}

export interface AsignacionConRespuesta extends FormularioAsignacion {
  paciente_nombre?: string;
  paciente_documento?: string;
  tiene_respuesta: boolean;
  respuesta?: RespuestaFormulario;
}

// ========== RESUMEN DE RESPUESTAS (pantalla "Respuestas Formularios") ==========

/** Fila del listado consolidado de asignaciones de formularios + estado de respuesta */
export interface ResumenRespuestaItem {
  asignacion_id: number;
  formulario_id: number;
  formulario_titulo?: string;
  estado: EstadoAsignacion;
  numero_instancia: number;
  paciente_id: number;
  paciente_nombre?: string;
  paciente_documento?: string;
  medico_id?: number;
  medico_nombre?: string;
  hospital_id?: number;
  hospital_nombre?: string;
  fecha_asignacion?: string;
  fecha_completado?: string;
  tiene_respuesta: boolean;
}

/** Respuesta paginada del endpoint GET /formularios/respuestas */
export interface ResumenRespuestasResponse {
  total: number;
  items: ResumenRespuestaItem[];
}

/** Filtros del listado de respuestas (los de médico se ignoran/derivan en backend) */
export interface FiltrosRespuestas {
  paciente?: string;
  estado?: EstadoAsignacion | 'todos';
  medico_id?: number;
  hospital_id?: number;
  skip?: number;
  limit?: number;
}

/** Detalle de solo lectura: preguntas + respuestas de una asignación */
export interface RespuestaFormularioDetalle {
  asignacion_id: number;
  formulario_id: number;
  formulario_titulo?: string;
  formulario_descripcion?: string;
  preguntas: PreguntaFormulario[];
  respuestas?: Record<string, any>;
  estado: EstadoAsignacion;
  paciente_id: number;
  paciente_nombre?: string;
  paciente_documento?: string;
  medico_id?: number;
  medico_nombre?: string;
  hospital_id?: number;
  hospital_nombre?: string;
  fecha_asignacion?: string;
  fecha_completado?: string;
}