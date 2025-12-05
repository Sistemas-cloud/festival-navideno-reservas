import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, type AdminUser } from '@/lib/config/adminUsers';
import { createClient } from '@supabase/supabase-js';
import { getPaymentLimitsForFunction } from '@/lib/config/paymentLimits';

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
 * Determina la zona basándose en la fila del asiento (igual que en el mapa visual)
 * ORO: Filas A-I
 * PLATA: Filas J-W
 * BRONCE (PALCOS): Filas II, HH, JJ, KK
 * BRONCE (BALCÓN): Filas AA, BB, CC, DD, EE, FF, GG
 */
function determinarZonaPorFila(fila: string, precio?: number | null): string {
  if (!fila) return 'Sin zona asignada';
  
  const filaUpper = fila.toUpperCase().trim();
  
  // ZONA ORO: Filas A-I
  if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].includes(filaUpper)) {
    return 'ZONA ORO';
  }
  
  // ZONA PLATA: Filas J-W
  if (['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].includes(filaUpper)) {
    return 'ZONA PLATA';
  }
  
  // BRONCE (PALCOS): Filas II, HH, JJ, KK
  if (['II', 'HH', 'JJ', 'KK'].includes(filaUpper)) {
    return 'BRONCE (PALCOS)';
  }
  
  // BRONCE (BALCÓN): Filas AA, BB, CC, DD, EE, FF, GG
  if (['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG'].includes(filaUpper)) {
    return 'BRONCE (BALCÓN)';
  }
  
  // Si no coincide con ninguna fila, intentar determinar por precio como fallback
  if (precio) {
    const precioNum = Number(precio);
    if (precioNum >= 200) {
      return 'ZONA ORO';
    } else if (precioNum >= 180) {
      return 'ZONA PLATA';
    } else if (precioNum >= 140) {
      return 'BRONCE';
    }
  }
  
  return 'Sin zona asignada';
}

export async function GET(req: NextRequest) {
  try {
    // Validar autorización
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // Parámetro opcional: filtrar por función específica (1, 2, o 3)
    const funcionParam = req.nextUrl.searchParams.get('funcion');
    const funcionFiltro = funcionParam ? parseInt(funcionParam) : null;

    // Obtener TODAS las reservas pagadas (incluyendo fila y zona para análisis)
    // IMPORTANTE: aumentar el límite por defecto de Supabase (1000 filas) para no truncar resultados.
    let query = supabase
      .from('reservas')
      .select('referencia, nivel, precio, fecha_pago, estado, zona, fila')
      .eq('estado', 'pagado');

    // Si se especifica una función, filtrar solo esa función en la consulta de Supabase
    if (funcionFiltro && funcionFiltro >= 1 && funcionFiltro <= 3) {
      query = query.eq('nivel', funcionFiltro);
      console.log(`🔍 Filtro de función aplicado: nivel = ${funcionFiltro}`);
    }

    const { data: reservasTodas, error: reservasError } = await query
      .order('nivel', { ascending: true })
      .order('referencia', { ascending: true })
      .limit(5000); // Suficiente para todas las funciones y todas las zonas

    if (reservasError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error obteniendo reservas', 
        detail: reservasError instanceof Error ? reservasError.message : String(reservasError) 
      }, { status: 500 });
    }

    console.log(`🔍 ===== INICIO DEBUG CORTE DE CAJA =====`);
    console.log(`🔍 Total de registros recibidos de Supabase (reservasTodas): ${(reservasTodas || []).length}`);
    
    // Log para depuración: contar boletos y totales por función antes de filtrar
    const conteoPorFuncion: Record<number, { boletos: number; total: number }> = { 1: { boletos: 0, total: 0 }, 2: { boletos: 0, total: 0 }, 3: { boletos: 0, total: 0 } };
    (reservasTodas || []).forEach(r => {
      if (r.nivel >= 1 && r.nivel <= 3) {
        conteoPorFuncion[r.nivel].boletos += 1;
        conteoPorFuncion[r.nivel].total += Number(r.precio) || 0;
      }
    });
    console.log(`📊 Cortes de Caja - Total boletos pagados por función (ANTES de filtrar usuarios internos):`, {
      1: `${conteoPorFuncion[1].boletos} boletos, $${conteoPorFuncion[1].total.toFixed(2)}`,
      2: `${conteoPorFuncion[2].boletos} boletos, $${conteoPorFuncion[2].total.toFixed(2)}`,
      3: `${conteoPorFuncion[3].boletos} boletos, $${conteoPorFuncion[3].total.toFixed(2)}`
    });
    console.log(`📊 Cortes de Caja - Total general antes de filtrar: $${(conteoPorFuncion[1].total + conteoPorFuncion[2].total + conteoPorFuncion[3].total).toFixed(2)}`);

    // Filtrar usuarios internos (9001, 9002, 9003) - MISMO FILTRO para TODAS las funciones
    const reservas = (reservasTodas || []).filter(r => 
      r.referencia !== 9001 && r.referencia !== 9002 && r.referencia !== 9003
    );

    // Log para depuración: contar boletos y totales por función después de filtrar
    const conteoDespuesFiltro: Record<number, { boletos: number; total: number; sinFecha: number }> = { 
      1: { boletos: 0, total: 0, sinFecha: 0 }, 
      2: { boletos: 0, total: 0, sinFecha: 0 }, 
      3: { boletos: 0, total: 0, sinFecha: 0 } 
    };
    const nivelesEncontrados = new Set<number>();
    // Contar boletos por zona para función 2 (verificación específica)
    const conteoZonaOroFuncion2: { boletos: number; total: number; filas: Set<string> } = { boletos: 0, total: 0, filas: new Set() };
    
    reservas.forEach(r => {
      nivelesEncontrados.add(r.nivel);
      if (r.nivel >= 1 && r.nivel <= 3) {
        conteoDespuesFiltro[r.nivel].boletos += 1;
        const precio = Number(r.precio) || 0;
        conteoDespuesFiltro[r.nivel].total += precio;
        if (!r.fecha_pago || r.fecha_pago.trim() === '') {
          conteoDespuesFiltro[r.nivel].sinFecha += 1;
        }
        
        // Contar específicamente zona ORO en función 2 (filas A-I)
        if (r.nivel === 2 && r.fila && ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].includes(r.fila.toUpperCase().trim())) {
          conteoZonaOroFuncion2.boletos += 1;
          conteoZonaOroFuncion2.total += precio;
          conteoZonaOroFuncion2.filas.add(r.fila.toUpperCase().trim());
        }
      }
    });
    
    console.log(`📊 Cortes de Caja - Total boletos pagados por función (después de filtrar usuarios internos):`, {
      1: `${conteoDespuesFiltro[1].boletos} boletos (${conteoDespuesFiltro[1].sinFecha} sin fecha), $${conteoDespuesFiltro[1].total.toFixed(2)}`,
      2: `${conteoDespuesFiltro[2].boletos} boletos (${conteoDespuesFiltro[2].sinFecha} sin fecha), $${conteoDespuesFiltro[2].total.toFixed(2)}`,
      3: `${conteoDespuesFiltro[3].boletos} boletos (${conteoDespuesFiltro[3].sinFecha} sin fecha), $${conteoDespuesFiltro[3].total.toFixed(2)}`
    });
    console.log(`📊 Cortes de Caja - Total general después de filtrar: $${(conteoDespuesFiltro[1].total + conteoDespuesFiltro[2].total + conteoDespuesFiltro[3].total).toFixed(2)}`);
    console.log(`📊 Cortes de Caja - Niveles únicos encontrados en reservas:`, Array.from(nivelesEncontrados).sort());
    console.log(`📊 Cortes de Caja - Zona ORO (Función 2) por filas A-I: ${conteoZonaOroFuncion2.boletos} boletos, $${conteoZonaOroFuncion2.total.toFixed(2)}, filas encontradas: ${Array.from(conteoZonaOroFuncion2.filas).sort().join(', ')}`);
    
    // Verificar si hay reservas con niveles fuera del rango esperado
    const nivelesInesperados = Array.from(nivelesEncontrados).filter(n => n < 1 || n > 3);
    if (nivelesInesperados.length > 0) {
      console.warn(`⚠️ Cortes de Caja - Se encontraron reservas con niveles inesperados:`, nivelesInesperados);
      nivelesInesperados.forEach(nivel => {
        const count = reservas.filter(r => r.nivel === nivel).length;
        console.warn(`    Nivel ${nivel}: ${count} reservas`);
      });
    }

    if (!reservas || reservas.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No hay reservas pagadas para generar el corte de caja' 
      }, { status: 404 });
    }

    // Obtener nombres de alumnos (solo para mostrar en el reporte)
    const referenciasUnicas = [...new Set(reservas.map(r => r.referencia))];
    const nombresMap = new Map<number, string>();

    for (const ref of referenciasUnicas) {
      const { data: alumno } = await supabase
        .from('alumno')
        .select('alumno_app, alumno_apm, alumno_nombre')
        .eq('alumno_ref', ref)
        .single();

      if (alumno) {
        const nombreCompleto = `${alumno.alumno_app} ${alumno.alumno_apm} ${alumno.alumno_nombre}`.trim();
        nombresMap.set(ref, nombreCompleto || `Control ${ref}`);
      } else {
        nombresMap.set(ref, `Control ${ref}`);
      }
    }

    // Agrupar por función (nivel) - SIN agrupar por familia, solo sumar cada boleto
    const cortesPorFuncion: Record<number, {
      funcion: number;
      nombreFuncion: string;
      totalBoletos: number;
      totalRecaudado: number;
      familias: number;
      reservas: Array<{
        referencia: number;
        nombre: string;
        boletos: number;
        total: number;
        fechaPago: string | null;
      }>;
      fechasPago: Array<{
        fecha: string;
        boletos: number;
        total: number;
        familias: number;
      }>;
      zonas: Array<{
        zona: string;
        boletos: number;
        total: number;
      }>;
    }> = {};

    // Inicializar cortes para cada función
    const nombresFunciones: Record<number, string> = {
      1: 'Función 1 - Kinder',
      2: 'Función 2 - Primaria',
      3: 'Función 3 - Secundaria'
    };

    for (let i = 1; i <= 3; i++) {
      cortesPorFuncion[i] = {
        funcion: i,
        nombreFuncion: nombresFunciones[i],
        totalBoletos: 0,
        totalRecaudado: 0,
        familias: 0,
        reservas: [],
        fechasPago: [],
        zonas: []
      };
    }

    // Calcular desglose por fechas de pago para cada función
    // Esta es la fuente de verdad: sumamos directamente cada boleto pagado por fecha
    // Si hay filtro de función, solo procesar esa función
    const funcionesAProcesar = funcionFiltro ? [funcionFiltro] : [1, 2, 3];
    
    for (const i of funcionesAProcesar) {
      if (cortesPorFuncion[i]) {
        // === PASO 1: aplicar la "query base" POR FUNCIÓN ===
        // Equivalente a: SELECT * FROM reservas WHERE estado = 'pagado' AND nivel = i (sin filtros extra)
        const reservasNivel = reservas.filter(r => r.nivel === i);
        
        console.log(`🔍 Función ${i} (${nombresFunciones[i]}) - Reservas encontradas (nivel === ${i}): ${reservasNivel.length}`);

        const reservasPorFecha = new Map<string, { boletos: number; total: number; familias: Set<number> }>();
        const reservasPorZona = new Map<string, { boletos: number; total: number }>();
        const reservasPorReferencia = new Map<number, { boletos: number; total: number; fechaPago: string | null }>();
        
        // === PASO 2: sumar directamente cada boleto de esta función ===
        reservasNivel.forEach(r => {
          const precio = Number(r.precio) || 0;
          
          // Sumar por fecha de pago (para el desglose)
          const fechaKey = (r.fecha_pago && r.fecha_pago.trim() !== '') ? r.fecha_pago : 'Sin fecha asignada';
          if (!reservasPorFecha.has(fechaKey)) {
            reservasPorFecha.set(fechaKey, { boletos: 0, total: 0, familias: new Set() });
          }
          const fechaData = reservasPorFecha.get(fechaKey)!;
          fechaData.boletos += 1;
          fechaData.total += precio;
          fechaData.familias.add(r.referencia);
          
          // Sumar por zona PARA DESGLOSE (no se usa para filtrar totales)
          // Prioridad: usar la zona de BD (coincide con tus consultas tipo zona = 'ORO')
          // Si no hay zona en BD, se calcula por fila como respaldo.
          let zonaClave = (r.zona && r.zona.trim() !== '') ? r.zona.trim() : determinarZonaPorFila(r.fila, r.precio);
          if (!zonaClave || zonaClave.trim() === '') {
            zonaClave = 'Sin zona asignada';
          }
          if (!reservasPorZona.has(zonaClave)) {
            reservasPorZona.set(zonaClave, { boletos: 0, total: 0 });
          }
          const zonaData = reservasPorZona.get(zonaClave)!;
          zonaData.boletos += 1;
          zonaData.total += precio;
          
          // Agrupar por referencia solo para la lista de familias (no para totales)
          if (!reservasPorReferencia.has(r.referencia)) {
            reservasPorReferencia.set(r.referencia, { boletos: 0, total: 0, fechaPago: r.fecha_pago });
          }
          const refData = reservasPorReferencia.get(r.referencia)!;
          refData.boletos += 1;
          refData.total += precio;
          
          // Logs específicos solo para función 2 (debug más fino, pero sin afectar cálculos)
          if (i === 2) {
            if (!r.fecha_pago) {
              console.warn(`⚠️ Función 2 - Reserva sin fecha_pago: referencia=${r.referencia}, fila=${r.fila}, precio=${precio}, zona_final=${zonaClave}, zona_bd=${r.zona || 'sin zona'}`);
            }
          }
        });
        
        // Calcular desglose por fechas (pero los TOTALES se basan directamente en reservasNivel)
        const fechasPagoArray: Array<{ fecha: string; boletos: number; total: number; familias: number }> = [];
        const familiasSet = new Set<number>();
        
        // Obtener las fechas esperadas para esta función
        const paymentLimits = getPaymentLimitsForFunction(i);
        const fechasEsperadas = paymentLimits ? [paymentLimits.fecha1, paymentLimits.fecha2] : [];
        
        // Agregar fechas esperadas primero
        for (const fecha of fechasEsperadas) {
          if (reservasPorFecha.has(fecha)) {
            const data = reservasPorFecha.get(fecha)!;
            fechasPagoArray.push({
              fecha: fecha,
              boletos: data.boletos,
              total: data.total,
              familias: data.familias.size
            });
            data.familias.forEach(ref => familiasSet.add(ref));
          }
        }
        
        // Agregar otras fechas encontradas
        const otrasFechas = Array.from(reservasPorFecha.keys()).filter(f => 
          !fechasEsperadas.includes(f) && f !== 'Sin fecha asignada'
        ).sort();
        
        for (const fecha of otrasFechas) {
          const data = reservasPorFecha.get(fecha)!;
          fechasPagoArray.push({
            fecha: fecha,
            boletos: data.boletos,
            total: data.total,
            familias: data.familias.size
          });
          data.familias.forEach(ref => familiasSet.add(ref));
        }
        
        // Agregar "Sin fecha asignada" al final si existe
        if (reservasPorFecha.has('Sin fecha asignada')) {
          const data = reservasPorFecha.get('Sin fecha asignada')!;
          fechasPagoArray.push({
            fecha: 'Sin fecha asignada',
            boletos: data.boletos,
            total: data.total,
            familias: data.familias.size
          });
          data.familias.forEach(ref => familiasSet.add(ref));
        }
        
        // === TOTALES POR FUNCIÓN (fuente de verdad) ===
        // Basados DIRECTAMENTE en todas las reservas de esta función (reservasNivel),
        // igual que tu consulta: SELECT * FROM reservas WHERE estado='pagado' AND nivel = i (excluyendo internos).
        const totalBoletosFuncion = reservasNivel.length;
        const totalRecaudadoFuncion = reservasNivel.reduce((sum, r) => sum + (Number(r.precio) || 0), 0);
        const familiasFuncion = new Set(reservasNivel.map(r => r.referencia)).size;

        console.log(`🔍 Función ${i} - Totales DIRECTOS desde reservasNivel:`);
        console.log(`   - Total boletos: ${totalBoletosFuncion}`);
        console.log(`   - Total recaudado: $${totalRecaudadoFuncion.toFixed(2)}`);
        console.log(`   - Total familias: ${familiasFuncion}`);

        cortesPorFuncion[i].totalBoletos = totalBoletosFuncion;
        cortesPorFuncion[i].totalRecaudado = totalRecaudadoFuncion;
        cortesPorFuncion[i].familias = familiasFuncion;
        cortesPorFuncion[i].fechasPago = fechasPagoArray;
        
        // Agregar reservas agrupadas por referencia solo para la lista (sin afectar totales)
        for (const [referencia, refData] of reservasPorReferencia.entries()) {
          cortesPorFuncion[i].reservas.push({
            referencia: referencia,
            nombre: nombresMap.get(referencia) || `Control ${referencia}`,
            boletos: refData.boletos,
            total: refData.total,
            fechaPago: refData.fechaPago
          });
        }
        
        // Crear array de zonas con orden específico
        const ordenZonas = ['ZONA ORO', 'ZONA PLATA', 'BRONCE (PALCOS)', 'BRONCE (BALCÓN)', 'Sin zona asignada'];
        const zonasOrdenadas: Array<{ zona: string; boletos: number; total: number }> = [];
        const otrasZonas: Array<{ zona: string; boletos: number; total: number }> = [];
        
        // Agregar zonas en el orden especificado
        for (const zonaOrden of ordenZonas) {
          if (reservasPorZona.has(zonaOrden)) {
            const data = reservasPorZona.get(zonaOrden)!;
            zonasOrdenadas.push({
              zona: zonaOrden,
              boletos: data.boletos,
              total: data.total
            });
          }
        }
        
        // Agregar otras zonas que no estén en el orden especificado
        for (const [zona, data] of reservasPorZona.entries()) {
          if (!ordenZonas.includes(zona)) {
            otrasZonas.push({
              zona: zona,
              boletos: data.boletos,
              total: data.total
            });
          }
        }
        
        // Ordenar otras zonas alfabéticamente
        otrasZonas.sort((a, b) => a.zona.localeCompare(b.zona));
        
        // Combinar zonas ordenadas
        const zonasArray = [...zonasOrdenadas, ...otrasZonas];
        
        cortesPorFuncion[i].zonas = zonasArray;
        
        // Validación: verificar que la suma de zonas coincida con los totales calculados por función
        const totalBoletosPorZonas = zonasArray.reduce((sum, zona) => sum + zona.boletos, 0);
        const totalRecaudadoPorZonas = zonasArray.reduce((sum, zona) => sum + zona.total, 0);
        
        if (Math.abs(totalBoletosPorZonas - cortesPorFuncion[i].totalBoletos) > 0.01) {
          console.warn(`    ⚠️ DISCREPANCIA ZONAS: Los boletos por zonas (${totalBoletosPorZonas}) no coinciden con el total (${cortesPorFuncion[i].totalBoletos})`);
        }
        if (Math.abs(totalRecaudadoPorZonas - cortesPorFuncion[i].totalRecaudado) > 0.01) {
          console.warn(`    ⚠️ DISCREPANCIA ZONAS: El total por zonas ($${totalRecaudadoPorZonas.toFixed(2)}) no coincide con el total ($${cortesPorFuncion[i].totalRecaudado.toFixed(2)})`);
        }
        
        // Log específico para zona ORO de función 2
        if (i === 2) {
          const zonaOro = zonasArray.find(z => z.zona === 'ZONA ORO');
          if (zonaOro) {
            console.log(`    📊 ZONA ORO (Función 2): ${zonaOro.boletos} boletos, $${zonaOro.total.toFixed(2)}`);
          }
        }
        
        // Log para depuración
        console.log(`  Función ${i} (${nombresFunciones[i]}): ${cortesPorFuncion[i].totalBoletos} boletos, $${cortesPorFuncion[i].totalRecaudado.toFixed(2)}, ${cortesPorFuncion[i].familias} familias`);
        if (fechasPagoArray.length > 0) {
          console.log(`    Desglose por fecha de pago para ${nombresFunciones[i]}:`);
          fechasPagoArray.forEach(data => {
            console.log(`      Fecha ${data.fecha}: ${data.boletos} boletos, $${data.total.toFixed(2)}, ${data.familias} familias`);
          });
        }
        if (zonasArray.length > 0) {
          console.log(`    Desglose por zona para ${nombresFunciones[i]}:`);
          zonasArray.forEach(data => {
            console.log(`      Zona ${data.zona}: ${data.boletos} boletos, $${data.total.toFixed(2)}`);
          });
        }
      }
    }

    // Ordenar reservas por referencia dentro de cada función
    for (const funcion of Object.values(cortesPorFuncion)) {
      funcion.reservas.sort((a, b) => a.referencia - b.referencia);
    }

    // Convertir a array y filtrar funciones sin datos
    const cortes = Object.values(cortesPorFuncion)
      .filter(corte => corte.totalBoletos > 0)
      .sort((a, b) => a.funcion - b.funcion);

    // Calcular totales generales
    const totalGeneral = cortes.reduce((sum, corte) => sum + corte.totalRecaudado, 0);
    const totalBoletosGeneral = cortes.reduce((sum, corte) => sum + corte.totalBoletos, 0);
    const totalFamiliasGeneral = cortes.reduce((sum, corte) => sum + corte.familias, 0);

    return NextResponse.json({
      success: true,
      data: {
        cortes: cortes,
        totales: {
          totalRecaudado: totalGeneral,
          totalBoletos: totalBoletosGeneral,
          totalFamilias: totalFamiliasGeneral
        },
        fechaGeneracion: new Date().toISOString()
      }
    });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    console.error('❌ Error generando corte de caja:', errorMessage);
    return NextResponse.json({ 
      success: false, 
      message: 'Error generando corte de caja', 
      detail: errorMessage
    }, { status: 500 });
  }
}

