import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Probando conexión con Supabase...');
    
    const supabase = getSupabaseClient();
    console.log('✅ Cliente de Supabase creado');

    // Probar una consulta simple
    const { error } = await supabase
      .from('alumno')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Error en consulta de prueba:', error);
      return NextResponse.json({
        success: false,
        message: 'Error al conectar con Supabase',
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('✅ Conexión con Supabase exitosa');
    
    return NextResponse.json({
      success: true,
      message: 'Conexión con Supabase exitosa',
      data: {
        connection: 'OK',
        testQuery: 'OK'
      }
    });

  } catch (error) {
    console.error('💥 Error crítico al probar Supabase:', error);
    return NextResponse.json({
      success: false,
      message: 'Error crítico al probar Supabase',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
