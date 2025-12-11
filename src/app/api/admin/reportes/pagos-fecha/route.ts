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
    const { data: alumnos, error: alumnosError } = await supabase
      .from('alumno')
      .select('alumno_ref, alumno_app, alumno_apm, alumno_nombre')
      .in('alumno_ref', referenciasUnicas);

    if (alumnosError) {
      console.error('Error al obtener alumnos:', alumnosError);
      // Continuar sin información de alumnos si hay error
    }

    // Crear mapa de alumnos por referencia
    const alumnosMap = new Map<number, { nombre: string; app: string; apm: string }>();
    if (alumnos) {
      alumnos.forEach(alumno => {
        alumnosMap.set(alumno.alumno_ref, {
          nombre: alumno.alumno_nombre || '',
          app: alumno.alumno_app || '',
          apm: alumno.alumno_apm || ''
        });
      });
    }

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
        const alumnoInfo = alumnosMap.get(grupo.referencia);
        const nombreCompleto = [
          alumnoInfo?.app || '',
          alumnoInfo?.apm || '',
          alumnoInfo?.nombre || ''
        ].filter(Boolean).join(' ').trim() || `Referencia ${grupo.referencia}`;

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
          total: grupo.total,
          cantidadBoletos: grupo.cantidadBoletos,
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

    return NextResponse.json({
      success: true,
      data: {
        pagados,
        pendientes,
        totalPagados: pagados.length,
        totalPendientes: pendientes.length,
        fechaPago
      }
    });

  } catch (error) {
    console.error('Error en pagos-fecha:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

