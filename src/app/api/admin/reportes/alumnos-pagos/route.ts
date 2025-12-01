import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, canAccessFunction } from '@/lib/config/adminUsers';
import { createClient } from '@supabase/supabase-js';

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
  
  console.log('🔍 Validando autorización - Usuario recibido:', user ? 'Sí' : 'No');
  console.log('🔍 Validando autorización - Password recibido:', pass ? 'Sí' : 'No');
  
  if (!user || !pass) {
    console.log('❌ Faltan credenciales en headers');
    return { authorized: false };
  }
  
  const adminUser = validateAdminCredentials(user, pass);
  if (!adminUser) {
    console.log('❌ Credenciales inválidas para usuario:', user);
    return { authorized: false };
  }
  
  console.log('✅ Usuario autorizado:', adminUser.username);
  return { authorized: true, user: adminUser };
}

export async function GET(req: NextRequest) {
  try {
    console.log('📄 Iniciando generación de reporte PDF...');
    
    // Validar autorización
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      console.error('❌ No autorizado - auth:', auth);
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const adminUser = auth.user;

    // Obtener parámetro de función de la query string
    const { searchParams } = new URL(req.url);
    const funcionParam = searchParams.get('funcion');
    let funcion: number | null = null;

    if (funcionParam) {
      funcion = parseInt(funcionParam, 10);
      if (Number.isNaN(funcion) || ![1, 2, 3].includes(funcion)) {
        return NextResponse.json({ 
          success: false, 
          message: `Función inválida: ${funcionParam}. Debe ser 1, 2 o 3.` 
        }, { status: 400 });
      }

      // Validar que el usuario tenga acceso a esta función
      if (!canAccessFunction(adminUser, funcion)) {
        return NextResponse.json({ 
          success: false, 
          message: 'No tienes acceso a esta función' 
        }, { status: 403 });
      }
    }

    console.log('✅ Autorización válida, obteniendo datos...', funcion ? `Función: ${funcion}` : 'Todas las funciones');
    const supabase = getSupabaseClient();

    // Construir query de reservas
    let query = supabase
      .from('reservas')
      .select('referencia, fecha_pago, estado, nivel')
      .in('estado', ['reservado', 'pagado']);

    // Filtrar por función si se proporciona
    if (funcion !== null) {
      query = query.eq('nivel', funcion);
    }

    const { data: reservas, error: reservasError } = await query.order('referencia', { ascending: true });

    if (reservasError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error obteniendo reservas', 
        detail: reservasError.message 
      }, { status: 500 });
    }

    if (!reservas || reservas.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No hay reservas para generar el reporte' 
      }, { status: 404 });
    }

    // Agrupar por referencia (control del alumno) y obtener fechas de pago únicas
    const alumnosMap = new Map<number, { control: number; nombre: string; fechaPago: string | null }>();

    // Obtener todos los controles únicos
    const controlesUnicos = [...new Set(reservas.map(r => r.referencia))];

    // Obtener información de cada alumno
    for (const control of controlesUnicos) {
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumno')
        .select('alumno_app, alumno_apm, alumno_nombre')
        .eq('alumno_ref', control)
        .single();

      if (alumnoError || !alumno) {
        // Si no se encuentra el alumno, usar solo el control
        const reservasAlumno = reservas.filter(r => r.referencia === control);
        const fechaPago = reservasAlumno.find(r => r.fecha_pago)?.fecha_pago || null;
        alumnosMap.set(control, {
          control,
          nombre: `Control ${control}`,
          fechaPago
        });
      } else {
        const nombreCompleto = `${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`.trim();
        const reservasAlumno = reservas.filter(r => r.referencia === control);
        const fechaPago = reservasAlumno.find(r => r.fecha_pago)?.fecha_pago || null;
        
        alumnosMap.set(control, {
          control,
          nombre: nombreCompleto || `Control ${control}`,
          fechaPago
        });
      }
    }

    // Convertir map a array
    const alumnosData = Array.from(alumnosMap.values());

    // Agrupar por fecha de pago y ordenar por nombre dentro de cada grupo
    const alumnosPorFecha = new Map<string | null, typeof alumnosData>();
    
    for (const alumno of alumnosData) {
      const fechaKey = alumno.fechaPago || 'sin-fecha';
      if (!alumnosPorFecha.has(fechaKey)) {
        alumnosPorFecha.set(fechaKey, []);
      }
      alumnosPorFecha.get(fechaKey)!.push(alumno);
    }

    // Ordenar por nombre dentro de cada grupo de fecha
    for (const [fecha, alumnos] of alumnosPorFecha.entries()) {
      alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    }

    // Convertir a estructura agrupada: ordenar fechas (null al final)
    const fechasOrdenadas = Array.from(alumnosPorFecha.keys()).sort((a, b) => {
      if (a === 'sin-fecha' || a === null) return 1;
      if (b === 'sin-fecha' || b === null) return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const alumnosAgrupados = fechasOrdenadas.map(fechaKey => ({
      fechaPago: fechaKey === 'sin-fecha' ? null : fechaKey,
      alumnos: alumnosPorFecha.get(fechaKey)!
    }));

    const totalAlumnos = alumnosData.length;

    console.log(`✅ Datos obtenidos: ${totalAlumnos} alumnos agrupados en ${alumnosAgrupados.length} fechas`);

    // Retornar datos JSON agrupados por fecha de pago
    return NextResponse.json({
      success: true,
      data: {
        alumnosAgrupados: alumnosAgrupados,
        totalAlumnos: totalAlumnos,
        funcion: funcion,
        fechaGeneracion: new Date().toISOString()
      }
    });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    const errorStack = e instanceof Error ? e.stack : undefined;
    console.error('❌ Error generando reporte:', errorMessage);
    console.error('❌ Stack trace:', errorStack);
    return NextResponse.json({ 
      success: false, 
      message: 'Error generando reporte', 
      detail: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}

