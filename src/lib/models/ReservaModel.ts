import { getConnection } from '../database';
import { Alumno, Reserva } from '../database';

export class ReservaModel {
  
  async getAsientosDisponibles(alumnoRef: number): Promise<{ asientos: number }> {
    try {
      const connection = await getConnection();
      
      // Obtener número de boletos ya reservados
      const [ocupadosRows] = await connection.execute(
        'SELECT COUNT(*) as ocupados FROM reservas WHERE referencia = ?',
        [alumnoRef]
      );
      
      const ocupados = (ocupadosRows as Array<{ocupados: number}>)[0].ocupados;

      // Obtener nivel y grado del alumno
      const [alumnoRows] = await connection.execute(
        'SELECT alumno_nivel, alumno_grado FROM alumno WHERE alumno_ref = ?',
        [alumnoRef]
      );

      const alumno = (alumnoRows as Alumno[])[0];
      if (!alumno) {
        return { asientos: 0 };
      }

      let nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;

      // Reglas especiales de nivel
      if (grado === 5 || grado === 6) {
        nivel = 4;
      }

      // Determinar cantidad de boletos permitidos
      let boletos = 0;
      
      switch (nivel) {
        case 1:
          boletos = 8;
          break;
        case 2:
          boletos = 8;
          break;
        case 3:
          boletos = 4;
          break;
        case 4:
          boletos = 3;
          break;
      }

      // Casos especiales para alumnos de prueba
      if (alumnoRef === 22222 || alumnoRef === 33333 || alumnoRef === 44444) {
        boletos = 1154;
      }

      const disponibles = boletos - ocupados;
      
      return { asientos: Math.max(0, disponibles) };

    } catch (error) {
      console.error('Error al obtener asientos disponibles:', error);
      return { asientos: 0 };
    }
  }

  async getReservas(alumnoRef: number): Promise<Reserva[]> {
    try {
      const connection = await getConnection();
      
      // Obtener nivel del alumno
      const nivel = await this.getNivelAlumno(alumnoRef);
      
      const [rows] = await connection.execute(
        'SELECT fila, asiento FROM reservas WHERE estado = "reservado" AND nivel = ?',
        [nivel]
      );

      return rows as Reserva[];

    } catch (error) {
      console.error('Error al obtener reservas:', error);
      return [];
    }
  }

  async getPagos(alumnoRef: number): Promise<Reserva[]> {
    try {
      const connection = await getConnection();
      
      // Obtener nivel del alumno
      const nivel = await this.getNivelAlumno(alumnoRef);
      
      const [rows] = await connection.execute(
        'SELECT fila, asiento FROM reservas WHERE estado = "pagado" AND nivel = ?',
        [nivel]
      );

      return rows as Reserva[];

    } catch (error) {
      console.error('Error al obtener pagos:', error);
      return [];
    }
  }

  async crearReserva(asientos: Array<{fila: string, asiento: number}>, alumnoRef: number, _hermanosData: unknown[], precio: number, zona: string): Promise<{success: boolean, message?: string}> {
    try {
      const connection = await getConnection();
      
      const nivel = await this.getNivelAlumno(alumnoRef);
      
      // Calcular fecha límite (mañana o 2024-12-09, lo que sea mayor)
      const fechaActual = new Date();
      const fechaLimite = new Date(fechaActual.getTime() + 24 * 60 * 60 * 1000); // +1 día
      const fechaMinima = new Date('2024-12-09');
      const fechaFinal = fechaLimite > fechaMinima ? fechaLimite : fechaMinima;
      
      const fechaFormateada = fechaFinal.toISOString().split('T')[0];

      // Verificar si hay asientos disponibles y reservar
      for (const asiento of asientos) {
        // Verificar si el asiento ya está reservado
        const [existingRows] = await connection.execute(
          'SELECT estado FROM reservas WHERE fila = ? AND asiento = ? AND nivel = ?',
          [asiento.fila, asiento.asiento, nivel]
        );

        const existing = (existingRows as Array<{estado: string}>)[0];
        
        if (existing && existing.estado === 'reservado') {
          return { success: false, message: `El asiento ${asiento.fila}${asiento.asiento} ya está reservado.` };
        }

        // Crear o actualizar la reserva
        await connection.execute(
          `INSERT INTO reservas (fila, asiento, estado, referencia, nivel, fecha_pago, precio, zona) 
           VALUES (?, ?, 'reservado', ?, ?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE estado = 'reservado', referencia = ?, nivel = ?, fecha_pago = ?, precio = ?, zona = ?`,
          [
            asiento.fila, asiento.asiento, alumnoRef, nivel, fechaFormateada, precio, zona,
            alumnoRef, nivel, fechaFormateada, precio, zona
          ]
        );
      }

      return { success: true };

    } catch (error) {
      console.error('Error al crear reserva:', error);
      return { success: false, message: 'Error interno del servidor.' };
    }
  }

  private async getNivelAlumno(alumnoRef: number): Promise<number> {
    try {
      const connection = await getConnection();
      
      const [rows] = await connection.execute(
        'SELECT alumno_nivel, alumno_grado FROM alumno WHERE alumno_ref = ?',
        [alumnoRef]
      );

      const alumno = (rows as Alumno[])[0];
      if (!alumno) return 1;

      let nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;

      // Reglas especiales
      if (grado === 5 || grado === 6) {
        nivel = 4;
      } else if (nivel === 1) {
        nivel = 2;
      }

      // Casos especiales para alumnos de prueba
      if (alumnoRef === 22222) {
        nivel = 2;
      } else if (alumnoRef === 33333) {
        nivel = 3;
      } else if (alumnoRef === 44444) {
        nivel = 4;
      }

      return nivel;

    } catch (error) {
      console.error('Error al obtener nivel del alumno:', error);
      return 1;
    }
  }
}
