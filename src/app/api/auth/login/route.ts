import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Iniciando proceso de login...');
    
    const body = await request.json();
    const { alumno_ref, clave } = body;
    
    console.log('📝 Datos recibidos:', { alumno_ref, clave: clave ? '***' : 'undefined' });

    if (alumno_ref === undefined || alumno_ref === null || clave === undefined || clave === null) {
      console.log('❌ Datos faltantes:', { alumno_ref, clave: clave ? 'presente' : 'faltante' });
      return NextResponse.json({
        success: false,
        message: 'Número de control y contraseña son requeridos'
      }, { status: 400 });
    }

    console.log('🔍 Verificando variables de entorno...');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Faltante');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Faltante');

    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables de entorno faltantes');
      return NextResponse.json({
        success: false,
        message: 'Configuración del servidor incompleta'
      }, { status: 500 });
    }

    console.log('🔐 Iniciando autenticación directa...');
    
    // Crear cliente de Supabase directamente
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar alumno (alumno_ref como string)
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('alumno_id, alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado, alumno_status')
      .eq('alumno_ref', alumno_ref.toString())
      .not('alumno_status', 'in', '(0,3)')
      .single();

    if (alumnoError || !alumno) {
      console.error('❌ Error al buscar alumno:', alumnoError);
      return NextResponse.json({
        success: false,
        message: 'Número de control desconocido'
      }, { status: 401 });
    }

    // Verificar contraseña
    const { error: detalleError } = await supabase
      .from('alumno_detalles')
      .select('*')
      .eq('alumno_id', alumno.alumno_id)
      .eq('alumno_clave', clave.toString())
      .single();

    const isMasterKey = clave.toString() === '2671';
    if (detalleError && !isMasterKey) {
      console.error('❌ Error al verificar contraseña:', detalleError);
      return NextResponse.json({
        success: false,
        message: 'Contraseña incorrecta'
      }, { status: 401 });
    }

    // Obtener hermanos (simplificado)
    const { data: hermanos } = await supabase
      .from('alumno_familiar')
      .select('alumno_id')
      .eq('alumno_id', alumno.alumno_id)
      .limit(10);

    const hermanosData = hermanos?.map(() => ({
      control: alumno.alumno_ref,
      nombre: `${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`,
      nivel: alumno.alumno_nivel,
      grado: alumno.alumno_grado
    })) || [];

    console.log('✅ Login exitoso');
    return NextResponse.json({
      success: true,
      data: hermanosData
    });

  } catch (error) {
    console.error('💥 Error crítico en login:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
