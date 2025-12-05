import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, type AdminUser } from '@/lib/config/adminUsers';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de entorno de Supabase no configuradas');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function isAuthorized(req: NextRequest): { authorized: boolean; user?: AdminUser } {
  const user = req.headers.get('x-admin-user');
  const pass = req.headers.get('x-admin-pass');
  
  if (!user || !pass) {
    return { authorized: false };
  }
  
  const adminUser = validateAdminCredentials(user, pass);
  if (!adminUser) {
    return { authorized: false };
  }
  
  return { authorized: true, user: adminUser };
}

/**
 * Endpoint de debug para mostrar los resultados RAW de la query
 * Sin aplicar ningún filtro o procesamiento del reporte
 */
export async function GET(req: NextRequest) {
  try {
    // Validar autorización
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // Obtener TODAS las reservas pagadas SIN ningún filtro adicional
    // IMPORTANTE: aumentar el límite por defecto de Supabase (1000 filas) para no truncar resultados.
    const { data: reservasTodas, error: reservasError } = await supabase
      .from('reservas')
      .select('id, referencia, nivel, precio, fecha_pago, estado, zona, fila, asiento')
      .eq('estado', 'pagado')
      .order('nivel', { ascending: true })
      .order('referencia', { ascending: true })
      .order('fila', { ascending: true })
      .order('asiento', { ascending: true })
      .limit(5000); // Mismo límite alto que en el reporte principal

    if (reservasError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error obteniendo reservas', 
        detail: reservasError instanceof Error ? reservasError.message : String(reservasError) 
      }, { status: 500 });
    }

    // Estadísticas generales
    const totalReservas = reservasTodas?.length || 0;
    
    // Conteo por función (nivel)
    const conteoPorFuncion: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const totalPorFuncion: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    
    // Conteo por zona (determinada por fila)
    const conteoPorZona: Record<string, { boletos: number; total: number }> = {};
    
    // Función auxiliar para determinar zona desde fila
    function determinarZonaPorFila(fila: string, precio?: number | null): string {
      if (!fila) return 'Sin zona asignada';
      const filaUpper = fila.toUpperCase().trim();
      if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].includes(filaUpper)) return 'ZONA ORO';
      if (['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].includes(filaUpper)) return 'ZONA PLATA';
      if (['II', 'HH', 'JJ', 'KK'].includes(filaUpper)) return 'BRONCE (PALCOS)';
      if (['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG'].includes(filaUpper)) return 'BRONCE (BALCÓN)';
      if (precio) {
        const precioNum = Number(precio);
        if (precioNum >= 200) return 'ZONA ORO';
        if (precioNum >= 180) return 'ZONA PLATA';
        if (precioNum >= 140) return 'BRONCE';
      }
      return 'Sin zona asignada';
    }

    // IMPORTANTE: Filtrar usuarios internos (igual que el reporte principal)
    const reservasSinInternos = (reservasTodas || []).filter(r => 
      r.referencia !== 9001 && r.referencia !== 9002 && r.referencia !== 9003
    );

    // Procesar cada reserva (SIN usuarios internos)
    reservasSinInternos.forEach(r => {
      // Conteo por función
      if (r.nivel >= 1 && r.nivel <= 3) {
        conteoPorFuncion[r.nivel] += 1;
        totalPorFuncion[r.nivel] += Number(r.precio) || 0;
      }
      
      // Conteo por zona (desde fila)
      const zonaCalculada = determinarZonaPorFila(r.fila, r.precio);
      if (!conteoPorZona[zonaCalculada]) {
        conteoPorZona[zonaCalculada] = { boletos: 0, total: 0 };
      }
      conteoPorZona[zonaCalculada].boletos += 1;
      conteoPorZona[zonaCalculada].total += Number(r.precio) || 0;
    });

    // Filtrar por función si se solicita (sin usuarios internos)
    const funcionParam = req.nextUrl.searchParams.get('funcion');
    let reservasFiltradas = reservasSinInternos || [];
    
    if (funcionParam) {
      const funcion = parseInt(funcionParam);
      if (funcion >= 1 && funcion <= 3) {
        reservasFiltradas = reservasSinInternos.filter(r => r.nivel === funcion);
      }
    }

    // Agrupar por zona para función específica
    const detallePorZona: Record<string, any[]> = {};
    reservasFiltradas.forEach(r => {
      const zona = determinarZonaPorFila(r.fila, r.precio);
      if (!detallePorZona[zona]) {
        detallePorZona[zona] = [];
      }
      detallePorZona[zona].push({
        id: r.id,
        referencia: r.referencia,
        nivel: r.nivel,
        fila: r.fila,
        asiento: r.asiento,
        precio: r.precio,
        fecha_pago: r.fecha_pago,
        zona_bd: r.zona,
        zona_calculada: zona
      });
    });

    // Conteo específico para función 2, zona ORO (SIN usuarios internos)
    const funcion2ZonaOro = reservasSinInternos.filter(r => 
      r.nivel === 2 && 
      r.fila && 
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].includes(r.fila.toUpperCase().trim())
    );
    
    // Conteo de usuarios internos encontrados
    const usuariosInternosEncontrados = {
      total: (reservasTodas || []).filter(r => r.referencia === 9001 || r.referencia === 9002 || r.referencia === 9003).length,
      por_referencia: {
        9001: (reservasTodas || []).filter(r => r.referencia === 9001).length,
        9002: (reservasTodas || []).filter(r => r.referencia === 9002).length,
        9003: (reservasTodas || []).filter(r => r.referencia === 9003).length
      }
    };

    return NextResponse.json({
      success: true,
      query: {
        filtros_aplicados: {
          estado: 'pagado',
          funcion: funcionParam ? parseInt(funcionParam) : 'todas',
          excluir_usuarios_internos: true
        },
        total_reservas_todas: totalReservas,
        total_reservas_sin_internos: reservasSinInternos.length,
        reservas_mostradas: reservasFiltradas.length,
        usuarios_internos_excluidos: usuariosInternosEncontrados
      },
      estadisticas: {
        por_funcion: {
          1: { boletos: conteoPorFuncion[1], total: totalPorFuncion[1] },
          2: { boletos: conteoPorFuncion[2], total: totalPorFuncion[2] },
          3: { boletos: conteoPorFuncion[3], total: totalPorFuncion[3] }
        },
        por_zona: conteoPorZona,
        funcion_2_zona_oro: {
          boletos: funcion2ZonaOro.length,
          total: funcion2ZonaOro.reduce((sum, r) => sum + (Number(r.precio) || 0), 0),
          filas_encontradas: [...new Set(funcion2ZonaOro.map(r => r.fila?.toUpperCase().trim()).filter(Boolean))].sort()
        }
      },
      datos: {
        reservas: reservasFiltradas.map(r => ({
          id: r.id,
          referencia: r.referencia,
          nivel: r.nivel,
          fila: r.fila,
          asiento: r.asiento,
          precio: r.precio,
          fecha_pago: r.fecha_pago,
          zona_bd: r.zona,
          zona_calculada: determinarZonaPorFila(r.fila, r.precio)
        })),
        agrupado_por_zona: detallePorZona
      },
      fecha_consulta: new Date().toISOString()
    });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    console.error('❌ Error en debug de cortes de caja:', errorMessage);
    return NextResponse.json({ 
      success: false, 
      message: 'Error obteniendo datos de debug', 
      detail: errorMessage
    }, { status: 500 });
  }
}

