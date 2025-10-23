import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Prueba simple iniciada...');
    
    // Verificar variables de entorno básicas
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Faltante',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Faltante',
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      VERCEL: process.env.VERCEL || 'undefined',
    };

    console.log('📊 Variables de entorno:', envCheck);

    // Probar fetch básico sin interceptores
    let fetchTest = 'No probado';
    try {
      const testResponse = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (testResponse.ok) {
        fetchTest = '✅ Fetch básico funciona';
      } else {
        fetchTest = `❌ Fetch básico falló: ${testResponse.status}`;
      }
    } catch (fetchError) {
      fetchTest = `❌ Error en fetch: ${fetchError instanceof Error ? fetchError.message : 'Error desconocido'}`;
    }

    return NextResponse.json({
      success: true,
      message: 'Prueba simple completada',
      data: {
        timestamp: new Date().toISOString(),
        environment: envCheck,
        fetchTest: fetchTest,
        nodeVersion: process.version,
        platform: process.platform
      }
    });

  } catch (error) {
    console.error('💥 Error en prueba simple:', error);
    return NextResponse.json({
      success: false,
      message: 'Error en prueba simple',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
