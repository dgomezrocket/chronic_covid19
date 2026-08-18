import { z } from 'zod';
import { GeneroEnum } from '@chronic-covid19/shared-types';

// ========== LOGIN SCHEMA ==========
export const loginSchema = z.object({
  username: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ========== FORGOT / RESET PASSWORD SCHEMAS ==========
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Ingresá el código recibido por email'),
  new_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ========== REGISTER PACIENTE SCHEMA ==========
export const registerPacienteSchema = z.object({
  documento: z.string().min(1, 'El documento es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  genero: z.nativeEnum(GeneroEnum, {
    errorMap: () => ({ message: 'Debe seleccionar un género' }),
  }),
  direccion: z.string().optional(),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type RegisterPacienteFormData = z.infer<typeof registerPacienteSchema>;

// ========== REGISTER MEDICO SCHEMA ==========
export const registerMedicoSchema = z.object({
  documento: z.string().min(1, 'El documento es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  especialidad_ids: z.array(z.number()).optional().default([]), // Array de IDs (números)
  hospital_ids: z.array(z.number()).optional().default([]),
});

export type RegisterMedicoFormData = z.infer<typeof registerMedicoSchema>;

// ========== UPDATE PACIENTE SCHEMA ==========
export const updatePacienteSchema = z.object({
  documento: z.string().min(1, 'El documento es requerido').optional(),
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  fecha_nacimiento: z.string().optional(),
  genero: z.nativeEnum(GeneroEnum, {
    errorMap: () => ({ message: 'Debe seleccionar un género' }),
  }).optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  email: z.string().email('Email inválido').optional(),
});

export type UpdatePacienteFormData = z.infer<typeof updatePacienteSchema>;

// ========== UPDATE MEDICO SCHEMA ==========
export const updateMedicoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  especialidad_ids: z.array(z.number()).optional(),
  telefono: z.string().optional(),
  hospital_ids: z.array(z.number()).optional(),
});

export type UpdateMedicoFormData = z.infer<typeof updateMedicoSchema>;


// ========== UPDATE ADMIN SCHEMA ==========
export const updateAdminSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
  documento: z.string().optional(),
});

export type UpdateAdminFormData = z.infer<typeof updateAdminSchema>;


// ========== 🆕 COORDINADOR SCHEMAS ==========

// ========== UPDATE COORDINADOR SCHEMA (para que el coordinador pueda editar su propio perfil) ==========
export const updateCoordinadorProfileSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
});

export type UpdateCoordinadorProfileFormData = z.infer<typeof updateCoordinadorProfileSchema>;

/**
 * Schema para registrar un coordinador (solo admin)
 */
export const registerCoordinadorSchema = z.object({
  documento: z.string()
    .min(3, 'El documento debe tener al menos 3 caracteres')
    .max(20, 'El documento no puede tener más de 20 caracteres'),
  nombre: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  email: z.string()
    .email('Debe ser un email válido'),
  telefono: z.string()
    .min(6, 'El teléfono debe tener al menos 6 caracteres')
    .max(20, 'El teléfono no puede tener más de 20 caracteres')
    .optional(),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  hospital_id: z.number()
    .int('El ID del hospital debe ser un número entero')
    .positive('El ID del hospital debe ser positivo')
    .optional(),
});

/**
 * Schema para actualizar un coordinador (solo admin)
 */
export const updateCoordinadorSchema = z.object({
  documento: z.string()  // ⬅️ AGREGAR ESTA LÍNEA
    .min(3, 'El documento debe tener al menos 3 caracteres')
    .max(20, 'El documento no puede tener más de 20 caracteres')
    .optional(),
  nombre: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres')
    .optional(),
  email: z.string()
    .email('Debe ser un email válido')
    .optional(),
  telefono: z.string()
    .min(6, 'El teléfono debe tener al menos 6 caracteres')
    .max(20, 'El teléfono no puede tener más de 20 caracteres')
    .optional(),
  hospital_id: z.number()
    .int('El ID del hospital debe ser un número entero')
    .positive('El ID del hospital debe ser positivo')
    .optional(), // ✅ FIX: Removido .nullable()
});

// ========== 🆕 ASIGNACION SCHEMAS ==========

/**
 * Schema para asignar un médico a un hospital
 */
export const asignarMedicoHospitalSchema = z.object({
  medico_id: z.number()
    .int('El ID del médico debe ser un número entero')
    .positive('El ID del médico debe ser positivo'),
  hospital_id: z.number()
    .int('El ID del hospital debe ser un número entero')
    .positive('El ID del hospital debe ser positivo'),
});

/**
 * Schema para asignar un médico a un paciente
 */
export const asignarMedicoPacienteSchema = z.object({
  paciente_id: z.number()
    .int('El ID del paciente debe ser un número entero')
    .positive('El ID del paciente debe ser positivo'),
  medico_id: z.number()
    .int('El ID del médico debe ser un número entero')
    .positive('El ID del médico debe ser positivo'),
  notas: z.string()
    .max(500, 'Las notas no pueden tener más de 500 caracteres')
    .optional(),
});

/**
 * Schema para búsqueda de pacientes
 */
export const buscarPacienteSchema = z.object({
  query: z.string()
    .min(1, 'Debe ingresar al menos 1 carácter para buscar')
    .max(50, 'La búsqueda no puede tener más de 50 caracteres'),
});

/**
 * Schema para obtener pacientes sin hospital
 */
export const pacientesSinHospitalSchema = z.object({
  lat: z.number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida')
    .optional(),
  lon: z.number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida')
    .optional(),
  radio_km: z.number()
    .positive('El radio debe ser positivo')
    .max(500, 'El radio no puede ser mayor a 500 km')
    .optional()
    .default(50),
});

// ========== TIPOS INFERIDOS ==========

export type RegisterCoordinadorFormData = z.infer<typeof registerCoordinadorSchema>;
export type UpdateCoordinadorFormData = z.infer<typeof updateCoordinadorSchema>;
export type AsignarMedicoHospitalFormData = z.infer<typeof asignarMedicoHospitalSchema>;
export type AsignarMedicoPacienteFormData = z.infer<typeof asignarMedicoPacienteSchema>;
export type BuscarPacienteFormData = z.infer<typeof buscarPacienteSchema>;
export type PacientesSinHospitalFormData = z.infer<typeof pacientesSinHospitalSchema>;