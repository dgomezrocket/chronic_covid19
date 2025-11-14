import { z } from 'zod';
import { GeneroEnum } from '@chronic-covid19/shared-types';

// ========== LOGIN SCHEMA ==========
export const loginSchema = z.object({
  username: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

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