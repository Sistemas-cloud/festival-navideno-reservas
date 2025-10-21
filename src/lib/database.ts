import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'winston_richard',
  password: process.env.DB_PASSWORD || '101605',
  database: process.env.DB_NAME || 'winston_general',
  charset: 'utf8mb4'
};

let connection: mysql.Connection | null = null;

export const getConnection = async (): Promise<mysql.Connection> => {
  if (!connection) {
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('✅ Conexión a la base de datos establecida');
    } catch (error) {
      console.error('❌ Error al conectar con la base de datos:', error);
      throw error;
    }
  }
  return connection;
};

export const closeConnection = async (): Promise<void> => {
  if (connection) {
    await connection.end();
    connection = null;
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

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

export interface AlumnoDetalles {
  alumno_id: number;
  alumno_clave: number;
}

export interface AlumnoFamiliar {
  alumno_id: number;
  familiar_app: string;
  familiar_apm: string;
  familiar_nombre: string;
  familiar_cel: string;
  familiar_curp: string;
  tutor_id: number;
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

export interface DatosFacturacion {
  alumno_ref: number;
}
