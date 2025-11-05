import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { isInternalUser, findInternalUser } from '@/lib/config/internalUsers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alumnoRef = searchParams.get('alumno_ref');
    
    if (!alumnoRef) {
      return NextResponse.json({ error: 'alumno_ref is required' }, { status: 400 });
    }

    const alumnoRefNum = parseInt(alumnoRef);
    const supabase = getSupabaseClient();
    
    // Verificar si es usuario interno
    const esUsuarioInterno = isInternalUser(alumnoRefNum);
    let alumnoInfo: {
      nombre: string;
      control: string;
      funcion: string;
    };
    
    if (esUsuarioInterno) {
      // Usuario interno: obtener información de la configuración
      const internalUser = findInternalUser(alumnoRefNum);
      if (!internalUser) {
        return NextResponse.json({ error: 'Usuario interno no encontrado' }, { status: 404 });
      }
      
      const nombresFunciones: { [key: number]: string } = {
        1: '1ra Función',
        2: '2da Función',
        3: '3ra Función'
      };
      
      alumnoInfo = {
        nombre: internalUser.nombre,
        control: internalUser.control.toString(),
        funcion: nombresFunciones[internalUser.funcion] || 'Función desconocida'
      };
      
      console.log('🔐 API Reservas - Usuario interno detectado:', alumnoInfo);
    } else {
      // Usuario normal: obtener información de la base de datos
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumno')
        .select('alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado')
        .eq('alumno_ref', alumnoRefNum)
        .single();

      if (alumnoError || !alumno) {
        console.error('Error al obtener alumno:', alumnoError);
        return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
      }
      
      // Determinar función basada en nivel y grado
      let funcion = '';
      const nivel = alumno.alumno_nivel;
      const grado = alumno.alumno_grado;
      
      if (nivel === 1 || nivel === 2) {
        funcion = '1ra Función';
      } else if (nivel === 3) {
        if (grado === 1) {
          funcion = '1ra Función';
        } else if (grado >= 2 && grado <= 5) {
          funcion = '2da Función';
        } else if (grado === 6) {
          funcion = '3ra Función';
        } else {
          funcion = '1ra Función';
        }
      } else if (nivel === 4) {
        funcion = '3ra Función';
      } else {
        funcion = 'Nivel desconocido';
      }
      
      alumnoInfo = {
        nombre: `${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`,
        control: alumnoRef,
        funcion: funcion
      };
    }
    
    // Obtener las reservas del alumno (incluye reservadas y pagadas para ver todos los boletos)
    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('referencia', alumnoRefNum)
      .in('estado', ['reservado', 'pagado']) // Incluir tanto reservadas como pagadas
      .order('id', { ascending: false });
    
    console.log('🔍 API Reservas - Reservas obtenidas de BD:', reservas?.map(r => ({
      id: r.id,
      fila: r.fila,
      asiento: r.asiento,
      fecha_pago: r.fecha_pago,
      estado: r.estado,
      fecha_reserva: r.fecha_reserva
    })));

    if (reservasError) {
      console.error('Error al obtener reservas:', reservasError);
      return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 });
    }


    // Procesar reservas
    const reservasProcesadas = reservas.map(reserva => {
      // Determinar sección basada en el campo 'zoi' (Zona de Interés)
      let seccion = '';
      let precio = reserva.precio || 0;
      
      // Mapear las zonas basado en el campo 'zoi' y precio
      if (reserva.zoi) {
        switch (reserva.zoi) {
          case 'OF': // Oro Frente
            seccion = 'ZONA ORO';
            precio = precio || 180;
            break;
          case 'OP': // Oro Palcos
            seccion = 'ZONA ORO PALCOS';
            precio = precio || 180;
            break;
          case 'PF': // Plata Frente
            seccion = 'ZONA PLATA';
            precio = precio || 160;
            break;
          case 'PP': // Plata Palcos
            seccion = 'ZONA PLATA PALCOS';
            precio = precio || 160;
            break;
          case 'BF': // Bronce Frente
            seccion = 'BRONCE PALCOS';
            precio = precio || 120;
            break;
          case 'BB': // Bronce Balcón
            seccion = 'BRONCE BALCÓN';
            precio = precio || 120;
            break;
          default:
            // Si no reconocemos el código, determinar por precio
            if (precio >= 180) {
              seccion = 'ZONA ORO';
            } else if (precio >= 160) {
              seccion = 'ZONA PLATA';
            } else if (precio >= 120) {
              seccion = 'BRONCE PALCOS';
            } else {
              seccion = 'ZONA GENERAL';
            }
        }
      } else {
        // Si no hay zoi, determinar por precio
        if (precio >= 180) {
          seccion = 'ZONA ORO';
        } else if (precio >= 160) {
          seccion = 'ZONA PLATA';
        } else if (precio >= 120) {
          seccion = 'BRONCE PALCOS';
        } else {
          seccion = 'ZONA GENERAL';
        }
      }

      return {
        id: reserva.id,
        seccion: seccion,
        fila: reserva.fila,
        asiento: reserva.asiento,
        precio: precio,
        fechaReserva: reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX'),
        fechaPago: reserva.fecha_pago || null, // Mantener formato original (YYYY-MM-DD)
        pagado: reserva.estado === 'pagado' || reserva.estado === 'pago',
        estado: reserva.estado
      };
    });

    // Calcular total
    const total = reservasProcesadas.reduce((sum, reserva) => sum + reserva.precio, 0);

    // Obtener fecha de pago: todas las reservas de un alumno deben tener la misma fecha de pago
    // Usar directamente las reservas de BD (no las procesadas) para obtener fecha_pago
    let fechaPagoComun = null;
    if (reservas && reservas.length > 0) {
      // Buscar la primera reserva que tenga fecha_pago válida (no null, no undefined, no string vacío)
      const reservaConFecha = reservas.find(r => r.fecha_pago && r.fecha_pago.trim() !== '');
      
      if (reservaConFecha && reservaConFecha.fecha_pago) {
        fechaPagoComun = reservaConFecha.fecha_pago;
        console.log('🔍 API Reservas - Fecha de pago encontrada en BD:', fechaPagoComun, 'de la reserva ID:', reservaConFecha.id);
      } else {
        console.log('⚠️ API Reservas - No se encontró fecha de pago válida en ninguna reserva');
        // Listar todas las fechas_pago encontradas para debug
        const todasFechas = reservas.map(r => ({ id: r.id, fecha_pago: r.fecha_pago }));
        console.log('🔍 API Reservas - Todas las fechas_pago en BD:', todasFechas);
      }
      
      // Verificar que todas las reservas tengan la misma fecha de pago
      const fechasUnicas = reservas
        .filter(r => r.fecha_pago && r.fecha_pago.trim() !== '')
        .map(r => r.fecha_pago);
      const setFechasUnicas = new Set(fechasUnicas);
      
      if (setFechasUnicas.size > 1) {
        console.warn('⚠️ API Reservas - ADVERTENCIA: Hay múltiples fechas de pago diferentes:', Array.from(setFechasUnicas));
        console.warn('⚠️ API Reservas - Se usará la fecha de la primera reserva con fecha válida');
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        alumno: alumnoInfo,
        reservas: reservasProcesadas,
        total: total,
        fechaReserva: reservasProcesadas.length > 0 ? reservasProcesadas[0].fechaReserva : new Date().toLocaleDateString('es-MX'),
        fechaPago: fechaPagoComun
      }
    });

  } catch (error) {
    console.error('Error en API de reservas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
