import { z } from 'zod';
import { GeneroEnum } from '@chronic-covid19/shared-types';

// Login Schema
export const loginSchema = z.object({
  username: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register Paciente Schema
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

// Register Medico Schema
export const registerMedicoSchema = z.object({
  documento: z.string().min(1, 'El documento es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  especialidad: z.string().optional(),
  hospital_id: z.number().optional(),
});

export type RegisterMedicoFormData = z.infer<typeof registerMedicoSchema>;

// Update Paciente Schema
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

// Update Medico Schema
export const updateMedicoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
});

export type UpdateMedicoFormData = z.infer<typeof updateMedicoSchema>;

