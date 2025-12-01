import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminCredentials, canAccessFunction, type AdminUser } from '@/lib/config/adminUsers';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de entorno de Supabase no configuradas');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function isAuthorized(req: NextRequest): { authorized: boolean; user?: AdminUser } {
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
    // Validar autorización
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }
    const adminUser = auth.user;

    // Obtener cliente de Supabase (valida variables de entorno)
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (envError) {
      console.error('❌ Error configurando Supabase:', envError);
      return NextResponse.json({ 
        success: false, 
        message: 'Configuración del servidor incompleta',
        detail: envError instanceof Error ? envError.message : 'Variables de entorno faltantes'
      }, { status: 500 });
    }

    // Parsear body con manejo de errores
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Error parseando body:', parseError);
      return NextResponse.json({ 
        success: false, 
        message: 'Error al procesar la solicitud',
        detail: parseError instanceof Error ? parseError.message : 'Error desconocido al parsear JSON'
      }, { status: 400 });
    }

    // Validar función
    const funcionRaw = body?.funcion;
    if (funcionRaw === undefined || funcionRaw === null) {
      return NextResponse.json({ 
        success: false, 
        message: 'Falta el parámetro "funcion"' 
      }, { status: 400 });
    }

    const funcion = parseInt(String(funcionRaw), 10);
    if (Number.isNaN(funcion) || ![1, 2, 3].includes(funcion)) {
      return NextResponse.json({ 
        success: false, 
        message: `Función inválida: ${funcionRaw}. Debe ser 1, 2 o 3.` 
      }, { status: 400 });
    }

    // Verificar que el usuario tenga acceso a esta función
    if (!canAccessFunction(adminUser, funcion)) {
      return NextResponse.json({ 
        success: false, 
        message: 'No tienes permiso para acceder a esta función' 
      }, { status: 403 });
    }

    // Consultar Supabase
    const { data, error } = await supabase
      .from('reservas')
      .select('fila, asiento, estado, referencia, zona')
      .eq('nivel', funcion)
      .in('estado', ['reservado', 'pagado']);

    if (error) {
      console.error('❌ Error en consulta Supabase:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error obteniendo ocupación', 
        detail: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    // Retornar datos (puede ser array vacío si no hay reservas)
    return NextResponse.json({ 
      success: true, 
      data: data || [] 
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    const errorStack = e instanceof Error ? e.stack : undefined;
    console.error('❌ Error inesperado en ocupacion:', errorMessage, errorStack);
    return NextResponse.json({ 
      success: false, 
      message: 'Error inesperado', 
      detail: errorMessage 
    }, { status: 500 });
  }
}


