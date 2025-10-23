import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alumnoRef = searchParams.get('alumno_ref');
    
    if (!alumnoRef) {
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
        message: 'Variables de entorno faltantes'
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

    // Buscar alumno
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('alumno_id, alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado')
      .eq('alumno_ref', alumnoRef.toString())
      .single();

    if (alumnoError || !alumno) {
      return NextResponse.json({
        success: false,
        message: 'Alumno no encontrado'
      }, { status: 404 });
    }

    // Obtener datos de los padres/tutores
    const { data: padres, error: padresError } = await supabase
      .from('alumno_familiar')
      .select('familiar_app, familiar_apm, familiar_nombre, familiar_cel, familiar_curp')
      .eq('alumno_id', alumno.alumno_id)
      .in('tutor_id', [1, 2])
      .limit(2);

    if (padresError) {
      return NextResponse.json({
        success: false,
        message: 'Error al obtener datos de padres'
      }, { status: 500 });
    }

    // Recopilar criterios de búsqueda
    const searchCriteria = {
      nombres: new Set<string>(),
      telefonos: new Set<string>(),
      curps: new Set<string>()
    };

    for (const padre of padres || []) {
      if (padre.familiar_app && padre.familiar_apm && padre.familiar_nombre) {
        searchCriteria.nombres.add(`${padre.familiar_app} ${padre.familiar_apm} ${padre.familiar_nombre}`);
      }
      if (padre.familiar_cel) {
        searchCriteria.telefonos.add(padre.familiar_cel);
      }
      if (padre.familiar_curp) {
        searchCriteria.curps.add(padre.familiar_curp);
      }
    }

    // Buscar hermanos
    const allIds = new Set<number>();

    // Búsqueda por teléfono
    if (searchCriteria.telefonos.size > 0) {
      const { data: celularRows } = await supabase
        .from('alumno_familiar')
        .select('alumno_id')
        .in('familiar_cel', Array.from(searchCriteria.telefonos));

      if (celularRows) {
        celularRows.forEach((row: { alumno_id: number }) => allIds.add(row.alumno_id));
      }
    }

    // Búsqueda por CURP
    if (searchCriteria.curps.size > 0) {
      const { data: curpRows } = await supabase
        .from('alumno_familiar')
        .select('alumno_id')
        .in('familiar_curp', Array.from(searchCriteria.curps));

      if (curpRows) {
        curpRows.forEach((row: { alumno_id: number }) => allIds.add(row.alumno_id));
      }
    }

    // Obtener datos de hermanos
    let hermanosData = [];
    if (allIds.size > 0) {
      const { data: hermanos } = await supabase
        .from('alumno')
        .select('alumno_id, alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado')
        .in('alumno_id', Array.from(allIds))
        .eq('alumno_ciclo_escolar', 22)
        .neq('alumno_id', alumno.alumno_id);

      if (hermanos) {
        hermanosData = hermanos.map(hermano => ({
          control: hermano.alumno_ref,
          nombre: `${hermano.alumno_app} ${hermano.alumno_apm} ${hermano.alumno_nombre}`,
          nivel: hermano.alumno_nivel,
          grado: hermano.alumno_grado
        }));
      }
    }

    // Agregar al alumno actual
    const alumnoActual = {
      control: alumno.alumno_ref,
      nombre: `${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`,
      nivel: alumno.alumno_nivel,
      grado: alumno.alumno_grado
    };

    hermanosData.unshift(alumnoActual);

    return NextResponse.json({
      success: true,
      data: {
        alumno: alumnoActual,
        padres: padres || [],
        searchCriteria: {
          nombres: Array.from(searchCriteria.nombres),
          telefonos: Array.from(searchCriteria.telefonos),
          curps: Array.from(searchCriteria.curps)
        },
        idsEncontrados: Array.from(allIds),
        hermanos: hermanosData,
        totalHermanos: hermanosData.length
      }
    });

  } catch (error) {
    console.error('Error en debug hermanos:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
