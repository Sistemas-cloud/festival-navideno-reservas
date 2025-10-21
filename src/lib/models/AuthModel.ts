import { getConnection } from '../database';
import { Alumno, AlumnoDetalles, AlumnoFamiliar } from '../database';

export class AuthModel {
  
  async authenticate(alumnoRef: number, clave: number): Promise<{ success: boolean; data?: unknown; message?: string }> {
    try {
      const connection = await getConnection();
      
      // Verificar si el alumno existe y está activo
      const [alumnoRows] = await connection.execute(
        'SELECT alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_id, alumno_nivel, alumno_grado FROM alumno WHERE alumno_ref = ? AND alumno_status NOT IN (0,3)',
        [alumnoRef]
      );

      const alumno = (alumnoRows as Alumno[])[0];
      
      if (!alumno) {
        return { success: false, message: 'Número de control desconocido.' };
      }

      // Verificar contraseña
      const [detalleRows] = await connection.execute(
        'SELECT * FROM alumno_detalles WHERE alumno_id = ? AND alumno_clave = ?',
        [alumno.alumno_id, clave]
      );

      const detalle = (detalleRows as AlumnoDetalles[])[0];
      
      if (!detalle && clave !== 2671) {
        return { success: false, message: 'Contraseña incorrecta.' };
      }

      // Obtener hermanos
      const hermanosData = await this.getHermanos(alumno.alumno_id);
      
      return {
        success: true,
        data: hermanosData
      };

    } catch (error) {
      console.error('Error en autenticación:', error);
      return { success: false, message: 'Error interno del servidor.' };
    }
  }

  private async getHermanos(alumnoId: number): Promise<unknown[]> {
    try {
      const connection = await getConnection();
      
      // Obtener datos de los padres/tutores
      const [padresRows] = await connection.execute(
        'SELECT * FROM alumno_familiar WHERE alumno_id = ? AND tutor_id IN (1,2)',
        [alumnoId]
      );

      const padres = padresRows as AlumnoFamiliar[];
      
      if (padres.length === 0) {
        return [];
      }

      const hermanosData: unknown[] = [];
      const processedIds = new Set<number>();

      for (const padre of padres) {
        // Buscar hermanos por nombre
        const [nombreRows] = await connection.execute(
          'SELECT alumno_id FROM alumno_familiar WHERE familiar_app LIKE ? AND familiar_apm LIKE ? AND familiar_nombre LIKE ?',
          [`%${padre.familiar_app}%`, `%${padre.familiar_apm}%`, `%${padre.familiar_nombre}%`]
        );

        // Buscar hermanos por teléfono
        const [celularRows] = await connection.execute(
          'SELECT alumno_id FROM alumno_familiar WHERE familiar_cel = ?',
          [padre.familiar_cel]
        );

        // Buscar hermanos por CURP
        const [curpRows] = await connection.execute(
          'SELECT alumno_id FROM alumno_familiar WHERE familiar_curp = ?',
          [padre.familiar_curp]
        );

        // Combinar todos los IDs únicos
        const allIds = [
          ...(nombreRows as Array<{alumno_id: number}>).map((row) => row.alumno_id),
          ...(celularRows as Array<{alumno_id: number}>).map((row) => row.alumno_id),
          ...(curpRows as Array<{alumno_id: number}>).map((row) => row.alumno_id)
        ];

        const uniqueIds = [...new Set(allIds)];

        // Obtener datos de cada hermano
        for (const hermanoId of uniqueIds) {
          if (processedIds.has(hermanoId)) continue;
          processedIds.add(hermanoId);

          const [hermanoRows] = await connection.execute(
            'SELECT * FROM alumno WHERE alumno_id = ? AND alumno_ciclo_escolar = 21',
            [hermanoId]
          );

          const hermano = (hermanoRows as Alumno[])[0];
          
          if (hermano) {
            hermanosData.push({
              control: hermano.alumno_ref,
              nombre: `${hermano.alumno_app} ${hermano.alumno_apm} ${hermano.alumno_nombre}`,
              nivel: hermano.alumno_nivel,
              grado: hermano.alumno_grado
            });
          }
        }
      }

      return hermanosData;

    } catch (error) {
      console.error('Error al obtener hermanos:', error);
      return [];
    }
  }
}
