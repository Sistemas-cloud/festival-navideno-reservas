export interface Alumno {
  alumno_id: number;
  alumno_ref: number;
  alumno_app: string;
  alumno_apm: string;
  alumno_nombre: string;
  alumno_nivel: number;
  alumno_grado: number;
  alumno_status: number;
}

export interface HermanosData {
  control: number;
  nombre: string;
  nivel: number;
  grado: number;
}

export interface Asiento {
  fila: string;
  asiento: number;
}

export interface Reserva {
  fila: string;
  asiento: number;
  estado: 'disponible' | 'reservado' | 'pagado';
  referencia: number;
  nivel: number;
  fecha_pago: string;
  precio: number;
  zona: string;
}

export interface LoginResponse {
  success: boolean;
  data?: HermanosData[];
  message?: string;
}

export interface AsientosResponse {
  asientos: number;
}

export interface ReservaResponse {
  success: boolean;
  message?: string;
  fila?: string;
  asiento?: number;
  estado?: string;
  alumno_ref?: number;
}

export interface SeatingConfig {
  [key: string]: number;
}

export interface UserData {
  alumnoRef: number;
  alumnoNombre: string;
  hermanos: HermanosData[];
}

export interface SectionConfig {
  name: string;
  color: string;
  price: number;
  rows: SeatingConfig;
  disabledSeats?: Array<{ row: string; seat: number }>;
  specialLayout?: boolean;
}

export interface AsientoComprobante {
  fila: string;
  asiento: number;
  precio: number;
  zona: string;
}

export interface ComprobanteData {
  alumnoNombre: string;
  alumnoControl: number;
  funcion: string;
  asientos: AsientoComprobante[];
  total: number;
  fechaReserva: string;
}
