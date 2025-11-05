import { getSupabaseClient, Reserva } from '../supabase';
import { isInternalUser, findInternalUser } from '../config/internalUsers';
import { formatPaymentDate } from '../utils/paymentDates';

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

      // Determinar cantidad de boletos permitidos por familia
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
      
      // Usar la fecha de pago proporcionada o calcular una por defecto
      console.log('🔍 crearReserva - fechaPago recibida:', fechaPago);
      console.log('🔍 crearReserva - tipo de fechaPago:', typeof fechaPago);
      console.log('🔍 crearReserva - fechaPago es null?', fechaPago === null);
      console.log('🔍 crearReserva - fechaPago es undefined?', fechaPago === undefined);
      console.log('🔍 crearReserva - fechaPago es string vacío?', fechaPago === '');
      
      // Validar que fechaPago sea una cadena válida y no vacía
      let fechaFormateada: string;
      if (fechaPago && typeof fechaPago === 'string' && fechaPago.trim() !== '') {
        fechaFormateada = fechaPago.trim();
        console.log('✅ crearReserva - Usando fecha de pago proporcionada:', fechaFormateada);
      } else {
        fechaFormateada = this.calcularFechaPagoDefecto();
        console.log('⚠️ crearReserva - Usando fecha de pago por defecto:', fechaFormateada);
      }

      // VALIDACIÓN DE LÍMITE DE FAMILIAS POR FECHA DE PAGO
      // Verificar si la fecha de pago seleccionada está llena
      if (!isInternal) { // Los usuarios internos no tienen restricción de límite
        const { getPaymentLimitsForFunction } = await import('../config/paymentLimits');
        const limits = getPaymentLimitsForFunction(nivel);
        
        if (limits) {
          // Verificar si la fecha está llena
          const familiasEnFecha = await this.contarFamiliasPorFechaPago(nivel, fechaFormateada);
          const limiteFecha = fechaFormateada === limits.fecha1 ? limits.limiteFecha1 : 
                             fechaFormateada === limits.fecha2 ? limits.limiteFecha2 : null;
          
          if (limiteFecha !== null) {
            console.log(`🔍 crearReserva - Verificando límite: ${familiasEnFecha} familias en fecha ${fechaFormateada}, límite: ${limiteFecha}`);
            
            // Verificar si la familia ya tiene reservas con esta fecha
            // Si ya tiene reservas con esta fecha, no cuenta como nueva familia
            const { data: alumno, error: alumnoError } = await supabase
              .from('alumno')
              .select('alumno_id')
              .eq('alumno_ref', alumnoRef)
              .single();
            
            if (!alumnoError && alumno) {
              // Obtener familia del alumno
              const { data: familia, error: familiaError } = await supabase
                .from('alumno_familiar')
                .select('familiar_cel, familiar_curp')
                .eq('alumno_id', alumno.alumno_id)
                .in('tutor_id', [1, 2])
                .limit(1)
                .single();
              
              // Verificar si esta familia ya tiene reservas con esta fecha
              const familiaId = familia && !familiaError 
                ? (familia.familiar_cel || familia.familiar_curp || `REF_${alumnoRef}`)
                : `REF_${alumnoRef}`;
              
              // Buscar si hay otras reservas de esta familia con esta fecha
              const hermanosIds = await this.getHermanosIds(alumno.alumno_id);
              const { data: reservasFamiliaMismaFecha, error: checkError } = await supabase
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
                  message: `Lo sentimos, la fecha de pago ${formatPaymentDate(fechaFormateada)} para la ${nombreFuncion} ya ha alcanzado su límite máximo de ${limiteFecha} familias. Por favor, selecciona la otra fecha disponible.`
                };
              }
            }
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
      const nivel = await this.getNivelAlumno(alumnoRef);
      
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

        if (reservaExistente.referencia !== alumnoRef) {
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
   * Cuenta el número de familias únicas que ya tienen reservas con una fecha de pago específica
   * Una familia se identifica por familiar_cel o familiar_curp
   * Optimizado para hacer consultas en batch
   */
  async contarFamiliasPorFechaPago(funcion: number, fechaPago: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      
      // Obtener todas las reservas con esta fecha de pago y función
      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select('referencia')
        .eq('nivel', funcion)
        .eq('fecha_pago', fechaPago)
        .in('estado', ['reservado', 'pagado']);

      if (reservasError) {
        console.error('Error al obtener reservas para contar familias:', reservasError);
        return 0;
      }

      if (!reservas || reservas.length === 0) {
        return 0;
      }

      // Obtener referencias únicas (alumnos)
      const referenciasUnicas = Array.from(new Set(reservas.map(r => r.referencia)));
      console.log(`🔍 contarFamiliasPorFechaPago - ${referenciasUnicas.length} alumnos únicos con fecha ${fechaPago}`);

      if (referenciasUnicas.length === 0) {
        return 0;
      }

      // Obtener todos los alumnos de una vez
      const { data: alumnos, error: alumnosError } = await supabase
        .from('alumno')
        .select('alumno_id, alumno_ref')
        .in('alumno_ref', referenciasUnicas);

      if (alumnosError || !alumnos) {
        console.error('Error al obtener alumnos:', alumnosError);
        return 0;
      }

      // Crear mapa de referencia -> alumno_id
      const referenciaToAlumnoId = new Map<number, number>();
      alumnos.forEach(alumno => {
        referenciaToAlumnoId.set(alumno.alumno_ref, alumno.alumno_id);
      });

      // Obtener todos los datos de familia de una vez
      const alumnoIds = Array.from(referenciaToAlumnoId.values());
      const { data: familias, error: familiasError } = await supabase
        .from('alumno_familiar')
        .select('alumno_id, familiar_cel, familiar_curp')
        .in('alumno_id', alumnoIds)
        .in('tutor_id', [1, 2]);

      if (familiasError) {
        console.error('Error al obtener familias:', familiasError);
        // Fallback: contar por referencia
        return referenciasUnicas.length;
      }

      // Crear mapa de alumno_id -> familia_id
      const alumnoIdToFamiliaId = new Map<number, string>();
      if (familias) {
        familias.forEach(familia => {
          const familiaId = familia.familiar_cel || familia.familiar_curp;
          if (familiaId && !alumnoIdToFamiliaId.has(familia.alumno_id)) {
            alumnoIdToFamiliaId.set(familia.alumno_id, familiaId);
          }
        });
      }

      // Identificar familias únicas
      const familiasUnicas = new Set<string>();
      referenciasUnicas.forEach(referencia => {
        const alumnoId = referenciaToAlumnoId.get(referencia);
        if (alumnoId) {
          const familiaId = alumnoIdToFamiliaId.get(alumnoId);
          if (familiaId) {
            familiasUnicas.add(familiaId);
          } else {
            // Si no hay familia identificada, usar referencia como identificador único
            familiasUnicas.add(`REF_${referencia}`);
          }
        } else {
          // Si no se encontró el alumno, usar referencia como identificador único
          familiasUnicas.add(`REF_${referencia}`);
        }
      });

      console.log(`✅ contarFamiliasPorFechaPago - ${familiasUnicas.size} familias únicas para función ${funcion}, fecha ${fechaPago}`);
      return familiasUnicas.size;

    } catch (error) {
      console.error('Error al contar familias por fecha de pago:', error);
      return 0;
    }
  }

  /**
   * Obtiene la disponibilidad de fechas de pago para una función
   */
  async getPaymentDateAvailability(funcion: number): Promise<Array<{fecha: string, disponibles: number, limite: number, llena: boolean}>> {
    try {
      const { getPaymentLimitsForFunction } = await import('../config/paymentLimits');
      const limits = getPaymentLimitsForFunction(funcion);
      
      if (!limits) {
        console.error(`No se encontraron límites para función ${funcion}`);
        return [];
      }

      const disponibilidad = [];

      // Contar familias para fecha 1
      const familiasFecha1 = await this.contarFamiliasPorFechaPago(funcion, limits.fecha1);
      const disponiblesFecha1 = Math.max(0, limits.limiteFecha1 - familiasFecha1);
      const llenaFecha1 = familiasFecha1 >= limits.limiteFecha1;

      disponibilidad.push({
        fecha: limits.fecha1,
        disponibles: disponiblesFecha1,
        limite: limits.limiteFecha1,
        llena: llenaFecha1
      });

      // Contar familias para fecha 2
      const familiasFecha2 = await this.contarFamiliasPorFechaPago(funcion, limits.fecha2);
      const disponiblesFecha2 = Math.max(0, limits.limiteFecha2 - familiasFecha2);
      const llenaFecha2 = familiasFecha2 >= limits.limiteFecha2;

      disponibilidad.push({
        fecha: limits.fecha2,
        disponibles: disponiblesFecha2,
        limite: limits.limiteFecha2,
        llena: llenaFecha2
      });

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

      // Fechas de cierre (iniciando el segundo día de venta)
      const fechaCierreFuncion1 = new Date("2025-12-02");
      const fechaCierreFuncion2 = new Date("2025-12-05");
      const fechaCierreFuncion3 = new Date("2025-12-09");

      // Establecer al inicio del día (00:00:00) para que cierre iniciando ese día
      fechaCierreFuncion1.setHours(0, 0, 0, 0);
      fechaCierreFuncion2.setHours(0, 0, 0, 0);
      fechaCierreFuncion3.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let fechaCierre: Date;
      let nombreFuncion: string;

      if (funcion === 1) {
        fechaCierre = fechaCierreFuncion1;
        nombreFuncion = '1ra Función';
      } else if (funcion === 2) {
        fechaCierre = fechaCierreFuncion2;
        nombreFuncion = '2da Función';
      } else {
        fechaCierre = fechaCierreFuncion3;
        nombreFuncion = '3ra Función';
      }

      if (today >= fechaCierre) {
        return {
          cerrado: true,
          mensaje: `Las reservas de boletos para la ${nombreFuncion} ya han concluido. El período de venta terminó el ${fechaCierre.toLocaleDateString('es-MX')}. Aún puedes eliminar asientos si lo necesitas.`
        };
      }

      return { cerrado: false };

    } catch (error) {
      console.error('Error al validar cierre del portal:', error);
      return { cerrado: false }; // Por defecto permitir si hay error
    }
  }
}
