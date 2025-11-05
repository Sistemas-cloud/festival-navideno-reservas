import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function isAuthorized(req: NextRequest): boolean {
  const user = req.headers.get('x-admin-user');
  const pass = req.headers.get('x-admin-pass');
  return user === 'admin' && pass === 'Admin2025.';
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const controlRaw = body?.control;
    if (!controlRaw) {
      return NextResponse.json({ success: false, message: 'Falta control' }, { status: 400 });
    }
    const control = parseInt(String(controlRaw), 10);
    if (Number.isNaN(control)) {
      return NextResponse.json({ success: false, message: 'Control inválido' }, { status: 400 });
    }

    // Traer reservas del alumno (pendientes de pago)
    const { data: reservasAlumno, error: errRes } = await supabase
      .from('reservas')
      .select('id, referencia, fila, asiento, nivel, estado')
      .eq('referencia', control)
      .eq('estado', 'reservado');

    if (errRes) {
      return NextResponse.json({ success: false, message: 'Error cargando reservas', detail: errRes.message }, { status: 500 });
    }

    if (!reservasAlumno || reservasAlumno.length === 0) {
      return NextResponse.json({ success: false, message: 'No hay reservas pendientes para este control' }, { status: 400 });
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

    // Si no hay conflictos, marcar todas como pagadas
    const { error: upErr } = await supabase
      .from('reservas')
      .update({ estado: 'pagado' })
      .in('id', reservasAlumno.map(r => r.id));

    if (upErr) {
      return NextResponse.json({ success: false, message: 'Error marcando pagado', detail: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { control, pagadas: reservasAlumno.length } });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ success: false, message: 'Error inesperado', detail: errorMessage }, { status: 500 });
  }
}


