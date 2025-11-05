import { getSupabaseClient } from '../supabase';
import { validateInternalUser } from '../config/internalUsers';

interface HermanoData {
  nombre: string;
  control: number;
  nivel: number;
  grado: number;
  isInternal?: boolean;
  funcionAsignada?: number;
}

export class AuthModel {
  
  async authenticate(alumnoRef: number, clave: string | number): Promise<{ success: boolean; data?: unknown; message?: string; isInternal?: boolean; funcionAsignada?: number }> {
    try {
      console.log('🔐 AuthModel: Iniciando autenticación para alumno:', alumnoRef);
      
      // PRIMERO: Verificar si es un usuario interno/administrador
      const internalUser = validateInternalUser(alumnoRef, clave.toString());
      if (internalUser) {
        console.log('✅ AuthModel: Usuario interno detectado:', internalUser.nombre);
        console.log(`🎭 Función asignada: ${internalUser.funcion} (${internalUser.descripcion})`);
        
        // Crear estructura de datos similar a un alumno normal pero con flag de interno
        const hermanosData: HermanoData[] = [{
          control: internalUser.control,
          nombre: internalUser.nombre,
          nivel: internalUser.funcion, // Usar función como nivel para compatibilidad
          grado: 0, // No aplica para usuarios internos
          isInternal: true,
          funcionAsignada: internalUser.funcion
        }];
        
        console.log('✅ Usuario interno autenticado exitosamente');
        console.log('ℹ️  Este usuario puede reservar sin restricciones en la función', internalUser.funcion);
        
        return {
          success: true,
          data: hermanosData,
          isInternal: true,
          funcionAsignada: internalUser.funcion
        };
      }
      
      // SI NO ES USUARIO INTERNO: Proceder con autenticación normal en BD
      const supabase = getSupabaseClient();
      console.log('✅ AuthModel: Cliente de Supabase obtenido');
      
      // Verificar si el alumno existe y está activo
      console.log('🔍 AuthModel: Buscando alumno en base de datos...');
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumno')
        .select('alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_id, alumno_nivel, alumno_grado, alumno_ciclo_escolar, alumno_status')
        .eq('alumno_ref', alumnoRef)
        .not('alumno_status', 'in', '(0,3)')
        .single();

      if (alumnoError || !alumno) {
        console.error('❌ AuthModel: Error al buscar alumno:', alumnoError);
        console.error('❌ AuthModel: Datos del alumno:', alumno);
        return { success: false, message: 'Número de control desconocido.' };
      }
      
      console.log('✅ AuthModel: Alumno encontrado:', alumno.alumno_nombre);

      // Verificar contraseña
      const { error: detalleError } = await supabase
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

      // Obtener hermanos (incluyendo al alumno actual)
      const hermanosData = await this.getHermanos(alumno.alumno_id);
      console.log('🔍 AuthModel - hermanos obtenidos de getHermanos:', hermanosData);
      
      // Agregar al alumno actual a la lista de hermanos
      const alumnoActual = {
        control: alumno.alumno_ref,
        nombre: `${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`,
        nivel: alumno.alumno_nivel,
        grado: alumno.alumno_grado
      };
      console.log('🔍 AuthModel - alumno actual a agregar:', alumnoActual);
      
      hermanosData.unshift(alumnoActual);
      console.log('🔍 AuthModel - lista final de hermanos:', hermanosData);
      
      // Imprimir información del alumno en consola
      console.log('\n🎓 ===== INFORMACIÓN DEL ALUMNO =====');
      console.log(`👤 Nombre: ${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`);
      console.log(`🔢 Número de Control: ${alumno.alumno_ref}`);
      console.log(`📚 Nivel: ${alumno.alumno_nivel} | Grado: ${alumno.alumno_grado}`);
      console.log(`👨‍👩‍👧‍👦 Número de Hermanos: ${hermanosData.length}`);
      
      // Determinar función basada en nivel y grado
      // Reglas:
      // - Función 1: Nivel 1 (maternal) + Nivel 2 (kinder) + Nivel 3 Grado 1 (1° primaria)
      // - Función 2: Nivel 3 Grados 2-5 (2°-5° primaria)
      // - Función 3: Nivel 3 Grado 6 (6° primaria) + Nivel 4 (secundaria)
      let funcion = '';
      const nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;
      
      if (nivel === 1 || nivel === 2) {
        // Maternal (nivel 1) y Kinder (nivel 2) → Función 1
        funcion = '1ra Función';
      } else if (nivel === 3) {
        // Primaria
        if (grado === 1) {
          funcion = '1ra Función'; // 1° primaria → Función 1
        } else if (grado >= 2 && grado <= 5) {
          funcion = '2da Función'; // 2°-5° primaria → Función 2
        } else if (grado === 6) {
          funcion = '3ra Función'; // 6° primaria → Función 3
        } else {
          funcion = '1ra Función'; // Por defecto
        }
      } else if (nivel === 4) {
        // Secundaria → Función 3
        funcion = '3ra Función';
      } else {
        funcion = 'Nivel desconocido';
      }
      
      console.log(`🎭 Función Asignada: ${funcion}`);
      console.log(`📅 Ciclo Escolar: ${alumno.alumno_ciclo_escolar}`);
      console.log(`✅ Estado: ${alumno.alumno_status === 1 ? 'Activo' : 'Inactivo'}`);
      
      // Mostrar información de hermanos
      if (hermanosData.length > 0) {
        console.log('\n👨‍👩‍👧‍👦 ===== INFORMACIÓN DE HERMANOS =====');
        hermanosData.forEach((hermano: HermanoData, index: number) => {
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
      
      // Fechas de cierre por función (iniciando el segundo día de venta)
      // Función 1: Maternal + Kinder + 1° primaria → vende 1-2 dic, cierra iniciando el 2 dic
      // Función 2: 2°-5° primaria → vende 4-5 dic, cierra iniciando el 5 dic
      // Función 3: 6° primaria + Secundaria → vende 8-9 dic, cierra iniciando el 9 dic
      const fechaCierreFuncion1 = new Date("2025-12-02");
      const fechaCierreFuncion2 = new Date("2025-12-05");
      const fechaCierreFuncion3 = new Date("2025-12-09");
      
      // Establecer al inicio del día (00:00:00) para que cierre iniciando ese día
      fechaCierreFuncion1.setHours(0, 0, 0, 0);
      fechaCierreFuncion2.setHours(0, 0, 0, 0);
      fechaCierreFuncion3.setHours(0, 0, 0, 0);
      
      // Determinar fecha de cierre según la función del alumno
      let fechaCierre = fechaCierreFuncion3; // Por defecto
      let nombreFuncion = '';
      
      if (nivel === 1 || nivel === 2) {
        // Maternal o Kinder → Función 1
        fechaCierre = fechaCierreFuncion1;
        nombreFuncion = '1ra Función';
      } else if (nivel === 3) {
        // Primaria
        if (grado === 1) {
          fechaCierre = fechaCierreFuncion1;
          nombreFuncion = '1ra Función';
        } else if (grado >= 2 && grado <= 5) {
          fechaCierre = fechaCierreFuncion2;
          nombreFuncion = '2da Función';
        } else if (grado === 6) {
          fechaCierre = fechaCierreFuncion3;
          nombreFuncion = '3ra Función';
        } else {
          fechaCierre = fechaCierreFuncion1;
          nombreFuncion = '1ra Función';
        }
      } else if (nivel === 4) {
        // Secundaria → Función 3
        fechaCierre = fechaCierreFuncion3;
        nombreFuncion = '3ra Función';
      }
      
      // Normalizar today para comparar solo fechas (sin horas)
      today.setHours(0, 0, 0, 0);
      
      if (today >= fechaCierre) {
        console.log(`✅ Sistema de reservas: CERRADO para ${nombreFuncion} (nivel ${nivel}, grado ${grado}) - iniciando el ${fechaCierre.toLocaleDateString('es-MX')}`);
        console.log(`ℹ️  Los usuarios pueden eliminar asientos pero no pueden reservar nuevos.`);
      } else {
        console.log(`⏰ Sistema de reservas: ABIERTO para ${nombreFuncion} (nivel ${nivel}, grado ${grado})`);
        console.log(`📅 Fecha de cierre: ${fechaCierre.toLocaleDateString('es-MX')} (cerrará iniciando ese día)`);
      }
      
      console.log('=====================================\n');
      
      return {
        success: true,
        data: hermanosData,
        isInternal: false
      };

    } catch (error) {
      console.error('Error en autenticación:', error);
      return { success: false, message: 'Error interno del servidor.' };
    }
  }

  private async getHermanos(alumnoId: number): Promise<HermanoData[]> {
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

      const hermanosData: HermanoData[] = [];

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
        console.log('🔍 getHermanos - IDs encontrados:', Array.from(allIds));
        const { data: hermanos } = await supabase
          .from('alumno')
          .select('alumno_id, alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado')
          .in('alumno_id', Array.from(allIds))
          .eq('alumno_ciclo_escolar', 22)
          .neq('alumno_id', alumnoId); // Excluir al alumno actual

        console.log('🔍 getHermanos - datos de hermanos obtenidos:', hermanos);
        if (hermanos) {
          hermanos.forEach(hermano => {
            const hermanoData = {
              control: hermano.alumno_ref,
              nombre: `${hermano.alumno_app} ${hermano.alumno_apm} ${hermano.alumno_nombre}`,
              nivel: hermano.alumno_nivel,
              grado: hermano.alumno_grado
            };
            console.log('🔍 getHermanos - agregando hermano:', hermanoData);
            hermanosData.push(hermanoData);
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
