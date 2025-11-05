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
    const control = parseInt(String(body?.control), 10);
    if (!control || Number.isNaN(control)) {
      return NextResponse.json({ success: false, message: 'Control inválido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('fila, asiento, estado, referencia, zona, nivel')
      .eq('referencia', control)
      .in('estado', ['reservado', 'pagado']);

    if (error) {
      return NextResponse.json({ success: false, message: 'Error obteniendo reservas', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ success: false, message: 'Error inesperado', detail: errorMessage }, { status: 500 });
  }
}


