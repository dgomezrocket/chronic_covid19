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
  AdminUpdate,
    Coordinador,
  CoordinadorCreate,
  CoordinadorUpdate,
  CoordinadorDashboard,
  HospitalDetallado,
  Asignacion,
  AsignacionCreate,
  AsignacionMedicoHospital,
  PacienteSinHospital,
  BuscarPacienteResult,
  HospitalConDistancia,
  OperacionExitosa,
  AsignacionSuccess,
    Formulario,
  FormularioCreate,
  FormularioUpdate,
  FormularioListItem,
  FormularioAsignacion,
  FormularioAsignacionCreate,
  FormularioAsignacionDetalle,
  RespuestaFormularioCreate,
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


  // ========== COORDINADORES ENDPOINTS ==========

  /**
   * Crea un nuevo coordinador (solo admin)
   */
  async createCoordinador(data: CoordinadorCreate): Promise<Coordinador> {
    try {
      const response = await this.client.post<Coordinador>('/coordinadores/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene todos los coordinadores (solo admin)
   */
  async getAllCoordinadores(skip: number = 0, limit: number = 100): Promise<Coordinador[]> {
    try {
      const response = await this.client.get<Coordinador[]>(
        `/coordinadores/?skip=${skip}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene un coordinador por ID (solo admin)
   */
  async getCoordinadorById(id: number): Promise<Coordinador> {
    try {
      const response = await this.client.get<Coordinador>(`/coordinadores/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Actualiza un coordinador (solo admin)
   */
  async updateCoordinador(id: number, data: CoordinadorUpdate): Promise<Coordinador> {
    try {
      const response = await this.client.put<Coordinador>(`/coordinadores/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Asigna un hospital a un coordinador (solo admin)
   */
  async asignarHospitalACoordinador(coordinadorId: number, hospitalId: number): Promise<Coordinador> {
    try {
      const response = await this.client.put<Coordinador>(
        `/coordinadores/${coordinadorId}/hospital?hospital_id=${hospitalId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Elimina un coordinador (solo admin)
   */
  async deleteCoordinador(id: number): Promise<{ message: string; id: number }> {
    try {
      const response = await this.client.delete<{ message: string; id: number }>(
        `/coordinadores/${id}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene el perfil del coordinador autenticado
   */
  async getCoordinadorMe(): Promise<Coordinador> {
    try {
      const response = await this.client.get<Coordinador>('/coordinadores/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene el dashboard del coordinador con estadísticas
   */
  async getCoordinadorDashboard(): Promise<CoordinadorDashboard> {
    try {
      const response = await this.client.get<CoordinadorDashboard>('/coordinadores/me/dashboard');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene el hospital asignado al coordinador con información detallada
   */
  async getCoordinadorHospital(): Promise<HospitalDetallado> {
    try {
      const response = await this.client.get<HospitalDetallado>('/coordinadores/me/hospital');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene los médicos del hospital del coordinador
   * @param especialidadId - Opcional: filtrar por especialidad
   */
  async getCoordinadorMedicos(especialidadId?: number): Promise<Medico[]> {
    try {
      const url = especialidadId
        ? `/coordinadores/me/medicos?especialidad_id=${especialidadId}`
        : '/coordinadores/me/medicos';

      const response = await this.client.get<Medico[]>(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene los pacientes del hospital del coordinador
   */
  async getCoordinadorPacientes(): Promise<Paciente[]> {
    try {
      const response = await this.client.get<Paciente[]>('/coordinadores/me/pacientes');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }


  // ========== ASIGNACIONES ENDPOINTS ==========

  /**
   * Asigna un médico a un hospital (coordinador)
   */
  async asignarMedicoAHospital(data: AsignacionMedicoHospital): Promise<Medico> {
    try {
      // ✅ Asegurarnos de que el token esté en el header
      if (this.token) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      }
      const response = await this.client.post<Medico>('/asignaciones/medico-hospital', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Remueve un médico de un hospital (coordinador)
   */
  async removerMedicoDeHospital(data: AsignacionMedicoHospital): Promise<OperacionExitosa> {
    try {
      const response = await this.client.delete<OperacionExitosa>(
        '/asignaciones/medico-hospital',
        { data }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Asigna un paciente a un hospital (coordinador)
   */
  async asignarPacienteAHospital(
    pacienteId: number,
    hospitalId: number
  ): Promise<OperacionExitosa> {
    try {
      const response = await this.client.post<OperacionExitosa>(
        `/asignaciones/paciente-hospital?paciente_id=${pacienteId}&hospital_id=${hospitalId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Asigna un médico a un paciente (coordinador)
   */
  async asignarMedicoAPaciente(data: AsignacionCreate): Promise<AsignacionSuccess> {
    try {
      const response = await this.client.post<AsignacionSuccess>(
        '/asignaciones/medico-paciente',
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene la asignación activa de un paciente
   */
  async getAsignacionPaciente(pacienteId: number): Promise<Asignacion> {
    try {
      const response = await this.client.get<Asignacion>(
        `/asignaciones/paciente/${pacienteId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Desactiva una asignación médico-paciente (coordinador)
   */
  async desasignarMedicoDePaciente(asignacionId: number): Promise<OperacionExitosa> {
    try {
      const response = await this.client.delete<OperacionExitosa>(
        `/asignaciones/medico-paciente/${asignacionId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Busca pacientes por documento o nombre
   */

async buscarPaciente(query: string, soloSinHospital: boolean = false): Promise<BuscarPacienteResult[]> {
  try {
    const params = new URLSearchParams();
    params.append('q', query);
    if (soloSinHospital) {
      params.append('solo_sin_hospital', 'true');
    }
    const response = await this.client.get<BuscarPacienteResult[]>(
      `/asignaciones/buscar-paciente?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw this.handleError(error);
  }
}

    /**
     * Lista los pacientes asignados al médico actual
     */
    async listarMisPacientes(): Promise<BuscarPacienteResult[]> {
      try {
        const response = await this.client.get<BuscarPacienteResult[]>(
          `/asignaciones/mis-pacientes`
        );
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    }


  /**
   * Obtiene pacientes sin hospital asignado con hospitales cercanos
   * @param lat - Latitud (opcional)
   * @param lon - Longitud (opcional)
   * @param radioKm - Radio de búsqueda en km (por defecto 50)
   */
  async getPacientesSinHospital(
    lat?: number,
    lon?: number,
    radioKm: number = 50
  ): Promise<PacienteSinHospital[]> {
    try {
      let url = '/asignaciones/pacientes-sin-hospital';
      const params = new URLSearchParams();

      if (lat !== undefined) params.append('lat', lat.toString());
      if (lon !== undefined) params.append('lon', lon.toString());
      params.append('radio_km', radioKm.toString());

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await this.client.get<PacienteSinHospital[]>(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene médicos disponibles de un hospital
   * @param hospitalId - ID del hospital
   * @param especialidadId - Opcional: filtrar por especialidad
   */
  async getMedicosDisponibles(
    hospitalId: number,
    especialidadId?: number
  ): Promise<Medico[]> {
    try {
      let url = `/asignaciones/medicos-disponibles?hospital_id=${hospitalId}`;

      if (especialidadId) {
        url += `&especialidad_id=${especialidadId}`;
      }

      const response = await this.client.get<Medico[]>(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene un listado de asignaciones con filtros opcionales
   * @param filters - Filtros opcionales (paciente_id, medico_id, activo)
   * @param skip - Número de registros a saltar
   * @param limit - Límite de registros a obtener
   */
  async getAsignaciones(
    filters?: {
      paciente_id?: number;
      medico_id?: number;
      activo?: boolean;
    },
    skip: number = 0,
    limit: number = 100
  ): Promise<Asignacion[]> {
    try {
      const params = new URLSearchParams();
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      if (filters?.paciente_id) {
        params.append('paciente_id', filters.paciente_id.toString());
      }
      if (filters?.medico_id) {
        params.append('medico_id', filters.medico_id.toString());
      }
      if (filters?.activo !== undefined) {
        params.append('activo', filters.activo.toString());
      }

      const response = await this.client.get<Asignacion[]>(
        `/asignaciones/?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene hospitales cercanos a una ubicación específica
   * @param lat - Latitud
   * @param lon - Longitud
   * @param radioKm - Radio de búsqueda en km (por defecto 50)
   */
  async getHospitalesCercanosConDistancia(
    lat: number,
    lon: number,
    radioKm: number = 50
  ): Promise<HospitalConDistancia[]> {
    try {
      // Primero obtenemos hospitales cercanos usando el endpoint existente
      const hospitales = await this.getHospitalesCercanos(lat, lon, radioKm);

      // Calculamos las distancias (aproximadas) en el cliente
      const hospitalesConDistancia: HospitalConDistancia[] = hospitales.map(hospital => {
        let distancia_km: number | undefined;

        if (hospital.latitud && hospital.longitud) {
          // Fórmula de Haversine simplificada (aproximación)
          const R = 6371; // Radio de la Tierra en km
          const dLat = (hospital.latitud - lat) * (Math.PI / 180);
          const dLon = (hospital.longitud - lon) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat * (Math.PI / 180)) *
              Math.cos(hospital.latitud * (Math.PI / 180)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distancia_km = R * c;
        }

        return {
          ...hospital,
          distancia_km,
        };
      });

      // Ordenar por distancia (más cercano primero)
      return hospitalesConDistancia.sort((a, b) => {
        if (a.distancia_km === undefined) return 1;
        if (b.distancia_km === undefined) return -1;
        return a.distancia_km - b.distancia_km;
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

    // ========== FORMULARIOS ENDPOINTS ==========

  /**
   * Obtiene todos los formularios (médico ve los suyos, admin ve todos)
   */
  async getFormularios(soloActivos: boolean = true): Promise<FormularioListItem[]> {
    try {
      const response = await this.client.get<FormularioListItem[]>(
        `/formularios/?solo_activos=${soloActivos}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene un formulario por ID
   */
  async getFormularioById(id: number): Promise<Formulario> {
    try {
      const response = await this.client.get<Formulario>(`/formularios/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Crea un nuevo formulario (solo médico)
   */
  async createFormulario(data: FormularioCreate): Promise<Formulario> {
    try {
      const response = await this.client.post<Formulario>('/formularios/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Actualiza un formulario (solo el creador o admin)
   */
  async updateFormulario(id: number, data: FormularioUpdate): Promise<Formulario> {
    try {
      const response = await this.client.put<Formulario>(`/formularios/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Elimina (desactiva) un formulario
   */
  async deleteFormulario(id: number): Promise<{ message: string; id: number }> {
    try {
      const response = await this.client.delete<{ message: string; id: number }>(
        `/formularios/${id}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========== ASIGNACIONES DE FORMULARIOS ==========

  /**
   * Asigna un formulario a un paciente (solo médico)
   */
  async asignarFormulario(data: FormularioAsignacionCreate): Promise<FormularioAsignacion> {
    try {
      const response = await this.client.post<FormularioAsignacion>(
        `/formularios/${data.formulario_id}/asignaciones`,
        {
          paciente_id: data.paciente_id,
          fecha_expiracion: data.fecha_expiracion,
          datos_extra: data.datos_extra,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene las asignaciones de un formulario
   */
  async getAsignacionesFormulario(formularioId: number): Promise<FormularioAsignacion[]> {
    try {
      const response = await this.client.get<FormularioAsignacion[]>(
        `/formularios/${formularioId}/asignaciones`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene las asignaciones de formularios para un paciente
   */
  async getAsignacionesPaciente(pacienteId: number): Promise<FormularioAsignacionDetalle[]> {
    try {
      const response = await this.client.get<FormularioAsignacionDetalle[]>(
        `/formularios/asignaciones/paciente/${pacienteId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene mis formularios asignados (para pacientes)
   */
  async getMisFormulariosAsignados(): Promise<FormularioAsignacionDetalle[]> {
    try {
      const response = await this.client.get<FormularioAsignacionDetalle[]>(
        '/formularios/mis-asignaciones'
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Envía respuesta a un formulario asignado
   */
  async responderFormulario(
    asignacionId: number,
    respuestas: Record<string, any>
  ): Promise<{ message: string }> {
    try {
      const response = await this.client.post<{ message: string }>(
        `/formularios/asignaciones/${asignacionId}/responder`,
        { respuestas }
      );
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

