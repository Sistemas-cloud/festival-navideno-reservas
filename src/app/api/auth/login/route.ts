import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/lib/models/AuthModel';

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

    const authModel = new AuthModel();
    console.log('🔐 Iniciando autenticación...');
    
    const result = await authModel.authenticate(
      parseInt(alumno_ref),
      clave
    );

    console.log('📊 Resultado de autenticación:', { success: result.success, message: result.message });

    if (result.success) {
      console.log('✅ Login exitoso');
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      console.log('❌ Login fallido:', result.message);
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 401 });
    }

  } catch (error) {
    console.error('💥 Error crítico en login:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
