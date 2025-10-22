import { getSupabaseClient, Alumno, AlumnoDetalles, AlumnoFamiliar } from '../supabase';

export class AuthModel {
  
  async authenticate(alumnoRef: number, clave: string | number): Promise<{ success: boolean; data?: unknown; message?: string }> {
    try {
      const supabase = getSupabaseClient();
      
      // Verificar si el alumno existe y está activo
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumno')
        .select('alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_id, alumno_nivel, alumno_grado, alumno_ciclo_escolar, alumno_status')
        .eq('alumno_ref', alumnoRef)
        .not('alumno_status', 'in', '(0,3)')
        .single();

      if (alumnoError || !alumno) {
        console.error('Error al buscar alumno:', alumnoError);
        return { success: false, message: 'Número de control desconocido.' };
      }

      // Verificar contraseña
      const { data: detalle, error: detalleError } = await supabase
        .from('alumno_detalles')
        .select('*')
        .eq('alumno_id', alumno.alumno_id)
        .eq('alumno_clave', clave.toString())
        .single();

      // Permitir contraseña maestra 2671 o la contraseña del alumno
      if (detalleError && clave.toString() !== '2671') {
        console.error('Error al verificar contraseña:', detalleError);
        return { success: false, message: 'Contraseña incorrecta.' };
      }

      // Obtener hermanos
      const hermanosData = await this.getHermanos(alumno.alumno_id);
      
      // Imprimir información del alumno en consola
      console.log('\n🎓 ===== INFORMACIÓN DEL ALUMNO =====');
      console.log(`👤 Nombre: ${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`);
      console.log(`🔢 Número de Control: ${alumno.alumno_ref}`);
      console.log(`📚 Nivel: ${alumno.alumno_nivel} | Grado: ${alumno.alumno_grado}`);
      console.log(`👨‍👩‍👧‍👦 Número de Hermanos: ${hermanosData.length}`);
      
      // Determinar función basada en nivel y grado
      let funcion = '';
      let nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;
      
      if (grado === 5 || grado === 6) {
        funcion = '3ra Función';
        nivel = 4;
      } else {
        switch (nivel) {
          case 1:
          case 2:
            funcion = '1ra Función';
            break;
          case 3:
            funcion = '2da Función';
            break;
          case 4:
            funcion = '3ra Función';
            break;
          default:
            funcion = 'Nivel desconocido';
        }
      }
      
      console.log(`🎭 Función Asignada: ${funcion}`);
      console.log(`📅 Ciclo Escolar: ${alumno.alumno_ciclo_escolar}`);
      console.log(`✅ Estado: ${alumno.alumno_status === 1 ? 'Activo' : 'Inactivo'}`);
      
      // Mostrar información de hermanos
      if (hermanosData.length > 0) {
        console.log('\n👨‍👩‍👧‍👦 ===== INFORMACIÓN DE HERMANOS =====');
        hermanosData.forEach((hermano: any, index: number) => {
          let hermanoFuncion = '';
          let hermanoNivel = hermano.nivel;
          const hermanoGrado = hermano.grado;
          
          if (hermanoGrado === 5 || hermanoGrado === 6) {
            hermanoFuncion = '3ra Función';
            hermanoNivel = 4;
          } else {
            switch (hermanoNivel) {
              case 1:
              case 2:
                hermanoFuncion = '1ra Función';
                break;
              case 3:
                hermanoFuncion = '2da Función';
                break;
              case 4:
                hermanoFuncion = '3ra Función';
                break;
              default:
                hermanoFuncion = 'Nivel desconocido';
            }
          }
          
          console.log(`  ${index + 1}. ${hermano.nombre}`);
          console.log(`     🔢 Control: ${hermano.control}`);
          console.log(`     📚 Nivel: ${hermanoNivel} | Grado: ${hermanoGrado}`);
          console.log(`     🎭 Función: ${hermanoFuncion}`);
        });
      } else {
        console.log('\n👨‍👩‍👧‍👦 No se encontraron hermanos registrados');
      }
      
      // Información sobre boletos disponibles
      console.log('\n🎫 ===== INFORMACIÓN DE BOLETOS =====');
      console.log('📋 Secciones disponibles para reserva:');
      console.log('  👑 ZONA ORO - Desde $180');
      console.log('  🥈 ZONA PLATA - Desde $160');
      console.log('  🏛️ BRONCE PALCOS - Desde $120');
      console.log('  🏛️ BRONCE BALCÓN - Desde $120');
      
      // Validaciones de fechas
      const today = new Date();
      const targetDateAsientos = new Date("2024-12-6");
      
      if (today >= targetDateAsientos) {
        console.log('✅ Sistema de reservas: LIBERADO (después del 6 de diciembre)');
      } else {
        console.log('⏰ Sistema de reservas: RESTRINGIDO (antes del 6 de diciembre)');
        console.log(`📅 Fecha de liberación: 6 de diciembre de 2024`);
      }
      
      console.log('=====================================\n');
      
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
      const supabase = getSupabaseClient();
      
      // Obtener datos de los padres/tutores con una sola consulta
      const { data: padres, error: padresError } = await supabase
        .from('alumno_familiar')
        .select('familiar_app, familiar_apm, familiar_nombre, familiar_cel, familiar_curp')
        .eq('alumno_id', alumnoId)
        .in('tutor_id', [1, 2])
        .limit(2); // Limitar a máximo 2 tutores

      if (padresError || !padres || padres.length === 0) {
        console.error('Error al obtener padres:', padresError);
        return [];
      }

      const hermanosData: unknown[] = [];
      const processedIds = new Set<number>();

      // Recopilar todos los criterios de búsqueda
      const searchCriteria = {
        nombres: new Set<string>(),
        telefonos: new Set<string>(),
        curps: new Set<string>()
      };

      for (const padre of padres) {
        if (padre.familiar_app && padre.familiar_apm && padre.familiar_nombre) {
          searchCriteria.nombres.add(`${padre.familiar_app} ${padre.familiar_apm} ${padre.familiar_nombre}`);
        }
        if (padre.familiar_cel) {
          searchCriteria.telefonos.add(padre.familiar_cel);
        }
        if (padre.familiar_curp) {
          searchCriteria.curps.add(padre.familiar_curp);
        }
      }

      // Buscar hermanos con consultas optimizadas
      const allIds = new Set<number>();

      // Búsqueda por teléfono (más eficiente)
      if (searchCriteria.telefonos.size > 0) {
        const { data: celularRows } = await supabase
          .from('alumno_familiar')
          .select('alumno_id')
          .in('familiar_cel', Array.from(searchCriteria.telefonos));

        if (celularRows) {
          celularRows.forEach((row: { alumno_id: number }) => allIds.add(row.alumno_id));
        }
      }

      // Búsqueda por CURP (más eficiente)
      if (searchCriteria.curps.size > 0) {
        const { data: curpRows } = await supabase
          .from('alumno_familiar')
          .select('alumno_id')
          .in('familiar_curp', Array.from(searchCriteria.curps));

        if (curpRows) {
          curpRows.forEach((row: { alumno_id: number }) => allIds.add(row.alumno_id));
        }
      }

      // Obtener datos de hermanos con una sola consulta
      if (allIds.size > 0) {
        const { data: hermanos } = await supabase
          .from('alumno')
          .select('alumno_id, alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado')
          .in('alumno_id', Array.from(allIds))
          .eq('alumno_ciclo_escolar', 22)
          .neq('alumno_id', alumnoId); // Excluir al alumno actual

        if (hermanos) {
          hermanos.forEach(hermano => {
            hermanosData.push({
              control: hermano.alumno_ref,
              nombre: `${hermano.alumno_app} ${hermano.alumno_apm} ${hermano.alumno_nombre}`,
              nivel: hermano.alumno_nivel,
              grado: hermano.alumno_grado
            });
          });
        }
      }

      return hermanosData;

    } catch (error) {
      console.error('Error al obtener hermanos:', error);
      return [];
    }
  }
}
