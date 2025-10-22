import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables de entorno de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validar que las variables de entorno existan
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno de Supabase');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
}

// Cliente de Supabase con service_role para acceso completo desde el backend
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Cliente de Supabase inicializado');
  }
  return supabaseClient;
};

// Interfaces de base de datos (mismas que database.ts)
export interface Alumno {
  alumno_id: number;
  alumno_ref: number;
  alumno_app: string;
  alumno_apm: string;
  alumno_nombre: string;
  alumno_nivel: number;
  alumno_grado: number;
  alumno_status: number;
  alumno_ciclo_escolar?: number;
}

export interface AlumnoDetalles {
  alumno_id: number;
  alumno_clave: number;
}

export interface AlumnoFamiliar {
  id?: number;
  alumno_id: number;
  familiar_app: string;
  familiar_apm: string;
  familiar_nombre: string;
  familiar_cel: string;
  familiar_curp: string;
  tutor_id: number;
}

export interface Reserva {
  id?: number;
  fila: string;
  asiento: number;
  estado: 'disponible' | 'reservado' | 'pagado';
  referencia: number;
  nivel: number;
  fecha_pago: string;
  precio: number;
  zona: string;
}

export interface DatosFacturacion {
  id?: number;
  alumno_ref: number;
  rfc?: string;
  razon_social?: string;
  direccion?: string;
  email?: string;
}

