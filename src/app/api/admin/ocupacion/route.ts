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
    const funcion = parseInt(String(body?.funcion), 10);
    if (![1,2,3].includes(funcion)) {
      return NextResponse.json({ success: false, message: 'Función inválida' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('fila, asiento, estado, referencia, zona')
      .eq('nivel', funcion)
      .in('estado', ['reservado', 'pagado']);

    if (error) {
      return NextResponse.json({ success: false, message: 'Error obteniendo ocupación', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: 'Error inesperado', detail: e?.message }, { status: 500 });
  }
}


