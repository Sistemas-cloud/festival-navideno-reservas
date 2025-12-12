import { getSupabaseClient, Reserva } from '../supabase';
import { isInternalUser, findInternalUser } from '../config/internalUsers';
import { formatPaymentDate } from '../utils/paymentDates';
import { getTodayInMonterrey, parseDateString, isAfterClosingTime, isDateReached } from '../utils/timezone';

export class ReservaModel {
  
  async getAsientosDisponibles(alumnoRef: number): Promise<{ asientos: number }> {
    try {
      // Verificar si es usuario interno
      if (isInternalUser(alumnoRef)) {
        const internalUser = findInternalUser(alumnoRef);
        if (internalUser) {
          console.log(`🔐 Usuario interno detectado: ${internalUser.nombre}`);
          console.log(`🎭 Función asignada: ${internalUser.funcion}`);
          console.log(`✅ Usuario interno puede reservar sin límites en función ${internalUser.funcion}`);
          // Retornar un número muy grande para usuarios internos (sin límites)
          return { asientos: 9999 };
        }
      }
      
      const supabase = getSupabaseClient();
      
      // Obtener datos del alumno (para familia) y calcular función (1,2,3)
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumno')
        .select('alumno_nivel, alumno_grado, alumno_id')
        .eq('alumno_ref', alumnoRef)
        .single();

      if (alumnoError || !alumno) {
        console.error('Error al obtener alumno:', alumnoError);
        return { asientos: 0 };
      }

      // Función del alumno (1, 2 o 3) según reglas unificadas
      const funcion = await this.getNivelAlumno(alumnoRef);

      // Verificar si estamos en período de reapertura
      const enReapertura = await this.isReopeningPeriod(funcion);
      
      // Durante la reapertura, no hay límite de boletos por familia
      if (enReapertura) {
        console.log(`🔄 Período de reapertura detectado para función ${funcion} - Sin límite de boletos por familia`);
        return { asientos: 9999 }; // Prácticamente ilimitado
      }

      // Determinar cantidad de boletos permitidos por familia (solo fuera de reapertura)
      let boletosPorFamilia = 0;
      
      // Límites por función (no por nivel educativo)
      // Función 1 → 6, Función 2 → 4, Función 3 → 4
      switch (funcion) {
        case 1:
          boletosPorFamilia = 6;
          break;
        case 2:
          boletosPorFamilia = 4;
          break;
        case 3:
          boletosPorFamilia = 4;
          break;
        default:
          boletosPorFamilia = 4;
      }

      // Casos especiales para alumnos de prueba
      if (alumnoRef === 22222 || alumnoRef === 33333 || alumnoRef === 44444) {
        boletosPorFamilia = 1154;
      }

      // Obtener todos los hermanos de la familia
      const hermanosIds = await this.getHermanosIds(alumno.alumno_id);
      
      // Contar todas las reservas de la familia SOLO en la misma función
      const { count: reservasFamilia, error: countError } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .in('referencia', hermanosIds)
        .eq('estado', 'reservado')
        .eq('nivel', funcion);

      if (countError) {
        console.error('Error al contar reservas de familia:', countError);
        return { asientos: 0 };
      }

      const disponibles = boletosPorFamilia - (reservasFamilia || 0);
      
      console.log(`🎫 Validación por familia para alumno ${alumnoRef}:`);
      console.log(`   👨‍👩‍👧‍👦 Hermanos en familia: ${hermanosIds.length}`);
      console.log(`   🎫 Boletos permitidos por familia (función ${funcion}): ${boletosPorFamilia}`);
      console.log(`   📋 Reservas existentes de familia: ${reservasFamilia || 0}`);
      console.log(`   ✅ Boletos disponibles: ${Math.max(0, disponibles)}`);
      
      return { asientos: Math.max(0, disponibles) };

    } catch (error) {
      console.error('Error al obtener asientos disponibles:', error);
      return { asientos: 0 };
    }
  }

  async getReservas(alumnoRef: number, soloUsuario: boolean = false): Promise<Reserva[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Verificar si es usuario interno
      let nivel: number;
      if (isInternalUser(alumnoRef)) {
        const internalUser = findInternalUser(alumnoRef);
        if (internalUser) {
          nivel = internalUser.funcion; // Usar función asignada como nivel
          console.log(`🔐 getReservas - Usuario interno detectado: ${internalUser.nombre}, función: ${nivel}`);
        } else {
          nivel = await this.getNivelAlumno(alumnoRef);
        }
      } else {
        // Obtener nivel del alumno normal
        nivel = await this.getNivelAlumno(alumnoRef);
      }
      
      console.log(`🔍 getReservas - Buscando reservas para nivel/función: ${nivel}, soloUsuario: ${soloUsuario}`);
      
      let query = supabase
        .from('reservas')
        .select('fila, asiento')
        .eq('estado', 'reservado')
        .eq('nivel', nivel);
      
      // Solo filtrar por referencia si se solicita solo las reservas del usuario
      if (soloUsuario) {
        query = query.eq('referencia', alumnoRef);
      }

      const { data: reservas, error } = await query;

      if (error) {
        console.error('Error al obtener reservas:', error);
        return [];
      }

      console.log(`✅ getReservas - Encontradas ${reservas?.length || 0} reservas para nivel ${nivel}${soloUsuario ? ' (solo usuario)' : ' (todas)'}`);
      return reservas as Reserva[];

    } catch (error) {
      console.error('Error al obtener reservas:', error);
      return [];
    }
  }

  async getPagos(alumnoRef: number, soloUsuario: boolean = false): Promise<Reserva[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Verificar si es usuario interno
      let nivel: number;
      if (isInternalUser(alumnoRef)) {
        const internalUser = findInternalUser(alumnoRef);
        if (internalUser) {
          nivel = internalUser.funcion; // Usar función asignada como nivel
          console.log(`🔐 getPagos - Usuario interno detectado: ${internalUser.nombre}, función: ${nivel}`);
        } else {
          nivel = await this.getNivelAlumno(alumnoRef);
        }
      } else {
        // Obtener nivel del alumno normal
        nivel = await this.getNivelAlumno(alumnoRef);
      }
      
      console.log(`🔍 getPagos - Buscando pagos para nivel/función: ${nivel}, soloUsuario: ${soloUsuario}`);
      
      let query = supabase
        .from('reservas')
        .select('fila, asiento')
        .eq('estado', 'pagado')
        .eq('nivel', nivel);
      
      // Solo filtrar por referencia si se solicita solo los pagos del usuario
      if (soloUsuario) {
        query = query.eq('referencia', alumnoRef);
      }

      const { data: pagos, error } = await query;

      if (error) {
        console.error('Error al obtener pagos:', error);
        return [];
      }

      console.log(`✅ getPagos - Encontrados ${pagos?.length || 0} pagos para nivel ${nivel}${soloUsuario ? ' (solo usuario)' : ' (todos)'}`);
      return pagos as Reserva[];

    } catch (error) {
      console.error('Error al obtener pagos:', error);
      return [];
    }
  }

  async crearReserva(
    asientos: Array<{fila: string, asiento: number}>, 
    alumnoRef: number, 
    _hermanosData: unknown[], 
    precio: number, 
    zona: string,
    fechaPago?: string | null
  ): Promise<{success: boolean, message?: string}> {
    try {
      const supabase = getSupabaseClient();
      
      // Verificar si es usuario interno
      const isInternal = isInternalUser(alumnoRef);
      let nivel: number;
      let funcionAsignada: number | undefined;
      
      if (isInternal) {
        const internalUser = findInternalUser(alumnoRef);
        if (!internalUser) {
          return { success: false, message: 'Error: Usuario interno no encontrado.' };
        }
        nivel = internalUser.funcion; // Usar función asignada como nivel
        funcionAsignada = internalUser.funcion;
        console.log(`🔐 Creando reserva para usuario interno: ${internalUser.nombre}`);
        console.log(`🎭 Función asignada: ${funcionAsignada}`);
      } else {
        nivel = await this.getNivelAlumno(alumnoRef);
      }
      
      // Validar que la familia no exceda el límite de boletos (excepto usuarios internos)
      if (!isInternal) {
        const asientosDisponibles = await this.getAsientosDisponibles(alumnoRef);
        if (asientosDisponibles.asientos < asientos.length) {
          return { 
            success: false, 
            message: `Solo puedes reservar ${asientosDisponibles.asientos} boletos más. Tu familia ya tiene reservas que limitan la cantidad disponible.` 
          };
        }
      } else {
        console.log('✅ Usuario interno: omitting límite de boletos por familia');
      }

      // Validación previa: verificar que todos los asientos estén disponibles
      // Cada función tiene su propio mapa de asientos, por eso filtramos por nivel (función)
      const asientosParaVerificar = asientos.map(a => `${a.fila}${a.asiento}`);
      const { data: asientosOcupados, error: verificarError } = await supabase
        .from('reservas')
        .select('fila, asiento, estado, nivel, referencia')
        .eq('nivel', nivel) // Filtrar por función (cada función tiene su propio mapa)
        .in('estado', ['reservado', 'pagado']);

      if (verificarError) {
        console.error('Error al verificar disponibilidad de asientos:', verificarError);
        return { success: false, message: 'Error al verificar disponibilidad de asientos.' };
      }

      // Verificar duplicidad en la selección actual
      const asientosUnicos = new Set(asientosParaVerificar);
      if (asientosUnicos.size !== asientos.length) {
        return { 
          success: false, 
          message: 'Hay asientos duplicados en tu selección. Por favor, revisa tu elección.' 
        };
      }

      // Verificar si algún asiento ya está ocupado
      for (const asiento of asientos) {
        const asientoOcupado = asientosOcupados?.find(ao => 
          ao.fila === asiento.fila && ao.asiento === asiento.asiento
        );
        
        if (asientoOcupado) {
          const estadoTexto = asientoOcupado.estado === 'reservado' ? 'reservado' : 'pagado';
          // Obtener nombre de función (el campo 'nivel' en la BD contiene el número de función)
          const nombreFuncion = this.getNombreFuncion(asientoOcupado.nivel);
          console.log(`❌ Asiento ${asiento.fila}${asiento.asiento} ya está ${estadoTexto} en ${nombreFuncion} por alumno ${asientoOcupado.referencia}`);
          return { 
            success: false, 
            message: `El asiento ${asiento.fila}${asiento.asiento} ya está ${estadoTexto} en la ${nombreFuncion}.` 
          };
        }
      }

      console.log(`✅ Validación de duplicidad exitosa para ${asientos.length} asientos del alumno ${alumnoRef}`);
      
      // Verificar si estamos en período de reapertura
      const funcion = nivel; // nivel ya es la función para reservas
      const enReapertura = await this.isReopeningPeriod(funcion);
      
      // Usar la fecha de pago proporcionada o calcular una por defecto
      console.log('🔍 crearReserva - fechaPago recibida:', fechaPago);
      console.log('🔍 crearReserva - tipo de fechaPago:', typeof fechaPago);
      console.log('🔍 crearReserva - fechaPago es null?', fechaPago === null);
      console.log('🔍 crearReserva - fechaPago es undefined?', fechaPago === undefined);
      console.log('🔍 crearReserva - fechaPago es string vacío?', fechaPago === '');
      
      // Validar que fechaPago sea una cadena válida y no vacía
      let fechaFormateada: string;
      if (enReapertura) {
        // Durante la reapertura, usar fecha fija automáticamente
        const { getReopeningPaymentDateForFunction } = await import('../config/reopeningPaymentDates');
        fechaFormateada = getReopeningPaymentDateForFunction(funcion);
        console.log(`🔄 crearReserva - Período de reapertura: Usando fecha fija ${fechaFormateada}`);
      } else if (fechaPago && typeof fechaPago === 'string' && fechaPago.trim() !== '') {
        fechaFormateada = fechaPago.trim();
        console.log('✅ crearReserva - Usando fecha de pago proporcionada:', fechaFormateada);
      } else {
        fechaFormateada = this.calcularFechaPagoDefecto();
        console.log('⚠️ crearReserva - Usando fecha de pago por defecto:', fechaFormateada);
      }

      // VALIDACIÓN DE LÍMITE DE FAMILIAS POR FECHA DE PAGO
      // IMPORTANTE: Solo la fecha1 (primer día) tiene límite. La fecha2 (segundo día) siempre está disponible.
      // Durante la reapertura, no hay límites de familias por fecha de pago
      if (!isInternal && !enReapertura) { // Los usuarios internos y reapertura no tienen restricción de límite
        const { getPaymentLimitsForFunction } = await import('../config/paymentLimits');
        const limits = getPaymentLimitsForFunction(nivel);
        
        if (limits) {
          // Solo validar límite para fecha1 (primer día)
          // La fecha2 (segundo día) SIEMPRE está disponible
          const limiteFecha = fechaFormateada === limits.fecha1 ? limits.limiteFecha1 : null;
          
          if (limiteFecha !== null) {
            // Solo validamos fecha1
            const familiasEnFecha = await this.contarFamiliasPorFechaPago(nivel, fechaFormateada);
            console.log(`🔍 crearReserva - Verificando límite fecha1: ${familiasEnFecha} familias en fecha ${fechaFormateada}, límite: ${limiteFecha}`);
            
            // Verificar si la familia ya tiene reservas con esta fecha
            // Si ya tiene reservas con esta fecha, no cuenta como nueva familia
            const { data: alumno, error: alumnoError } = await supabase
              .from('alumno')
              .select('alumno_id')
              .eq('alumno_ref', alumnoRef)
              .single();
            
            if (!alumnoError && alumno) {
              // Buscar si hay otras reservas de esta familia con esta fecha
              const hermanosIds = await this.getHermanosIds(alumno.alumno_id);
              const { data: reservasFamiliaMismaFecha } = await supabase
                .from('reservas')
                .select('referencia')
                .in('referencia', hermanosIds)
                .eq('nivel', nivel)
                .eq('fecha_pago', fechaFormateada)
                .in('estado', ['reservado', 'pagado'])
                .limit(1);
              
              const familiaYaTieneReservas = (reservasFamiliaMismaFecha && reservasFamiliaMismaFecha.length > 0);
              
              // Si la familia ya tiene reservas con esta fecha, no cuenta como nueva
              // Si no tiene reservas con esta fecha y el límite está lleno, bloquear
              if (!familiaYaTieneReservas && familiasEnFecha >= limiteFecha) {
                const nombreFuncion = this.getNombreFuncion(nivel);
                return {
                  success: false,
                  message: `Lo sentimos, la fecha de pago ${formatPaymentDate(fechaFormateada)} para la ${nombreFuncion} ya ha alcanzado su límite máximo de ${limiteFecha} familias. Por favor, selecciona la otra fecha disponible (segundo día).`
                };
              }
            }
          } else if (fechaFormateada === limits.fecha2) {
            // Fecha2 - sin validación de límite
            console.log(`✅ crearReserva - Fecha2 (${fechaFormateada}): SIEMPRE DISPONIBLE - sin límite de cupo`);
          }
        }
      }

      // PASO 1: Crear las nuevas reservas (primera parte de la transacción)
      for (const asiento of asientos) {

        // Verificar si el asiento ya existe
        const { data: existing } = await supabase
          .from('reservas')
          .select('id')
          .eq('fila', asiento.fila)
          .eq('asiento', asiento.asiento)
          .eq('nivel', nivel)
          .single();

        // Si el asiento existe, actualizarlo. Si no, insertarlo (upsert)
        const reservaData = {
          fila: asiento.fila,
          asiento: asiento.asiento,
          estado: 'reservado' as const,
          referencia: alumnoRef,
          nivel: nivel,
          fecha_pago: fechaFormateada,
          precio: precio,
          zona: zona
        };

        if (existing && existing.id) {
          // Actualizar reserva existente
          const { error: updateError } = await supabase
            .from('reservas')
            .update(reservaData)
            .eq('id', existing.id);

          if (updateError) {
            console.error('❌ Error al actualizar reserva:', updateError);
            return { success: false, message: 'Error al actualizar la reserva.' };
          }
        } else {
          // Insertar nueva reserva
          const { error: insertError } = await supabase
            .from('reservas')
            .insert(reservaData);

          if (insertError) {
            console.error('❌ Error al insertar reserva:', insertError);
            return { success: false, message: 'Error al crear la reserva.' };
          }
        }
      }

      // PASO 2: Actualizar fecha de pago de TODAS las reservas del alumno (incluyendo las nuevas)
      // Esto asegura que todas las reservas del alumno tengan la misma fecha de pago
      const { data: todasReservas, error: reservasError } = await supabase
        .from('reservas')
        .select('id')
        .eq('referencia', alumnoRef)
        .eq('nivel', nivel)
        .eq('estado', 'reservado');

      if (reservasError) {
        console.error('❌ Error al obtener todas las reservas:', reservasError);
        // Si falla, las reservas ya se crearon pero sin actualizar fecha de pago de otras
        // Esto es aceptable, pero reportamos el error
        return { 
          success: false, 
          message: 'Error al actualizar fecha de pago. Por favor, intenta nuevamente.' 
        };
      }

      // Actualizar fecha de pago de todas las reservas del alumno
      if (todasReservas && todasReservas.length > 0) {
        const idsTodasReservas = todasReservas.map(r => r.id);
        const { error: updateError } = await supabase
          .from('reservas')
          .update({ fecha_pago: fechaFormateada })
          .in('id', idsTodasReservas)
          .eq('referencia', alumnoRef)
          .eq('nivel', nivel)
          .eq('estado', 'reservado');

        if (updateError) {
          console.error('❌ Error al actualizar fecha de pago:', updateError);
          // Si falla la actualización de fecha, las reservas ya se crearon
          // Esto es aceptable, pero reportamos el error
          return { 
            success: false, 
            message: 'Error al actualizar fecha de pago. Por favor, intenta nuevamente.' 
          };
        }

        console.log(`✅ Fecha de pago actualizada para ${todasReservas.length} reservas del alumno`);
      }

      console.log(`🎉 ${asientos.length} reservas creadas y fecha de pago actualizada exitosamente`);
      return { success: true };

    } catch (error) {
      console.error('Error al crear reserva:', error);
      return { success: false, message: 'Error interno del servidor.' };
    }
  }

  private async getHermanosIds(alumnoId: number): Promise<number[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Obtener datos de los padres/tutores
      const { data: padres, error: padresError } = await supabase
        .from('alumno_familiar')
        .select('familiar_app, familiar_apm, familiar_nombre, familiar_cel, familiar_curp')
        .eq('alumno_id', alumnoId)
        .in('tutor_id', [1, 2])
        .limit(2);

      if (padresError || !padres || padres.length === 0) {
        console.error('Error al obtener padres:', padresError);
        return [alumnoId]; // Solo el alumno actual si no hay padres
      }

      const hermanosIds = new Set<number>();
      hermanosIds.add(alumnoId); // Incluir al alumno actual

      // Recopilar criterios de búsqueda
      const searchCriteria = {
        telefonos: new Set<string>(),
        curps: new Set<string>()
      };

      for (const padre of padres) {
        if (padre.familiar_cel) {
          searchCriteria.telefonos.add(padre.familiar_cel);
        }
        if (padre.familiar_curp) {
          searchCriteria.curps.add(padre.familiar_curp);
        }
      }

      // Buscar hermanos por teléfono
      if (searchCriteria.telefonos.size > 0) {
        const { data: celularRows } = await supabase
          .from('alumno_familiar')
          .select('alumno_id')
          .in('familiar_cel', Array.from(searchCriteria.telefonos));

        if (celularRows) {
          celularRows.forEach((row: { alumno_id: number }) => hermanosIds.add(row.alumno_id));
        }
      }

      // Buscar hermanos por CURP
      if (searchCriteria.curps.size > 0) {
        const { data: curpRows } = await supabase
          .from('alumno_familiar')
          .select('alumno_id')
          .in('familiar_curp', Array.from(searchCriteria.curps));

        if (curpRows) {
          curpRows.forEach((row: { alumno_id: number }) => hermanosIds.add(row.alumno_id));
        }
      }

      // Obtener los números de control de los hermanos
      const { data: hermanos } = await supabase
        .from('alumno')
        .select('alumno_ref')
        .in('alumno_id', Array.from(hermanosIds))
        .eq('alumno_ciclo_escolar', 22);

      return hermanos ? hermanos.map(h => h.alumno_ref) : [alumnoId];

    } catch (error) {
      console.error('Error al obtener hermanos:', error);
      return [alumnoId]; // Solo el alumno actual en caso de error
    }
  }

  async eliminarReserva(
    asientos: Array<{fila: string, asiento: number}>, 
    alumnoRef: number,
    fechaPago: string | null
  ): Promise<{success: boolean, message?: string}> {
    if (!fechaPago) {
      return { success: false, message: 'La fecha de pago es requerida para modificar reservas.' };
    }

    const supabase = getSupabaseClient();
    
    try {
      const esInterno = isInternalUser(alumnoRef);
      let nivel: number;

      if (esInterno) {
        const internalUser = findInternalUser(alumnoRef);
        if (!internalUser) {
          return { success: false, message: 'Error: Usuario interno no encontrado.' };
        }
        nivel = internalUser.funcion;
        console.log(`🔐 eliminarReserva - Usuario interno detectado: ${internalUser.nombre}, función: ${nivel}`);
      } else {
        nivel = await this.getNivelAlumno(alumnoRef);
      }
      
      console.log(`🗑️ Iniciando eliminación transaccional de ${asientos.length} reservas para alumno ${alumnoRef}`);
      
      // PASO 1: Verificar que los asientos pertenecen al alumno y están reservados (no pagados)
      const idsAEliminar: number[] = [];
      for (const asiento of asientos) {
        const { data: reservaExistente, error: checkError } = await supabase
          .from('reservas')
          .select('estado, id, referencia, nivel')
          .eq('fila', asiento.fila)
          .eq('asiento', asiento.asiento)
          .eq('nivel', nivel)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error al verificar reserva:', checkError);
          return { success: false, message: 'Error al verificar la reserva.' };
        }

        if (!reservaExistente) {
          return { 
            success: false, 
            message: `El asiento ${asiento.fila}${asiento.asiento} no tiene una reserva activa.` 
          };
        }

        if (reservaExistente.estado === 'pagado') {
          return { 
            success: false, 
            message: `El asiento ${asiento.fila}${asiento.asiento} ya está pagado y no se puede eliminar.` 
          };
        }

        if (!esInterno && reservaExistente.referencia !== alumnoRef) {
          return { 
            success: false, 
            message: `El asiento ${asiento.fila}${asiento.asiento} no pertenece a tu reserva.` 
          };
        }

        idsAEliminar.push(reservaExistente.id);
      }

      // PASO 2: Eliminar las reservas (primera parte de la transacción)
      for (const asiento of asientos) {
        const { error: deleteError } = await supabase
          .from('reservas')
          .delete()
          .eq('fila', asiento.fila)
          .eq('asiento', asiento.asiento)
          .eq('nivel', nivel)
          .eq('referencia', alumnoRef)
          .eq('estado', 'reservado');

        if (deleteError) {
          console.error('❌ Error al eliminar reserva:', deleteError);
          // Si falla la eliminación, retornar error (no hay nada que revertir aún)
          return { success: false, message: 'Error al eliminar la reserva.' };
        }

        console.log(`✅ Asiento ${asiento.fila}${asiento.asiento} eliminado exitosamente`);
      }

      // PASO 3: Actualizar fecha de pago de TODAS las reservas restantes del alumno
      // Obtener IDs de todas las reservas restantes del alumno en esta función
      const { data: reservasRestantes, error: reservasError } = await supabase
        .from('reservas')
        .select('id')
        .eq('referencia', alumnoRef)
        .eq('nivel', nivel)
        .eq('estado', 'reservado');

      if (reservasError) {
        console.error('❌ Error al obtener reservas restantes:', reservasError);
        // Rollback: Recrear las reservas eliminadas
        console.log('🔄 Intentando revertir eliminación...');
        // No podemos revertir fácilmente sin los datos originales, así que retornamos error
        return { 
          success: false, 
          message: 'Error al actualizar fecha de pago. Por favor, intenta nuevamente.' 
        };
      }

      // Actualizar fecha de pago de todas las reservas restantes
      if (reservasRestantes && reservasRestantes.length > 0) {
        const idsReservasRestantes = reservasRestantes.map(r => r.id);
        const { error: updateError } = await supabase
          .from('reservas')
          .update({ fecha_pago: fechaPago })
          .in('id', idsReservasRestantes)
          .eq('referencia', alumnoRef)
          .eq('nivel', nivel)
          .eq('estado', 'reservado');

        if (updateError) {
          console.error('❌ Error al actualizar fecha de pago:', updateError);
          // Rollback: No podemos revertir fácilmente, pero reportamos el error
          return { 
            success: false, 
            message: 'Error al actualizar fecha de pago. Por favor, intenta nuevamente.' 
          };
        }

        console.log(`✅ Fecha de pago actualizada para ${reservasRestantes.length} reservas restantes`);
      }

      console.log(`🎉 ${asientos.length} reservas eliminadas y fecha de pago actualizada exitosamente para alumno ${alumnoRef}`);
      return { 
        success: true, 
        message: `${asientos.length} reserva(s) eliminada(s) exitosamente. Fecha de pago actualizada.` 
      };

    } catch (error) {
      console.error('❌ Error en proceso transaccional:', error);
      return { success: false, message: 'Error interno del servidor.' };
    }
  }

  async cambiarAsiento(
    asientoActual: {fila: string, asiento: number},
    asientoNuevo: {fila: string, asiento: number},
    alumnoRef: number,
    precio: number,
    zona: string
  ): Promise<{success: boolean, message?: string}> {
    const supabase = getSupabaseClient();
    
    try {
      const esInterno = isInternalUser(alumnoRef);
      let nivel: number;

      if (esInterno) {
        const internalUser = findInternalUser(alumnoRef);
        if (!internalUser) {
          return { success: false, message: 'Error: Usuario interno no encontrado.' };
        }
        nivel = internalUser.funcion;
        console.log(`🔐 cambiarAsiento - Usuario interno detectado: ${internalUser.nombre}, función: ${nivel}`);
      } else {
        nivel = await this.getNivelAlumno(alumnoRef);
      }
      
      console.log(`🔄 Iniciando cambio de asiento: ${asientoActual.fila}${asientoActual.asiento} → ${asientoNuevo.fila}${asientoNuevo.asiento} para alumno ${alumnoRef}`);
      
      // PASO 1: Verificar que el asiento actual pertenece al alumno y está reservado (no pagado)
      const { data: reservaActual, error: checkError } = await supabase
        .from('reservas')
        .select('id, fila, asiento, estado, referencia, nivel, fecha_pago, precio, zona')
        .eq('fila', asientoActual.fila)
        .eq('asiento', asientoActual.asiento)
        .eq('nivel', nivel)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar reserva actual:', checkError);
        return { success: false, message: 'Error al verificar la reserva actual.' };
      }

      if (!reservaActual) {
        return { 
          success: false, 
          message: `El asiento ${asientoActual.fila}${asientoActual.asiento} no tiene una reserva activa.` 
        };
      }

      if (reservaActual.estado === 'pagado') {
        return { 
          success: false, 
          message: `El asiento ${asientoActual.fila}${asientoActual.asiento} ya está pagado y no se puede cambiar.` 
        };
      }

      if (!esInterno && reservaActual.referencia !== alumnoRef) {
        return { 
          success: false, 
          message: `El asiento ${asientoActual.fila}${asientoActual.asiento} no pertenece a tu reserva.` 
        };
      }

      // Usar la fecha de pago de la reserva actual
      const fechaPago = reservaActual.fecha_pago;

      // PASO 2: Verificar que el nuevo asiento esté disponible
      const { data: asientoOcupado, error: disponibilidadError } = await supabase
        .from('reservas')
        .select('fila, asiento, estado, nivel, referencia')
        .eq('fila', asientoNuevo.fila)
        .eq('asiento', asientoNuevo.asiento)
        .eq('nivel', nivel)
        .in('estado', ['reservado', 'pagado'])
        .maybeSingle();

      if (disponibilidadError && disponibilidadError.code !== 'PGRST116') {
        console.error('Error al verificar disponibilidad del nuevo asiento:', disponibilidadError);
        return { success: false, message: 'Error al verificar disponibilidad del nuevo asiento.' };
      }

      if (asientoOcupado) {
        const estadoTexto = asientoOcupado.estado === 'reservado' ? 'reservado' : 'pagado';
        return { 
          success: false, 
          message: `El asiento ${asientoNuevo.fila}${asientoNuevo.asiento} ya está ${estadoTexto}.` 
        };
      }

      // PASO 3: Eliminar el asiento actual
      const { error: deleteError } = await supabase
        .from('reservas')
        .delete()
        .eq('id', reservaActual.id);

      if (deleteError) {
        console.error('❌ Error al eliminar reserva actual:', deleteError);
        return { success: false, message: 'Error al eliminar el asiento actual.' };
      }

      console.log(`✅ Asiento actual ${asientoActual.fila}${asientoActual.asiento} eliminado exitosamente`);

      // PASO 4: Crear la nueva reserva con los mismos datos (misma fecha de pago)
      const nuevaReservaData = {
        fila: asientoNuevo.fila,
        asiento: asientoNuevo.asiento,
        estado: 'reservado' as const,
        referencia: alumnoRef,
        nivel: nivel,
        fecha_pago: fechaPago,
        precio: precio || reservaActual.precio,
        zona: zona || reservaActual.zona
      };

      const { error: insertError } = await supabase
        .from('reservas')
        .insert(nuevaReservaData);

      if (insertError) {
        console.error('❌ Error al crear nueva reserva:', insertError);
        // Intentar revertir: recrear la reserva original
        const { error: revertError } = await supabase
          .from('reservas')
          .insert({
            fila: reservaActual.fila || asientoActual.fila,
            asiento: reservaActual.asiento || asientoActual.asiento,
            estado: 'reservado' as const,
            referencia: alumnoRef,
            nivel: nivel,
            fecha_pago: fechaPago,
            precio: reservaActual.precio,
            zona: reservaActual.zona
          });

        if (revertError) {
          console.error('❌ Error crítico: No se pudo revertir el cambio. Contacte al administrador.');
        }

        return { success: false, message: 'Error al crear el nuevo asiento. Se ha revertido el cambio.' };
      }

      console.log(`✅ Nuevo asiento ${asientoNuevo.fila}${asientoNuevo.asiento} creado exitosamente`);

      // PASO 5: Actualizar fecha de pago de todas las reservas restantes del alumno (por consistencia)
      const { data: reservasRestantes, error: reservasError } = await supabase
        .from('reservas')
        .select('id')
        .eq('referencia', alumnoRef)
        .eq('nivel', nivel)
        .eq('estado', 'reservado');

      if (!reservasError && reservasRestantes && reservasRestantes.length > 0) {
        const idsReservasRestantes = reservasRestantes.map(r => r.id);
        const { error: updateError } = await supabase
          .from('reservas')
          .update({ fecha_pago: fechaPago })
          .in('id', idsReservasRestantes)
          .eq('referencia', alumnoRef)
          .eq('nivel', nivel)
          .eq('estado', 'reservado');

        if (updateError) {
          console.error('⚠️ Error al actualizar fecha de pago de reservas restantes (no crítico):', updateError);
          // No es crítico, solo un warning
        } else {
          console.log(`✅ Fecha de pago actualizada para ${reservasRestantes.length} reservas restantes`);
        }
      }

      console.log(`🎉 Cambio de asiento completado exitosamente: ${asientoActual.fila}${asientoActual.asiento} → ${asientoNuevo.fila}${asientoNuevo.asiento}`);
      return { 
        success: true, 
        message: `Asiento cambiado exitosamente de ${asientoActual.fila}${asientoActual.asiento} a ${asientoNuevo.fila}${asientoNuevo.asiento}.` 
      };

    } catch (error) {
      console.error('❌ Error en proceso de cambio de asiento:', error);
      return { success: false, message: 'Error interno del servidor.' };
    }
  }

  /**
   * Calcula la función (1, 2 o 3) basada en el nivel y grado del alumno
   * Reglas:
   * - Función 1: Nivel 1 (maternal) + Nivel 2 (kinder) + Nivel 3 Grado 1 (1° primaria)
   * - Función 2: Nivel 3 Grados 2-5 (2°-5° primaria)
   * - Función 3: Nivel 3 Grado 6 (6° primaria) + Nivel 4 (secundaria)
   */
  private calcularFuncion(nivel: number, grado: number): number {
    if (nivel === 1 || nivel === 2) {
      // Maternal (nivel 1) y Kinder (nivel 2) → Función 1
      return 1;
    } else if (nivel === 3) {
      // Primaria
      if (grado === 1) {
        return 1; // 1° primaria → Función 1
      } else if (grado >= 2 && grado <= 5) {
        return 2; // 2°-5° primaria → Función 2
      } else if (grado === 6) {
        return 3; // 6° primaria → Función 3
      }
    } else if (nivel === 4) {
      // Secundaria → Función 3
      return 3;
    }
    
    // Por defecto retornar función 1
    return 1;
  }

  /**
   * Obtiene el número de función del alumno
   */
  async getNivelAlumno(alumnoRef: number): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      
      const { data: alumno, error } = await supabase
        .from('alumno')
        .select('alumno_nivel, alumno_grado')
        .eq('alumno_ref', alumnoRef)
        .single();

      if (error || !alumno) {
        console.error('Error al obtener nivel del alumno:', error);
        return 1;
      }

      const nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;

      // Calcular función según las nuevas reglas
      const funcion = this.calcularFuncion(nivel, grado);

      // Casos especiales para alumnos de prueba
      if (alumnoRef === 22222) {
        return 1;
      } else if (alumnoRef === 33333) {
        return 2;
      } else if (alumnoRef === 44444) {
        return 3;
      }

      return funcion;

    } catch (error) {
      console.error('Error al obtener nivel del alumno:', error);
      return 1;
    }
  }

  /**
   * Obtiene el nombre de la función basada en el número de función
   */
  private getNombreFuncion(funcion: number): string {
    switch (funcion) {
      case 1:
        return '1ra Función';
      case 2:
        return '2da Función';
      case 3:
        return '3ra Función';
      default:
        return 'Función desconocida';
    }
  }

  private calcularFechaPagoDefecto(): string {
    // Fecha por defecto (solo se usa si no se proporciona fecha de pago)
    // Usar fecha de venta más temprana para 2025
    return '2025-12-01';
  }

  /**
   * Cuenta el número de referencias únicas (clientes) que ya tienen reservas con una fecha de pago específica
   * Cada referencia en la tabla de reservas representa a un alumno/familia que realizará el pago
   */
  async contarFamiliasPorFechaPago(funcion: number, fechaPago: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();

      const { data: reservas, error } = await supabase
        .from('reservas')
        .select('referencia')
        .eq('nivel', funcion)
        .eq('fecha_pago', fechaPago)
        .in('estado', ['reservado', 'pagado']);

      if (error) {
        console.error('Error al obtener reservas para contar familias:', error);
        return 0;
      }

      if (!reservas || reservas.length === 0) {
        console.log(`🔍 contarFamiliasPorFechaPago - 0 referencias para función ${funcion}, fecha ${fechaPago}`);
        return 0;
      }

      const referenciasUnicas = new Set<number>();

      reservas.forEach(reserva => {
        const referencia = reserva?.referencia;
        if (referencia !== null && referencia !== undefined) {
          const referenciaNum = Number(referencia);
          if (!Number.isNaN(referenciaNum)) {
            referenciasUnicas.add(referenciaNum);
          }
        }
      });

      console.log(`✅ contarFamiliasPorFechaPago - ${referenciasUnicas.size} referencias únicas para función ${funcion}, fecha ${fechaPago}`);
      return referenciasUnicas.size;

    } catch (error) {
      console.error('Error al contar familias por fecha de pago:', error);
      return 0;
    }
  }

  /**
   * Obtiene la disponibilidad de fechas de pago para una función
   * IMPORTANTE: Solo la fecha1 (primer día) tiene límite de cupo
   * La fecha2 (segundo día) siempre está disponible sin límite
   */
  async getPaymentDateAvailability(funcion: number): Promise<Array<{fecha: string, disponibles: number, limite: number, llena: boolean}>> {
    try {
      // Verificar si estamos en período de reapertura
      const enReapertura = await this.isReopeningPeriod(funcion);
      
      if (enReapertura) {
        // Durante la reapertura, usar fecha de pago fija
        const { getReopeningPaymentDateForFunction } = await import('../config/reopeningPaymentDates');
        const fechaPagoFija = getReopeningPaymentDateForFunction(funcion);
        
        console.log(`🔄 Período de reapertura - Función ${funcion}: Fecha de pago fija ${fechaPagoFija}`);
        
        return [{
          fecha: fechaPagoFija,
          disponibles: 9999, // Sin límite
          limite: 0, // 0 indica sin límite
          llena: false // Nunca está llena
        }];
      }
      
      // Fuera de reapertura, usar el sistema anterior con dos fechas
      const { getPaymentLimitsForFunction } = await import('../config/paymentLimits');
      const limits = getPaymentLimitsForFunction(funcion);
      
      if (!limits) {
        console.error(`No se encontraron límites para función ${funcion}`);
        return [];
      }

      const disponibilidad = [];

      // Fecha 1: Contar familias y aplicar límite
      const familiasFecha1 = await this.contarFamiliasPorFechaPago(funcion, limits.fecha1);
      const disponiblesFecha1 = Math.max(0, limits.limiteFecha1 - familiasFecha1);
      const llenaFecha1 = familiasFecha1 >= limits.limiteFecha1;

      disponibilidad.push({
        fecha: limits.fecha1,
        disponibles: disponiblesFecha1,
        limite: limits.limiteFecha1,
        llena: llenaFecha1
      });

      // Fecha 2: SIEMPRE DISPONIBLE - No tiene límite de cupo
      // Contar solo para información, pero nunca marcar como llena
      const familiasFecha2 = await this.contarFamiliasPorFechaPago(funcion, limits.fecha2);

      disponibilidad.push({
        fecha: limits.fecha2,
        disponibles: 9999, // Número alto para indicar "sin límite"
        limite: 0, // 0 indica sin límite
        llena: false // SIEMPRE false - segunda fecha nunca se llena
      });

      console.log(`📅 Disponibilidad fecha 1 (${limits.fecha1}): ${disponiblesFecha1} de ${limits.limiteFecha1} - ${llenaFecha1 ? 'LLENA' : 'DISPONIBLE'}`);
      console.log(`📅 Disponibilidad fecha 2 (${limits.fecha2}): SIEMPRE DISPONIBLE (${familiasFecha2} familias registradas)`);

      return disponibilidad;

    } catch (error) {
      console.error('Error al obtener disponibilidad de fechas de pago:', error);
      return [];
    }
  }

  /**
   * Valida si el portal de reservas está cerrado para un alumno
   * Retorna true si está cerrado (no puede reservar), false si está abierto
   * Los usuarios internos nunca están bloqueados por fechas
   */
  async isPortalCerrado(alumnoRef: number): Promise<{ cerrado: boolean; mensaje?: string }> {
    try {
      // Usuarios internos nunca están bloqueados por fechas
      if (isInternalUser(alumnoRef)) {
        const internalUser = findInternalUser(alumnoRef);
        if (internalUser) {
          console.log(`🔐 Usuario interno: ${internalUser.nombre} - siempre puede reservar`);
          return { cerrado: false };
        }
      }
      
      const supabase = getSupabaseClient();
      
      const { data: alumno, error } = await supabase
        .from('alumno')
        .select('alumno_nivel, alumno_grado')
        .eq('alumno_ref', alumnoRef)
        .single();

      if (error || !alumno) {
        console.error('Error al obtener nivel del alumno para validar cierre:', error);
        return { cerrado: false }; // Por defecto permitir si hay error
      }

      const nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;
      const funcion = this.calcularFuncion(nivel, grado);

      // Fechas de cierre - cierra a las 13:00 (1 PM) del día indicado
      const fechaCierreFuncion1 = "2025-12-02"; // Cierra a las 13:00 del 2 de dic
      const fechaCierreFuncion2 = "2025-12-05"; // Cierra a las 13:00 del 5 de dic
      const fechaCierreFuncion3 = "2025-12-09"; // Cierra a las 13:00 del 9 de dic

      let fechaCierreStr: string;
      let nombreFuncion: string;

      if (funcion === 1) {
        fechaCierreStr = fechaCierreFuncion1;
        nombreFuncion = '1ra Función';
      } else if (funcion === 2) {
        fechaCierreStr = fechaCierreFuncion2;
        nombreFuncion = '2da Función';
      } else {
        fechaCierreStr = fechaCierreFuncion3;
        nombreFuncion = '3ra Función';
      }

      console.log(`🔍 isPortalCerrado - Alumno ${alumnoRef}: función=${funcion} (${nombreFuncion}), fechaCierre=${fechaCierreStr}`);
      
      // Verificar si ya pasó la hora de cierre (13:00 del día indicado)
      const yaCerro = isAfterClosingTime(fechaCierreStr);
      console.log(`🔍 isPortalCerrado - Verificación de cierre para ${nombreFuncion}: fechaCierre=${fechaCierreStr}, yaCerro=${yaCerro}`);
      
      if (yaCerro) {
        // Portal cerrado permanentemente - no hay reapertura
        const fechaCierre = parseDateString(fechaCierreStr);
        console.log(`🚫 isPortalCerrado - Portal CERRADO permanentemente para ${nombreFuncion} (alumno ${alumnoRef})`);
        return {
          cerrado: true,
          mensaje: `Las reservas de boletos para la ${nombreFuncion} cerraron permanentemente el ${fechaCierre.toLocaleDateString('es-MX')} a la 1:00 PM. Aún puedes cambiar asientos si lo necesitas.`
        };
      }

      console.log(`✅ isPortalCerrado - Portal ABIERTO para ${nombreFuncion} (alumno ${alumnoRef})`);
      return { cerrado: false };

    } catch (error) {
      console.error('Error al validar cierre del portal:', error);
      return { cerrado: false }; // Por defecto permitir si hay error
    }
  }

  /**
   * Verifica si estamos en período de reapertura para una función específica
   * NOTA: El portal está cerrado permanentemente - no hay reapertura
   */
  async isReopeningPeriod(funcion: number): Promise<boolean> {
    // Portal cerrado permanentemente - no hay reapertura
    console.log(`🔍 isReopeningPeriod - Función ${funcion}: Portal cerrado permanentemente, no hay reapertura`);
    return false;
  }
}
