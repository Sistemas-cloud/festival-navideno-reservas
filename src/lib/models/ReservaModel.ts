import { getSupabaseClient, Reserva } from '../supabase';

export class ReservaModel {
  
  async getAsientosDisponibles(alumnoRef: number): Promise<{ asientos: number }> {
    try {
      const supabase = getSupabaseClient();
      
      // Obtener nivel y grado del alumno
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumno')
        .select('alumno_nivel, alumno_grado, alumno_id')
        .eq('alumno_ref', alumnoRef)
        .single();

      if (alumnoError || !alumno) {
        console.error('Error al obtener alumno:', alumnoError);
        return { asientos: 0 };
      }

      let nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;

      // Reglas especiales de nivel
      if (grado === 5 || grado === 6) {
        nivel = 4;
      }

      // Determinar cantidad de boletos permitidos por familia
      let boletosPorFamilia = 0;
      
      switch (nivel) {
        case 1:
          boletosPorFamilia = 8;
          break;
        case 2:
          boletosPorFamilia = 8;
          break;
        case 3:
          boletosPorFamilia = 4;
          break;
        case 4:
          boletosPorFamilia = 3;
          break;
      }

      // Casos especiales para alumnos de prueba
      if (alumnoRef === 22222 || alumnoRef === 33333 || alumnoRef === 44444) {
        boletosPorFamilia = 1154;
      }

      // Obtener todos los hermanos de la familia
      const hermanosIds = await this.getHermanosIds(alumno.alumno_id);
      
      // Contar todas las reservas de la familia
      const { count: reservasFamilia, error: countError } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .in('referencia', hermanosIds)
        .eq('estado', 'reservado');

      if (countError) {
        console.error('Error al contar reservas de familia:', countError);
        return { asientos: 0 };
      }

      const disponibles = boletosPorFamilia - (reservasFamilia || 0);
      
      console.log(`🎫 Validación por familia para alumno ${alumnoRef}:`);
      console.log(`   👨‍👩‍👧‍👦 Hermanos en familia: ${hermanosIds.length}`);
      console.log(`   🎫 Boletos permitidos por familia: ${boletosPorFamilia}`);
      console.log(`   📋 Reservas existentes de familia: ${reservasFamilia || 0}`);
      console.log(`   ✅ Boletos disponibles: ${Math.max(0, disponibles)}`);
      
      return { asientos: Math.max(0, disponibles) };

    } catch (error) {
      console.error('Error al obtener asientos disponibles:', error);
      return { asientos: 0 };
    }
  }

  async getReservas(alumnoRef: number): Promise<Reserva[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Obtener nivel del alumno
      const nivel = await this.getNivelAlumno(alumnoRef);
      
      const { data: reservas, error } = await supabase
        .from('reservas')
        .select('fila, asiento')
        .eq('estado', 'reservado')
        .eq('nivel', nivel);

      if (error) {
        console.error('Error al obtener reservas:', error);
        return [];
      }

      return reservas as Reserva[];

    } catch (error) {
      console.error('Error al obtener reservas:', error);
      return [];
    }
  }

  async getPagos(alumnoRef: number): Promise<Reserva[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Obtener nivel del alumno
      const nivel = await this.getNivelAlumno(alumnoRef);
      
      const { data: pagos, error } = await supabase
        .from('reservas')
        .select('fila, asiento')
        .eq('estado', 'pagado')
        .eq('nivel', nivel);

      if (error) {
        console.error('Error al obtener pagos:', error);
        return [];
      }

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
      
      const nivel = await this.getNivelAlumno(alumnoRef);
      
      // Validar que la familia no exceda el límite de boletos
      const asientosDisponibles = await this.getAsientosDisponibles(alumnoRef);
      if (asientosDisponibles.asientos < asientos.length) {
        return { 
          success: false, 
          message: `Solo puedes reservar ${asientosDisponibles.asientos} boletos más. Tu familia ya tiene reservas que limitan la cantidad disponible.` 
        };
      }

      // Validación previa: verificar que todos los asientos estén disponibles
      const asientosParaVerificar = asientos.map(a => `${a.fila}${a.asiento}`);
      const { data: asientosOcupados, error: verificarError } = await supabase
        .from('reservas')
        .select('fila, asiento, estado, nivel, referencia')
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
          console.log(`❌ Asiento ${asiento.fila}${asiento.asiento} ya está ${estadoTexto} en función ${asientoOcupado.nivel} por alumno ${asientoOcupado.referencia}`);
          return { 
            success: false, 
            message: `El asiento ${asiento.fila}${asiento.asiento} ya está ${estadoTexto} en la función ${asientoOcupado.nivel}.` 
          };
        }
      }

      console.log(`✅ Validación de duplicidad exitosa para ${asientos.length} asientos del alumno ${alumnoRef}`);
      
      // Usar la fecha de pago proporcionada o calcular una por defecto
      const fechaFormateada = fechaPago || this.calcularFechaPagoDefecto();

      // Crear las reservas (ya validadas previamente)
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
            console.error('Error al actualizar reserva:', updateError);
            return { success: false, message: 'Error al actualizar la reserva.' };
          }
        } else {
          // Insertar nueva reserva
          const { error: insertError } = await supabase
            .from('reservas')
            .insert(reservaData);

          if (insertError) {
            console.error('Error al insertar reserva:', insertError);
            return { success: false, message: 'Error al crear la reserva.' };
          }
        }
      }

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
    alumnoRef: number
  ): Promise<{success: boolean, message?: string}> {
    try {
      const supabase = getSupabaseClient();
      
      const nivel = await this.getNivelAlumno(alumnoRef);
      
      console.log(`🗑️ Iniciando eliminación de ${asientos.length} reservas para alumno ${alumnoRef}`);
      
      // Verificar que los asientos pertenecen al alumno y están reservados (no pagados)
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
      }

      // Eliminar las reservas
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
          console.error('Error al eliminar reserva:', deleteError);
          return { success: false, message: 'Error al eliminar la reserva.' };
        }

        console.log(`✅ Asiento ${asiento.fila}${asiento.asiento} eliminado exitosamente`);
      }

      console.log(`🎉 ${asientos.length} reservas eliminadas exitosamente para alumno ${alumnoRef}`);
      return { success: true, message: `${asientos.length} reserva(s) eliminada(s) exitosamente.` };

    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      return { success: false, message: 'Error interno del servidor.' };
    }
  }

  private async getNivelAlumno(alumnoRef: number): Promise<number> {
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

      let nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;

      // Reglas especiales: 1° de primaria comparte función con Kinder, 6° comparte con Secundaria
      if (nivel === 1) {
        // Kinder va a 1ra Función (nivel 2 para el sistema de cierres)
        nivel = 2;
      } else if (nivel === 2) {
        // Primaria: 1° y resto a 1ra Función, 6° a 3ra Función
        if (grado === 1) {
          nivel = 2; // 1° comparte función con Kinder
        } else if (grado === 6) {
          nivel = 4; // 6° comparte función con Secundaria
        } else {
          nivel = 2; // Resto de primaria a 1ra Función
        }
      } else if (nivel === 3) {
        nivel = 3; // Secundaria a 2da Función
      } else if (nivel === 4) {
        nivel = 4; // Preparatoria a 3ra Función
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

  private calcularFechaPagoDefecto(): string {
    // Fecha por defecto (solo se usa si no se proporciona fecha de pago)
    // Usar fecha de venta más temprana para 2025
    return '2025-12-01';
  }
}
