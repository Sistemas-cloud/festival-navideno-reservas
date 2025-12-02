import { getSupabaseClient } from '../supabase';
import { validateInternalUser } from '../config/internalUsers';
import { hasEarlyAccess, getOpeningDateForFunction } from '../config/earlyAccess';
import { getTodayInMonterrey, parseDateString, isAfterClosingTime } from '../utils/timezone';

interface HermanoData {
  nombre: string;
  control: number;
  nivel: number;
  grado: number;
  isInternal?: boolean;
  funcionAsignada?: number;
}

export interface AuthResult {
  success: boolean;
  data?: unknown;
  message?: string;
  isInternal?: boolean;
  funcionAsignada?: number;
  // Información adicional para errores de fecha de apertura
  isAccessDeniedByDate?: boolean;
  fechaApertura?: string;
  nombreFuncion?: string;
}

export class AuthModel {
  
  async authenticate(alumnoRef: number, clave: string | number): Promise<AuthResult> {
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
      
  
      
      // Validaciones de fechas (usando hora de Monterrey)
      const today = getTodayInMonterrey();
      
      // Fechas de cierre por función - cierra a las 13:00 (1 PM) del día indicado
      // Función 1: Maternal + Kinder + 1° primaria → vende 1-2 dic, cierra a las 13:00 del 2 dic
      // Función 2: 2°-5° primaria → vende 4-5 dic, cierra a las 13:00 del 5 dic
      // Función 3: 6° primaria + Secundaria → vende 8-9 dic, cierra a las 13:00 del 9 dic
      const fechaCierreFuncion1 = "2025-12-02";
      const fechaCierreFuncion2 = "2025-12-05";
      const fechaCierreFuncion3 = "2025-12-09";
      
      // Determinar fecha de cierre según la función del alumno
      let fechaCierreStr = fechaCierreFuncion3; // Por defecto
      let nombreFuncion = '';
      
      if (nivel === 1 || nivel === 2) {
        // Maternal o Kinder → Función 1
        fechaCierreStr = fechaCierreFuncion1;
        nombreFuncion = '1ra Función';
      } else if (nivel === 3) {
        // Primaria
        if (grado === 1) {
          fechaCierreStr = fechaCierreFuncion1;
          nombreFuncion = '1ra Función';
        } else if (grado >= 2 && grado <= 5) {
          fechaCierreStr = fechaCierreFuncion2;
          nombreFuncion = '2da Función';
        } else if (grado === 6) {
          fechaCierreStr = fechaCierreFuncion3;
          nombreFuncion = '3ra Función';
        } else {
          fechaCierreStr = fechaCierreFuncion1;
          nombreFuncion = '1ra Función';
        }
      } else if (nivel === 4) {
        // Secundaria → Función 3
        fechaCierreStr = fechaCierreFuncion3;
        nombreFuncion = '3ra Función';
      }
      
      // Obtener la fecha de cierre como Date para los logs
      const fechaCierre = parseDateString(fechaCierreStr);
      
      // Calcular función numérica para validación de acceso anticipado
      let funcionNum = 3; // Por defecto
      if (nivel === 1 || nivel === 2 || (nivel === 3 && grado === 1)) {
        funcionNum = 1;
      } else if (nivel === 3 && grado >= 2 && grado <= 5) {
        funcionNum = 2;
      } else if (nivel === 3 && grado === 6 || nivel === 4) {
        funcionNum = 3;
      }
      
      // VALIDACIÓN DE ACCESO ANTICIPADO
      // IMPORTANTE: La función 1 NO tiene restricción de fecha - siempre está abierta
      // Las funciones 2 y 3 mantienen sus restricciones de fecha
      // Nota: 'today' ya fue declarado arriba en la línea 198
      
      console.log(`🔍 AuthModel - Validando acceso para función ${funcionNum} (${nombreFuncion})`);
      console.log(`🔍 AuthModel - alumnoRef: ${alumnoRef}, nivel: ${nivel}, grado: ${grado}`);
      
      // Si es función 1, siempre permitir acceso (sin restricción de fecha)
      if (funcionNum === 1) {
        console.log(`✅ Acceso permitido: Función 1 siempre está abierta (sin restricción de fecha)`);
      } else {
        // Para funciones 2 y 3, verificar acceso anticipado o fecha de apertura
        const tieneAccesoAnticipado = hasEarlyAccess(alumnoRef);
        console.log(`🔍 AuthModel - tieneAccesoAnticipado: ${tieneAccesoAnticipado} para control ${alumnoRef}`);
        
        const fechaAperturaStr = getOpeningDateForFunction(funcionNum);
        const fechaApertura = parseDateString(fechaAperturaStr);
        
        console.log(`🔍 AuthModel - fechaAperturaStr: ${fechaAperturaStr}`);
        console.log(`🔍 AuthModel - fechaApertura: ${fechaApertura.toLocaleDateString('es-MX')}`);
        console.log(`🔍 AuthModel - today: ${today.toLocaleDateString('es-MX')}`);
        
        // Solo denegar acceso si NO tiene acceso anticipado Y la fecha actual es ANTES de la fecha de apertura
        // Si la fecha es igual o posterior, permitir acceso
        const fechaAunNoHaPasado = today.getTime() < fechaApertura.getTime();
        console.log(`🔍 AuthModel - fechaAunNoHaPasado: ${fechaAunNoHaPasado}`);
        
        if (!tieneAccesoAnticipado && fechaAunNoHaPasado) {
          const fechaAperturaFormateada = fechaApertura.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Monterrey'
          });
          console.log(`🚫 Acceso denegado: El sistema estará disponible a partir del ${fechaAperturaFormateada} (medianoche hora de Monterrey) para la ${nombreFuncion}`);
          console.log(`📅 Fecha actual en Monterrey: ${today.toLocaleDateString('es-MX')}, Fecha de apertura: ${fechaApertura.toLocaleDateString('es-MX')}`);
          return {
            success: false,
            message: `El sistema de reservas estará disponible a partir del ${fechaAperturaFormateada} (medianoche hora de Monterrey) para la ${nombreFuncion}. Por favor, intenta nuevamente en esa fecha.`,
            isAccessDeniedByDate: true,
            fechaApertura: fechaAperturaStr,
            nombreFuncion: nombreFuncion
          };
        }
        
        // Log de acceso permitido para funciones 2 y 3
        if (tieneAccesoAnticipado) {
          console.log(`✅ Acceso anticipado concedido para control ${alumnoRef}`);
        } else {
          console.log(`✅ Acceso permitido: Fecha de apertura (${fechaAperturaStr}) ya pasó o es hoy`);
          console.log(`📅 Fecha actual en Monterrey: ${today.toLocaleDateString('es-MX')}, Fecha de apertura: ${fechaApertura.toLocaleDateString('es-MX')}`);
        }
      }
      
      if (isAfterClosingTime(fechaCierreStr)) {
        console.log(`✅ Sistema de reservas: CERRADO para ${nombreFuncion} (nivel ${nivel}, grado ${grado}) - cerró a las 13:00 del ${fechaCierre.toLocaleDateString('es-MX')}`);
        console.log(`ℹ️  Los usuarios pueden eliminar asientos pero no pueden reservar nuevos.`);
      } else {
        console.log(`⏰ Sistema de reservas: ABIERTO para ${nombreFuncion} (nivel ${nivel}, grado ${grado})`);
        console.log(`📅 Fecha de cierre: ${fechaCierre.toLocaleDateString('es-MX')} a la 1:00 PM`);
      }
      
      console.log('=====================================\n');
      console.log('✅ AuthModel - Autenticación exitosa, retornando datos');
      console.log('📊 AuthModel - hermanosData:', hermanosData);
      console.log('📊 AuthModel - hermanosData.length:', hermanosData?.length || 0);
      console.log('📊 AuthModel - hermanosData es array?', Array.isArray(hermanosData));
      
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
