import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayInMonterrey, parseDateString } from '@/lib/utils/timezone';
import { validateAdminCredentials } from '@/lib/config/adminUsers';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de entorno de Supabase no configuradas');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function isAuthorized(req: NextRequest): { authorized: boolean; user?: any } {
  const user = req.headers.get('x-admin-user');
  const pass = req.headers.get('x-admin-pass');
  if (!user || !pass) {
    return { authorized: false };
  }
  const adminUser = validateAdminCredentials(user, pass);
  if (!adminUser) {
    return { authorized: false };
  }
  return { authorized: true, user: adminUser };
}

export async function POST(req: NextRequest) {
  try {
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }
    const supabase = getSupabaseClient();

    const body = await req.json();
    const controlRaw = body?.control;
    if (!controlRaw) {
      return NextResponse.json({ success: false, message: 'Falta control' }, { status: 400 });
    }
    const control = parseInt(String(controlRaw), 10);
    if (Number.isNaN(control)) {
      return NextResponse.json({ success: false, message: 'Control inválido' }, { status: 400 });
    }

    // Traer reservas del alumno (pendientes de pago) incluyendo fecha_pago y precio
    const { data: reservasAlumno, error: errRes } = await supabase
      .from('reservas')
      .select('id, referencia, fila, asiento, nivel, estado, fecha_pago, precio')
      .eq('referencia', control)
      .eq('estado', 'reservado');

    if (errRes) {
      return NextResponse.json({ success: false, message: 'Error cargando reservas', detail: errRes.message }, { status: 500 });
    }

    if (!reservasAlumno || reservasAlumno.length === 0) {
      return NextResponse.json({ success: false, message: 'No hay reservas pendientes para este control' }, { status: 400 });
    }

    // VALIDACIÓN: Verificar que la fecha de pago coincida con el día actual
    const today = getTodayInMonterrey();
    const fechaPagoReserva = reservasAlumno[0].fecha_pago;
    
    if (!fechaPagoReserva) {
      return NextResponse.json({ 
        success: false, 
        message: 'Las reservas no tienen fecha de pago asignada. No se puede procesar el pago.' 
      }, { status: 400 });
    }

    // Comparar fechas (solo día, sin hora)
    const fechaPago = parseDateString(fechaPagoReserva);
    const fechaPagoTime = fechaPago.getTime();
    const todayTime = today.getTime();

    if (fechaPagoTime !== todayTime) {
      // Formatear fecha para mostrar al usuario
      const fechaFormateada = fechaPago.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return NextResponse.json({ 
        success: false, 
        message: `La fecha de pago asignada es el ${fechaFormateada}. Solo se puede procesar el pago en esa fecha.` 
      }, { status: 400 });
    }

    // Revisar conflictos: misma (fila, asiento, nivel) ocupada por otro alumno (reservado o pagado)
    for (const r of reservasAlumno) {
      const { data: conflictos, error: errConf } = await supabase
        .from('reservas')
        .select('id, referencia, estado')
        .eq('fila', r.fila)
        .eq('asiento', r.asiento)
        .eq('nivel', r.nivel)
        .neq('referencia', control)
        .in('estado', ['reservado', 'pagado']);

      if (errConf) {
        return NextResponse.json({ success: false, message: 'Error validando conflictos', detail: errConf.message }, { status: 500 });
      }

      if (conflictos && conflictos.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Conflicto de asientos. Dirígete con el administrador.',
          conflicto: { fila: r.fila, asiento: r.asiento, nivel: r.nivel },
        }, { status: 409 });
      }
    }

    // Calcular total a pagar
    const totalAPagar = reservasAlumno.reduce((sum, r) => sum + (Number(r.precio) || 0), 0);

    // Si no hay conflictos, marcar todas como pagadas
    const { error: upErr } = await supabase
      .from('reservas')
      .update({ estado: 'pagado' })
      .in('id', reservasAlumno.map(r => r.id));

    if (upErr) {
      return NextResponse.json({ success: false, message: 'Error marcando pagado', detail: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        control, 
        pagadas: reservasAlumno.length,
        total_a_pagar: totalAPagar
      } 
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ success: false, message: 'Error inesperado', detail: errorMessage }, { status: 500 });
  }
}


