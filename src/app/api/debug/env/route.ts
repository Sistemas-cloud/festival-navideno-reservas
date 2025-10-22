import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar variables de entorno (sin exponer valores sensibles)
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Faltante',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Faltante',
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      VERCEL: process.env.VERCEL || 'undefined',
      VERCEL_ENV: process.env.VERCEL_ENV || 'undefined',
    };

    console.log('🔍 Verificación de variables de entorno:', envCheck);

    return NextResponse.json({
      success: true,
      message: 'Variables de entorno verificadas',
      data: envCheck
    });

  } catch (error) {
    console.error('💥 Error al verificar variables de entorno:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al verificar variables de entorno',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
