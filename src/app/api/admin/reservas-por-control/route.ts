import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const control = parseInt(String(body?.control), 10);
    if (!control || Number.isNaN(control)) {
      return NextResponse.json({ success: false, message: 'Control inválido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('fila, asiento, estado, referencia, zona, nivel, precio')
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


