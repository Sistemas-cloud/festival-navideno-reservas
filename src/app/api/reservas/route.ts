import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alumnoRef = searchParams.get('alumno_ref');
    
    if (!alumnoRef) {
      return NextResponse.json({ error: 'alumno_ref is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // Obtener las reservas del alumno
    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .eq('referencia', parseInt(alumnoRef))
      .order('id', { ascending: false });

    if (reservasError) {
      console.error('Error al obtener reservas:', reservasError);
      return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 });
    }

    // Obtener información del alumno
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado')
      .eq('alumno_ref', parseInt(alumnoRef))
      .single();

    if (alumnoError || !alumno) {
      console.error('Error al obtener alumno:', alumnoError);
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    // Determinar función basada en nivel y grado
    // 1° de primaria comparte función con Kinder, 6° comparte con Secundaria
    let funcion = '';
    const nivel = alumno.alumno_nivel;
    const grado = alumno.alumno_grado;
    
    if (nivel === 1) {
      // Kinder va a 1ra Función
      funcion = '1ra Función';
    } else if (nivel === 2) {
      // Primaria
      if (grado === 1) {
        funcion = '1ra Función'; // 1° comparte con Kinder
      } else if (grado === 6) {
        funcion = '3ra Función'; // 6° comparte con Secundaria
      } else {
        funcion = '1ra Función';
      }
    } else if (nivel === 3) {
      funcion = '2da Función';
    } else if (nivel === 4) {
      funcion = '3ra Función';
    } else {
      funcion = 'Nivel desconocido';
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
        fechaReserva: reserva.fecha_pago ? new Date(reserva.fecha_pago).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX'),
        pagado: reserva.estado === 'pagado' || reserva.estado === 'pago',
        estado: reserva.estado
      };
    });

    // Calcular total
    const total = reservasProcesadas.reduce((sum, reserva) => sum + reserva.precio, 0);

    return NextResponse.json({
      success: true,
      data: {
        alumno: {
          nombre: `${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`,
          control: alumnoRef,
          funcion: funcion
        },
        reservas: reservasProcesadas,
        total: total,
        fechaReserva: reservasProcesadas.length > 0 ? reservasProcesadas[0].fechaReserva : new Date().toLocaleDateString('es-MX')
      }
    });

  } catch (error) {
    console.error('Error en API de reservas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
