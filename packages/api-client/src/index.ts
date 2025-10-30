import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  LoginCredentials,
  RegisterPacienteData,
  RegisterMedicoData,
  TokenResponse,
  Paciente,
  Medico,
  ApiError,
  RolEnum
} from '@chronic-covid19/shared-types';

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL?: string) {
    // Usar variable de entorno si está disponible, sino default
    const API_URL = baseURL || 
                    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 
                    'http://localhost:8000';
    
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 segundos timeout
    });

    // Interceptor para agregar token a las peticiones
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Interceptor para debug
    this.client.interceptors.request.use(
      (config) => {
        console.log('🚀 Request:', config.method?.toUpperCase(), config.url);
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
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  // Auth endpoints
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

  async registerMedico(data: RegisterMedicoData): Promise<Medico> {
    try {
      const response = await this.client.post<Medico>('/medicos/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Paciente endpoints
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

  // Medico endpoints
  async getMedico(id: number): Promise<Medico> {
    try {
      const response = await this.client.get<Medico>(`/medicos/${id}`);
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

  // Error handling
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;
      
      // Si no hay respuesta del servidor
      if (!axiosError.response) {
        if (axiosError.code === 'ECONNREFUSED') {
          return new Error('No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:8000');
        }
        if (axiosError.code === 'ERR_NETWORK') {
          return new Error('Error de red. Verifica tu conexión y que el backend esté corriendo.');
        }
        return new Error(`Error de conexión: ${axiosError.message}`);
      }
      
      // Si hay respuesta con error del servidor
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