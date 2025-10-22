import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Iniciando prueba de login...');
    
    const body = await request.json();
    const { alumno_ref, clave } = body;
    
    console.log('📝 Datos de prueba:', { alumno_ref, clave: clave ? '***' : 'undefined' });

    if (!alumno_ref || !clave) {
      return NextResponse.json({
        success: false,
        message: 'alumno_ref y clave son requeridos'
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    console.log('✅ Cliente de Supabase obtenido');

    // Paso 1: Verificar si el alumno existe
    console.log('🔍 Paso 1: Buscando alumno...');
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('*')
      .eq('alumno_ref', parseInt(alumno_ref))
      .single();

    console.log('📊 Resultado búsqueda alumno:', { 
      found: !!alumno, 
      error: alumnoError?.message,
      alumno: alumno ? {
        id: alumno.alumno_id,
        ref: alumno.alumno_ref,
        nombre: alumno.alumno_nombre,
        status: alumno.alumno_status
      } : null
    });

    if (alumnoError || !alumno) {
      return NextResponse.json({
        success: false,
        message: 'Alumno no encontrado',
        details: {
          error: alumnoError?.message,
          alumno_ref: alumno_ref
        }
      }, { status: 404 });
    }

    // Paso 2: Verificar contraseña
    console.log('🔍 Paso 2: Verificando contraseña...');
    const { data: detalle, error: detalleError } = await supabase
      .from('alumno_detalles')
      .select('*')
      .eq('alumno_id', alumno.alumno_id)
      .eq('alumno_clave', clave.toString())
      .single();

    console.log('📊 Resultado verificación contraseña:', { 
      found: !!detalle, 
      error: detalleError?.message,
      isMasterKey: clave.toString() === '2671'
    });

    // Verificar contraseña maestra o contraseña del alumno
    const passwordValid = detalleError === null || clave.toString() === '2671';

    if (!passwordValid) {
      return NextResponse.json({
        success: false,
        message: 'Contraseña incorrecta',
        details: {
          error: detalleError?.message,
          alumno_id: alumno.alumno_id
        }
      }, { status: 401 });
    }

    // Paso 3: Obtener hermanos (simplificado)
    console.log('🔍 Paso 3: Obteniendo hermanos...');
    const { data: hermanos, error: hermanosError } = await supabase
      .from('alumno_familiar')
      .select('*')
      .eq('alumno_id', alumno.alumno_id)
      .limit(5);

    console.log('📊 Resultado hermanos:', { 
      count: hermanos?.length || 0, 
      error: hermanosError?.message 
    });

    return NextResponse.json({
      success: true,
      message: 'Login de prueba exitoso',
      data: {
        alumno: {
          id: alumno.alumno_id,
          ref: alumno.alumno_ref,
          nombre: alumno.alumno_nombre,
          nivel: alumno.alumno_nivel,
          grado: alumno.alumno_grado,
          status: alumno.alumno_status
        },
        passwordValid: true,
        hermanosCount: hermanos?.length || 0,
        isMasterKey: clave.toString() === '2671'
      }
    });

  } catch (error) {
    console.error('💥 Error en prueba de login:', error);
    return NextResponse.json({
      success: false,
      message: 'Error en prueba de login',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
