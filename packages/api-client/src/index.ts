import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  LoginCredentials,
  RegisterPacienteData,
  RegisterMedicoData,
  TokenResponse,
  Paciente,
  Medico,
  ApiError,
  Especialidad,
  EspecialidadCreate,
  EspecialidadUpdate,
  MedicoEspecialidad,
  Hospital,
  HospitalCreate,
  HospitalUpdate,
  Admin,
  AdminCreate,
  AdminUpdate
} from '@chronic-covid19/shared-types';

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

constructor(baseURL?: string) {
  const API_URL = baseURL ||
                  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
                  'http://localhost:8000';

  this.client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  // Interceptor para agregar el token
  this.client.interceptors.request.use((config) => {
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
      console.log('🔒 Token agregado al header:', this.token.substring(0, 20) + '...');
    } else {
      console.log('⚠️ No hay token para agregar al header');
    }
    return config;
  });

  // Interceptor para logging de requests
  this.client.interceptors.request.use(
    (config) => {
      console.log('🚀 Request:', config.method?.toUpperCase(), config.url);
      console.log('🔑 Authorization header:', config.headers.Authorization ? 'Presente' : 'Ausente');
      return config;
    },
    (error) => {
      console.error('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );


    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('❌ Response Error:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
        return Promise.reject(error);
      }
    );
  }

setToken(token: string) {
  console.log('🔐 setToken llamado con:', token.substring(0, 20) + '...');
  this.token = token;
}

clearToken() {
  console.log('🔓 clearToken llamado');
  this.token = null;
}

  getToken(): string | null {
    return this.token;
  }

  // ========== AUTH ENDPOINTS ==========

  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);

      const response = await this.client.post<TokenResponse>(
        '/auth/login',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.setToken(response.data.access_token);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async registerPaciente(data: RegisterPacienteData): Promise<TokenResponse> {
    try {
      console.log('📤 Registering paciente:', data);
      const response = await this.client.post<TokenResponse>('/auth/register', data);
      this.setToken(response.data.access_token);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw this.handleError(error);
    }
  }

  async registerMedico(data: RegisterMedicoData): Promise<TokenResponse> {
    try {
      console.log('📤 Registering medico:', data);
      const response = await this.client.post<TokenResponse>('/auth/register/medico', data);
      this.setToken(response.data.access_token);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw this.handleError(error);
    }
  }

  async getMe(): Promise<any> {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========== PACIENTE ENDPOINTS ==========

  async getPaciente(id: number): Promise<Paciente> {
    try {
      const response = await this.client.get<Paciente>(`/pacientes/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePaciente(id: number, data: Partial<Paciente>): Promise<Paciente> {
    try {
      const response = await this.client.put<Paciente>(`/pacientes/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========== MEDICO ENDPOINTS ==========

  async getMedico(id: number): Promise<Medico> {
    try {
      const response = await this.client.get<Medico>(`/medicos/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMedico(id: number, data: Partial<Medico>): Promise<Medico> {
    try {
      const response = await this.client.put<Medico>(`/medicos/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllMedicos(): Promise<Medico[]> {
    try {
      const response = await this.client.get<Medico[]>('/medicos/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========== ESPECIALIDADES ENDPOINTS ==========

  async getAllEspecialidades(incluir_inactivas: boolean = false): Promise<Especialidad[]> {
    try {
      const response = await this.client.get<Especialidad[]>(
        `/especialidades/?incluir_inactivas=${incluir_inactivas}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEspecialidadById(id: number): Promise<Especialidad> {
    try {
      const response = await this.client.get<Especialidad>(`/especialidades/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEspecialidad(data: EspecialidadCreate): Promise<Especialidad> {
    try {
      const response = await this.client.post<Especialidad>('/especialidades/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEspecialidad(id: number, data: EspecialidadUpdate): Promise<Especialidad> {
    try {
      const response = await this.client.put<Especialidad>(`/especialidades/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEspecialidad(id: number): Promise<{ message: string; id: number }> {
    try {
      const response = await this.client.delete<{ message: string; id: number }>(
        `/especialidades/${id}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMedicosByEspecialidad(especialidadId: number): Promise<MedicoEspecialidad[]> {
    try {
      const response = await this.client.get<MedicoEspecialidad[]>(
        `/especialidades/${especialidadId}/medicos`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async reactivarEspecialidad(id: number): Promise<Especialidad> {
    try {
      const response = await this.client.post<Especialidad>(`/especialidades/${id}/reactivar`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========== HOSPITALES ENDPOINTS ==========

  async getAllHospitales(
    skip: number = 0,
    limit: number = 100,
    filters?: { nombre?: string; departamento?: string; ciudad?: string }
  ): Promise<Hospital[]> {
    try {
      const params = new URLSearchParams();
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      if (filters?.nombre) params.append('nombre', filters.nombre);
      if (filters?.departamento) params.append('departamento', filters.departamento);
      if (filters?.ciudad) params.append('ciudad', filters.ciudad);

      const response = await this.client.get<Hospital[]>(`/hospitales/?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getHospitalById(id: number): Promise<Hospital> {
    try {
      const response = await this.client.get<Hospital>(`/hospitales/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getHospitalesCercanos(lat: number, lon: number, radio: number = 5.0): Promise<Hospital[]> {
    try {
      const response = await this.client.get<Hospital[]>(
        `/hospitales/nearby?lat=${lat}&lon=${lon}&radio=${radio}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createHospital(data: HospitalCreate): Promise<Hospital> {
    try {
      const response = await this.client.post<Hospital>('/hospitales/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateHospital(id: number, data: HospitalUpdate): Promise<Hospital> {
    try {
      const response = await this.client.put<Hospital>(`/hospitales/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteHospital(id: number): Promise<{ message: string; id: number }> {
    try {
      const response = await this.client.delete<{ message: string; id: number }>(
        `/hospitales/${id}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async importHospitalesCSV(file: File): Promise<{ importados: number; errores: string[] | null; total_errores: number }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.client.post<{ importados: number; errores: string[] | null; total_errores: number }>(
        '/hospitales/import',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========== ADMINS ENDPOINTS ==========

    async getAllAdmins(incluir_inactivos: boolean = false): Promise<Admin[]> {
      try {
        const response = await this.client.get<Admin[]>(
          `/admins/?incluir_inactivos=${incluir_inactivos}`
        );
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    }

    async getAdminById(id: number): Promise<Admin> {
      try {
        const response = await this.client.get<Admin>(`/admins/${id}`);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    }

    async getAdmin(adminId: number): Promise<Admin> {
      return this.getAdminById(adminId);
    }

  async createAdmin(data: AdminCreate): Promise<Admin> {
    try {
      const response = await this.client.post<Admin>('/admins/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateAdmin(id: number, data: AdminUpdate): Promise<Admin> {
    try {
      const response = await this.client.put<Admin>(`/admins/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deactivateAdmin(id: number): Promise<{ message: string; id: number }> {
    try {
      const response = await this.client.delete<{ message: string; id: number }>(
        `/admins/${id}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async reactivateAdmin(id: number): Promise<Admin> {
    try {
      const response = await this.client.post<Admin>(`/admins/${id}/reactivar`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========== ERROR HANDLING ==========

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;

      if (!axiosError.response) {
        if (axiosError.code === 'ECONNREFUSED') {
          return new Error('No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:8000');
        }
        if (axiosError.code === 'ERR_NETWORK') {
          return new Error('Error de red. Verifica tu conexión y que el backend esté corriendo.');
        }
        return new Error(`Error de conexión: ${axiosError.message}`);
      }

      if (axiosError.response?.data?.detail) {
        return new Error(axiosError.response.data.detail);
      }

      return new Error(axiosError.message);
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export default ApiClient;

// Re-export validation schemas
export * from './validation';