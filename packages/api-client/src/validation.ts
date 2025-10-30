import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerPacienteSchema = z.object({
  documento: z.string().min(1, 'Documento es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  fecha_nacimiento: z.string(),
  genero: z.enum(['masculino', 'femenino', 'otro']),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

export type RegisterPacienteFormData = z.infer<typeof registerPacienteSchema>;