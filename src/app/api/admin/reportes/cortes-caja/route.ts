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

export async function GET(req: NextRequest) {
  try {
    // Validar autorización
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // Obtener todas las reservas pagadas
    const { data: reservasTodas, error: reservasError } = await supabase
      .from('reservas')
      .select('referencia, nivel, precio, fecha_pago, estado')
      .eq('estado', 'pagado')
      .order('nivel', { ascending: true })
      .order('referencia', { ascending: true });

    if (reservasError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error obteniendo reservas', 
        detail: reservasError instanceof Error ? reservasError.message : String(reservasError) 
      }, { status: 500 });
    }

    // Filtrar usuarios internos (9001, 9002, 9003)
    const reservas = (reservasTodas || []).filter(r => 
      r.referencia !== 9001 && r.referencia !== 9002 && r.referencia !== 9003
    );

    if (!reservas || reservas.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No hay reservas pagadas para generar el corte de caja' 
      }, { status: 404 });
    }

    // Agrupar por función (nivel)
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
        reservas: []
      };
    }

    // Agrupar reservas por referencia (familia) y función
    const reservasPorFamilia: Record<string, {
      referencia: number;
      nivel: number;
      boletos: number;
      total: number;
      fechaPago: string | null;
    }> = {};

    for (const reserva of reservas) {
      const key = `${reserva.referencia}-${reserva.nivel}`;
      if (!reservasPorFamilia[key]) {
        reservasPorFamilia[key] = {
          referencia: reserva.referencia,
          nivel: reserva.nivel,
          boletos: 0,
          total: 0,
          fechaPago: reserva.fecha_pago
        };
      }
      reservasPorFamilia[key].boletos += 1;
      reservasPorFamilia[key].total += Number(reserva.precio) || 0;
    }

    // Obtener nombres de alumnos
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

    // Agregar a cortes por función
    for (const familia of Object.values(reservasPorFamilia)) {
      const funcion = familia.nivel;
      if (cortesPorFuncion[funcion]) {
        cortesPorFuncion[funcion].totalBoletos += familia.boletos;
        cortesPorFuncion[funcion].totalRecaudado += familia.total;
        cortesPorFuncion[funcion].familias += 1;
        cortesPorFuncion[funcion].reservas.push({
          referencia: familia.referencia,
          nombre: nombresMap.get(familia.referencia) || `Control ${familia.referencia}`,
          boletos: familia.boletos,
          total: familia.total,
          fechaPago: familia.fechaPago
        });
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

