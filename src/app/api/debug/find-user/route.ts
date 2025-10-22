import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando búsqueda detallada de usuario...');
    
    const body = await request.json();
    const { alumno_ref } = body;
    
    console.log('📝 Buscando usuario:', alumno_ref);

    if (!alumno_ref) {
      return NextResponse.json({
        success: false,
        message: 'alumno_ref es requerido'
      }, { status: 400 });
    }

    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        message: 'Variables de entorno no configuradas'
      }, { status: 500 });
    }

    // Crear cliente de Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Paso 1: Buscar TODOS los usuarios (sin filtros)
    console.log('🔍 Paso 1: Buscando todos los usuarios...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('alumno')
      .select('*')
      .limit(10);

    console.log('📊 Todos los usuarios:', { 
      count: allUsers?.length || 0, 
      error: allUsersError?.message,
      users: allUsers?.map(u => ({
        ref: u.alumno_ref,
        nombre: u.alumno_nombre,
        status: u.alumno_status
      })) || []
    });

    // Paso 2: Buscar usuario específico (sin filtros de status)
    console.log('🔍 Paso 2: Buscando usuario específico sin filtros...');
    const { data: userNoFilter, error: userNoFilterError } = await supabase
      .from('alumno')
      .select('*')
      .eq('alumno_ref', parseInt(alumno_ref))
      .single();

    console.log('📊 Usuario sin filtros:', { 
      found: !!userNoFilter, 
      error: userNoFilterError?.message,
      user: userNoFilter ? {
        ref: userNoFilter.alumno_ref,
        nombre: userNoFilter.alumno_nombre,
        status: userNoFilter.alumno_status,
        nivel: userNoFilter.alumno_nivel,
        grado: userNoFilter.alumno_grado
      } : null
    });

    // Paso 3: Buscar usuario con filtros de status (como en el login real)
    console.log('🔍 Paso 3: Buscando usuario con filtros de status...');
    const { data: userWithFilter, error: userWithFilterError } = await supabase
      .from('alumno')
      .select('*')
      .eq('alumno_ref', parseInt(alumno_ref))
      .not('alumno_status', 'in', '(0,3)')
      .single();

    console.log('📊 Usuario con filtros:', { 
      found: !!userWithFilter, 
      error: userWithFilterError?.message,
      user: userWithFilter ? {
        ref: userWithFilter.alumno_ref,
        nombre: userWithFilter.alumno_nombre,
        status: userWithFilter.alumno_status
      } : null
    });

    // Paso 4: Buscar por diferentes tipos de alumno_ref
    console.log('🔍 Paso 4: Probando diferentes formatos de alumno_ref...');
    const testRefs = [
      parseInt(alumno_ref),
      alumno_ref.toString(),
      alumno_ref
    ];

    const refTests = [];
    for (const testRef of testRefs) {
      const { data: testUser, error: testError } = await supabase
        .from('alumno')
        .select('alumno_ref, alumno_nombre, alumno_status')
        .eq('alumno_ref', testRef)
        .single();
      
      refTests.push({
        refType: typeof testRef,
        refValue: testRef,
        found: !!testUser,
        error: testError?.message,
        user: testUser ? {
          ref: testUser.alumno_ref,
          nombre: testUser.alumno_nombre,
          status: testUser.alumno_status
        } : null
      });
    }

    console.log('📊 Pruebas de formato:', refTests);

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico de búsqueda completado',
      data: {
        searchRef: alumno_ref,
        allUsers: {
          count: allUsers?.length || 0,
          error: allUsersError?.message,
          users: allUsers?.map(u => ({
            ref: u.alumno_ref,
            nombre: u.alumno_nombre,
            status: u.alumno_status
          })) || []
        },
        userNoFilter: {
          found: !!userNoFilter,
          error: userNoFilterError?.message,
          user: userNoFilter ? {
            ref: userNoFilter.alumno_ref,
            nombre: userNoFilter.alumno_nombre,
            status: userNoFilter.alumno_status,
            nivel: userNoFilter.alumno_nivel,
            grado: userNoFilter.alumno_grado
          } : null
        },
        userWithFilter: {
          found: !!userWithFilter,
          error: userWithFilterError?.message,
          user: userWithFilter ? {
            ref: userWithFilter.alumno_ref,
            nombre: userWithFilter.alumno_nombre,
            status: userWithFilter.alumno_status
          } : null
        },
        refTests: refTests
      }
    });

  } catch (error) {
    console.error('💥 Error en búsqueda de usuario:', error);
    return NextResponse.json({
      success: false,
      message: 'Error en búsqueda de usuario',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
