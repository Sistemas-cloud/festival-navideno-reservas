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

interface ReservaRaw {
  id: number;
  referencia: number;
  nivel: number;
  estado: 'reservado' | 'pagado';
  fecha_pago: string | null;
  precio: number;
  fila: string;
  asiento: number;
  zona: string | null;
}

interface AlumnoAgrupado {
  referencia: number;
  nombreCompleto: string;
  asientos: string; // "Fila-Asiento, Fila-Asiento, ..."
  zonas: string; // "Zona1, Zona2, ..." o única zona
  total: number;
  cantidadBoletos: number;
  estado: 'reservado' | 'pagado';
}

export async function GET(req: NextRequest) {
  try {
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const funcionParam = searchParams.get('funcion');
    const fechaPago = searchParams.get('fecha_pago') || '2025-12-12';

    if (!funcionParam || (funcionParam !== '2' && funcionParam !== '3')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Debe especificar función 2 o 3' 
      }, { status: 400 });
    }

    const funcion = parseInt(funcionParam, 10);
    const supabase = getSupabaseClient();

    // Obtener todas las reservas con fecha_pago = fechaPago y nivel = funcion
    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('id, referencia, nivel, estado, fecha_pago, precio, fila, asiento, zona')
      .eq('fecha_pago', fechaPago)
      .eq('nivel', funcion)
      .order('referencia', { ascending: true });

    if (reservasError) {
      console.error('Error al obtener reservas:', reservasError);
      return NextResponse.json({ 
        success: false, 
        message: 'Error al obtener reservas' 
      }, { status: 500 });
    }

    if (!reservas || reservas.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: {
          pagados: [],
          pendientes: [],
          totalPagados: 0,
          totalPendientes: 0
        } 
      });
    }

    // Obtener información de los alumnos únicos
    const referenciasUnicas = [...new Set(reservas.map(r => r.referencia))];
    
    console.log('🔍 [PAGOS-FECHA] Referencias únicas encontradas:', referenciasUnicas);
    console.log('🔍 [PAGOS-FECHA] Total de referencias únicas:', referenciasUnicas.length);
    
    const queryParams = {
      from: 'alumno',
      select: 'alumno_ref, alumno_app, alumno_apm, alumno_nombre',
      filter: `alumno_ref IN (${referenciasUnicas.join(',')})`
    };
    console.log('📝 [PAGOS-FECHA] Query que se ejecutará:', JSON.stringify(queryParams, null, 2));
    
    const { data: alumnos, error: alumnosError } = await supabase
      .from('alumno')
      .select('alumno_ref, alumno_app, alumno_apm, alumno_nombre')
      .in('alumno_ref', referenciasUnicas);

    console.log('📊 [PAGOS-FECHA] Resultados de la query de alumnos:');
    console.log('  - Error:', alumnosError);
    console.log('  - Total de alumnos encontrados:', alumnos?.length || 0);
    console.log('  - Datos de alumnos:', JSON.stringify(alumnos, null, 2));

    if (alumnosError) {
      console.error('❌ [PAGOS-FECHA] Error al obtener alumnos:', alumnosError);
      // Continuar sin información de alumnos si hay error
    }

    // Crear mapa de alumnos por referencia
    const alumnosMap = new Map<number, { nombre: string; app: string; apm: string }>();
    if (alumnos) {
      alumnos.forEach(alumno => {
        // Asegurar que alumno_ref sea número
        const refNum = typeof alumno.alumno_ref === 'string' ? parseInt(alumno.alumno_ref, 10) : Number(alumno.alumno_ref);
        console.log(`👤 [PAGOS-FECHA] Procesando alumno - ref (número): ${refNum}, tipo: ${typeof refNum}, app: ${alumno.alumno_app}, apm: ${alumno.alumno_apm}, nombre: ${alumno.alumno_nombre}`);
        alumnosMap.set(refNum, {
          nombre: alumno.alumno_nombre || '',
          app: alumno.alumno_app || '',
          apm: alumno.alumno_apm || ''
        });
      });
    }
    
    console.log('🗺️ [PAGOS-FECHA] Mapa de alumnos creado:', {
      total: alumnosMap.size,
      referencias: Array.from(alumnosMap.keys()),
      datos: Array.from(alumnosMap.entries()).map(([ref, info]) => ({
        referencia: ref,
        nombreCompleto: `${info.app} ${info.apm} ${info.nombre}`.trim()
      }))
    });

    // Agrupar reservas por alumno (referencia) y estado
    const agruparPorAlumno = (reservas: ReservaRaw[]): AlumnoAgrupado[] => {
      const agrupados = new Map<number, {
        referencia: number;
        asientos: Array<{ fila: string; asiento: number }>;
        zonas: Set<string>;
        total: number;
        cantidadBoletos: number;
        estado: 'reservado' | 'pagado';
      }>();

      reservas.forEach(reserva => {
        const key = reserva.referencia;
        if (!agrupados.has(key)) {
          agrupados.set(key, {
            referencia: key,
            asientos: [],
            zonas: new Set<string>(),
            total: 0,
            cantidadBoletos: 0,
            estado: reserva.estado
          });
        }

        const grupo = agrupados.get(key)!;
        grupo.asientos.push({ fila: reserva.fila, asiento: reserva.asiento });
        if (reserva.zona) {
          grupo.zonas.add(reserva.zona);
        }
        grupo.total += Number(reserva.precio) || 0;
        grupo.cantidadBoletos += 1;
      });

      // Convertir a array y formatear
      return Array.from(agrupados.values()).map(grupo => {
        // Asegurar que referencia sea número para buscar en el mapa
        const refNum = typeof grupo.referencia === 'string' ? parseInt(grupo.referencia, 10) : Number(grupo.referencia);
        const alumnoInfo = alumnosMap.get(refNum);
        
        console.log(`🔍 [PAGOS-FECHA] Procesando grupo - referencia: ${grupo.referencia} (tipo: ${typeof grupo.referencia}), refNum: ${refNum} (tipo: ${typeof refNum}), alumnoInfo encontrado:`, alumnoInfo ? 'SÍ' : 'NO');
        if (alumnoInfo) {
          console.log(`  - app: "${alumnoInfo.app}", apm: "${alumnoInfo.apm}", nombre: "${alumnoInfo.nombre}"`);
        } else {
          console.log(`  - ❌ No se encontró información en el mapa para referencia ${refNum}`);
          console.log(`  - Referencias disponibles en el mapa (tipos):`, Array.from(alumnosMap.keys()).map(k => `${k} (${typeof k})`));
          console.log(`  - Buscando con refNum: ${refNum}, tipo: ${typeof refNum}`);
        }
        
        // Concatenar nombre completo: alumno_app + alumno_apm + alumno_nombre
        let nombreCompleto = '';
        if (alumnoInfo) {
          const partes = [];
          if (alumnoInfo.app) partes.push(alumnoInfo.app.trim());
          if (alumnoInfo.apm) partes.push(alumnoInfo.apm.trim());
          if (alumnoInfo.nombre) partes.push(alumnoInfo.nombre.trim());
          nombreCompleto = partes.join(' ').trim();
          console.log(`  - Partes del nombre:`, partes);
          console.log(`  - Nombre completo construido: "${nombreCompleto}"`);
        }
        // Si no se encontró información del alumno o el nombre está vacío, usar referencia
        if (!nombreCompleto) {
          nombreCompleto = `Referencia ${grupo.referencia}`;
          console.log(`  - ⚠️ Usando fallback: "${nombreCompleto}"`);
        }

        // Ordenar asientos por fila y luego por número de asiento
        const asientosOrdenados = grupo.asientos.sort((a, b) => {
          if (a.fila !== b.fila) {
            return a.fila.localeCompare(b.fila);
          }
          return a.asiento - b.asiento;
        });

        const asientosStr = asientosOrdenados
          .map(a => `${a.fila}-${a.asiento}`)
          .join(', ');

        const zonasArray = Array.from(grupo.zonas).filter(Boolean);
        const zonasStr = zonasArray.length > 0 
          ? (zonasArray.length === 1 ? zonasArray[0] : zonasArray.join(', '))
          : 'N/A';

        return {
          referencia: grupo.referencia,
          nombreCompleto,
          asientos: asientosStr,
          zonas: zonasStr,
          total: Number(grupo.total) || 0,
          cantidadBoletos: grupo.cantidadBoletos || 0,
          estado: grupo.estado
        };
      });
    };

    // Separar en pagados y pendientes
    const reservasPagadas = reservas.filter(r => r.estado === 'pagado');
    const reservasPendientes = reservas.filter(r => r.estado === 'reservado');

    const pagados = agruparPorAlumno(reservasPagadas)
      .sort((a, b) => a.referencia - b.referencia);

    const pendientes = agruparPorAlumno(reservasPendientes)
      .sort((a, b) => a.referencia - b.referencia);

    console.log('✅ [PAGOS-FECHA] Resultado final:');
    console.log(`  - Pagados: ${pagados.length} alumnos`);
    console.log(`  - Pendientes: ${pendientes.length} alumnos`);
    console.log('  - Ejemplos de nombres en pagados:', pagados.slice(0, 3).map(a => ({ ref: a.referencia, nombre: a.nombreCompleto })));
    console.log('  - Ejemplos de nombres en pendientes:', pendientes.slice(0, 3).map(a => ({ ref: a.referencia, nombre: a.nombreCompleto })));

    const responseData = {
      success: true,
      data: {
        pagados,
        pendientes,
        totalPagados: pagados.length,
        totalPendientes: pendientes.length,
        fechaPago
      }
    };

    console.log('📤 [PAGOS-FECHA] Enviando respuesta al frontend con nombres:', JSON.stringify(responseData.data.pagados.slice(0, 2).map(a => a.nombreCompleto), null, 2));

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error en pagos-fecha:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

