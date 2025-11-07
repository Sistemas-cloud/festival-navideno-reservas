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

    // Usar AuthModel para autenticación (maneja usuarios internos y normales)
    const { AuthModel } = await import('@/lib/models/AuthModel');
    const authModel = new AuthModel();
    const authResult = await authModel.authenticate(parseInt(alumno_ref), clave);
    
    console.log('🔍 API Login - authResult.success:', authResult.success);
    console.log('🔍 API Login - authResult.isAccessDeniedByDate:', authResult.isAccessDeniedByDate);
    console.log('🔍 API Login - authResult.message:', authResult.message);
    console.log('🔍 API Login - authResult.data:', authResult.data);
    console.log('🔍 API Login - authResult.data es array?', Array.isArray(authResult.data));
    console.log('🔍 API Login - authResult.data length:', Array.isArray(authResult.data) ? authResult.data.length : 'N/A');
    
    if (!authResult.success) {
      console.log('❌ API Login - Autenticación fallida, retornando error');
      return NextResponse.json({
        success: false,
        message: authResult.message || 'Error en autenticación',
        isAccessDeniedByDate: authResult.isAccessDeniedByDate || false,
        fechaApertura: authResult.fechaApertura,
        nombreFuncion: authResult.nombreFuncion
      }, { status: 401 });
    }
    
    const hermanosData = authResult.data || [];
    
    console.log('✅ API Login - Login exitoso');
    console.log('📊 API Login - hermanosData:', hermanosData);
    console.log('📊 API Login - hermanosData.length:', hermanosData.length);
    console.log('📊 API Login - isInternal:', authResult.isInternal);
    console.log('📊 API Login - funcionAsignada:', authResult.funcionAsignada);
    
    // Incluir información de usuario interno en la respuesta
    return NextResponse.json({
      success: true,
      data: hermanosData,
      isInternal: authResult.isInternal || false,
      funcionAsignada: authResult.funcionAsignada || undefined
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
