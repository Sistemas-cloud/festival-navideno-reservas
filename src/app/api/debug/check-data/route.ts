import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando datos en Supabase...');
    
    const supabase = getSupabaseClient();

    // Verificar tabla alumno
    const { data: alumnos, error: alumnosError } = await supabase
      .from('alumno')
      .select('alumno_id, alumno_ref, alumno_nombre, alumno_status')
      .limit(5);

    // Verificar tabla alumno_detalles
    const { data: detalles, error: detallesError } = await supabase
      .from('alumno_detalles')
      .select('alumno_id, alumno_clave')
      .limit(5);

    // Verificar tabla alumno_familiar
    const { data: familiares, error: familiaresError } = await supabase
      .from('alumno_familiar')
      .select('alumno_id, familiar_nombre')
      .limit(5);

    // Verificar tabla reservas
    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('id, fila, asiento, estado, referencia')
      .limit(5);

    const dataCheck = {
      tablas: {
        alumno: {
          exists: !alumnosError,
          count: alumnos?.length || 0,
          error: alumnosError?.message,
          sample: alumnos?.slice(0, 2) || []
        },
        alumno_detalles: {
          exists: !detallesError,
          count: detalles?.length || 0,
          error: detallesError?.message,
          sample: detalles?.slice(0, 2) || []
        },
        alumno_familiar: {
          exists: !familiaresError,
          count: familiares?.length || 0,
          error: familiaresError?.message,
          sample: familiares?.slice(0, 2) || []
        },
        reservas: {
          exists: !reservasError,
          count: reservas?.length || 0,
          error: reservasError?.message,
          sample: reservas?.slice(0, 2) || []
        }
      }
    };

    console.log('📊 Verificación de datos completada:', dataCheck);

    return NextResponse.json({
      success: true,
      message: 'Verificación de datos completada',
      data: dataCheck
    });

  } catch (error) {
    console.error('💥 Error al verificar datos:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al verificar datos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
