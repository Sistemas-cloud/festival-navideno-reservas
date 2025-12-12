import { NextRequest, NextResponse } from 'next/server';
import { ReservaModel } from '@/lib/models/ReservaModel';
import { isInternalUser } from '@/lib/config/internalUsers';
import { hasEarlyAccess, getOpeningDateForFunction } from '@/lib/config/earlyAccess';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Valida si un usuario tiene acceso para crear reservas
 * Solo permite reservar si:
 * - Es usuario interno, O
 * - Tiene acceso anticipado, O
 * - La fecha de apertura ya pasó
 */
async function validateReservationAccess(alumnoRef: number): Promise<{ 
  hasAccess: boolean; 
  message?: string;
  fechaApertura?: string;
  nombreFuncion?: string;
}> {
  // Usuarios internos siempre tienen acceso
  if (isInternalUser(alumnoRef)) {
    console.log(`✅ Validación de acceso para reservar: Usuario interno ${alumnoRef} - acceso permitido`);
    return { hasAccess: true };
  }

  // Obtener datos del alumno para calcular la función
  const supabase = getSupabaseClient();
  const { data: alumno, error: alumnoError } = await supabase
    .from('alumno')
    .select('alumno_nivel, alumno_grado')
    .eq('alumno_ref', alumnoRef)
    .single();

  if (alumnoError || !alumno) {
    console.error('❌ Error al obtener datos del alumno para validación:', alumnoError);
    return { 
      hasAccess: false, 
      message: 'Error al validar acceso. Por favor, intenta nuevamente.' 
    };
  }

  const { alumno_nivel: nivel, alumno_grado: grado } = alumno;

  // Calcular función numérica para validación de acceso anticipado
  let funcionNum = 3; // Por defecto
  if (nivel === 1 || nivel === 2 || (nivel === 3 && grado === 1)) {
    funcionNum = 1;
  } else if (nivel === 3 && grado >= 2 && grado <= 5) {
    funcionNum = 2;
  } else if (nivel === 3 && grado === 6 || nivel === 4) {
    funcionNum = 3;
  }

  // Fechas de cierre por función (el portal cierra a las 13:00 del día indicado)
  const fechaCierreFuncion1 = "2025-12-02";
  const fechaCierreFuncion2 = "2025-12-05";
  const fechaCierreFuncion3 = "2025-12-09";
  
  // Determinar fecha de cierre según la función
  let fechaCierreStr: string;
  const nombresFunciones: { [key: number]: string } = {
    1: '1ra Función',
    2: '2da Función',
    3: '3ra Función'
  };
  const nombreFuncion = nombresFunciones[funcionNum] || 'Función';
  
  if (funcionNum === 1) {
    fechaCierreStr = fechaCierreFuncion1;
  } else if (funcionNum === 2) {
    fechaCierreStr = fechaCierreFuncion2;
  } else {
    fechaCierreStr = fechaCierreFuncion3;
  }
  
  // Verificar si ya pasó la fecha de cierre
  const { isAfterClosingTime, parseDateString } = await import('@/lib/utils/timezone');
  const yaCerro = isAfterClosingTime(fechaCierreStr);
  
  if (yaCerro) {
    // Portal cerrado permanentemente - no hay reapertura
    const fechaCierre = parseDateString(fechaCierreStr);
    const fechaCierreFormateada = fechaCierre.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Monterrey'
    });
    
    console.log(`🚫 Validación de acceso para reservar: Usuario ${alumnoRef} NO tiene acceso - el portal cerró permanentemente el ${fechaCierreFormateada} a la 1:00 PM para la ${nombreFuncion}`);
    return {
      hasAccess: false,
      message: `El sistema de reservas para la ${nombreFuncion} cerró permanentemente el ${fechaCierreFormateada} a la 1:00 PM (hora de Monterrey).`,
      fechaApertura: fechaCierreStr,
      nombreFuncion: nombreFuncion
    };
  }
  
  // Si aún no ha cerrado, verificar acceso anticipado o fecha de apertura
  const tieneAccesoAnticipado = hasEarlyAccess(alumnoRef);
  
  // IMPORTANTE: La función 1 NO tiene restricción de fecha - siempre está abierta hasta su fecha de cierre
  if (funcionNum === 1) {
    console.log(`✅ Validación de acceso para reservar: Función 1 abierta (hasta fecha de cierre)`);
    return { hasAccess: true };
  }
  
  // Para funciones 2 y 3, verificar acceso anticipado o fecha/hora de apertura (8 PM)
  const { getOpeningDateForFunction } = await import('@/lib/config/earlyAccess');
  const { isAfterOpeningTime } = await import('@/lib/utils/timezone');
  const fechaAperturaStr = getOpeningDateForFunction(funcionNum);
  const yaAbrio = isAfterOpeningTime(fechaAperturaStr, 20); // 20 = 8 PM
  
  if (!tieneAccesoAnticipado && !yaAbrio) {
    const [year, month, day] = fechaAperturaStr.split('-').map(Number);
    const fechaAperturaFormateada = new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Monterrey'
    });

    console.log(`🚫 Validación de acceso para reservar: Usuario ${alumnoRef} NO tiene acceso - fecha/hora de apertura: ${fechaAperturaStr} a las 8 PM`);
    return {
      hasAccess: false,
      message: `El sistema de reservas estará disponible a partir del ${fechaAperturaFormateada} a las 8:00 PM (hora de Monterrey) para la ${nombreFuncion}. Por favor, intenta nuevamente en esa fecha y hora.`,
      fechaApertura: fechaAperturaStr,
      nombreFuncion: nombreFuncion
    };
  }

  console.log(`✅ Validación de acceso para reservar: Usuario ${alumnoRef} tiene acceso permitido`);
  return { hasAccess: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asientos, alumno_ref, hermanos_data, precio, zona, fecha_pago } = body;

    if (!asientos || !alumno_ref || !precio || !zona) {
      return NextResponse.json({
        success: false,
        message: 'Datos de reserva incompletos'
      }, { status: 400 });
    }

    const alumnoRefNum = parseInt(alumno_ref);

    // VALIDAR ACCESO ANTICIPADO: Solo permitir reservar si tiene acceso
    const validacionAcceso = await validateReservationAccess(alumnoRefNum);
    if (!validacionAcceso.hasAccess) {
      return NextResponse.json({
        success: false,
        message: validacionAcceso.message || 'No tienes acceso para realizar reservas en este momento.',
        isAccessDeniedByDate: true,
        fechaApertura: validacionAcceso.fechaApertura,
        nombreFuncion: validacionAcceso.nombreFuncion
      }, { status: 403 });
    }

    const reservaModel = new ReservaModel();
    
    // Validar si el portal está cerrado para este alumno
    const validacionCierre = await reservaModel.isPortalCerrado(alumnoRefNum);
    if (validacionCierre.cerrado) {
      return NextResponse.json({
        success: false,
        message: validacionCierre.mensaje || 'El período de reservas ha concluido. Aún puedes cambiar asientos si lo necesitas.'
      }, { status: 403 });
    }

    console.log('🔍 API crear-reserva - Fecha de pago recibida:', fecha_pago);

    const result = await reservaModel.crearReserva(
      asientos,
      parseInt(alumno_ref),
      hermanos_data || [],
      parseFloat(precio),
      zona,
      fecha_pago || null // Pasar la fecha de pago seleccionada
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        fila: asientos[0]?.fila,
        asiento: asientos[0]?.asiento,
        estado: 'reservado',
        alumno_ref: parseInt(alumno_ref)
      });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error) {
    console.error('Error al crear reserva:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
