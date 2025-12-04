import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayInMonterrey, parseDateString } from '@/lib/utils/timezone';
import { validateAdminCredentials, type AdminUser } from '@/lib/config/adminUsers';

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

export async function POST(req: NextRequest) {
  try {
    const auth = isAuthorized(req);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }
    const supabase = getSupabaseClient();

    const body = await req.json();
    const controlMenorRaw = body?.control_menor;
    const controlMayorRaw = body?.control_mayor;
    const realizarCanje: boolean = Boolean(body?.realizar_canje);

    if (!controlMenorRaw || !controlMayorRaw) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros' }, { status: 400 });
    }

    const controlMenor = parseInt(String(controlMenorRaw), 10);
    const controlMayor = parseInt(String(controlMayorRaw), 10);
    if (Number.isNaN(controlMenor) || Number.isNaN(controlMayor)) {
      return NextResponse.json({ success: false, message: 'Controles inválidos' }, { status: 400 });
    }

    // Solo aplica para funciones 2 y 3 (en reservas.nivel se guarda la función)
    const funcionesValidas = [2, 3];

    // Traer TODAS las reservas del hermano menor (sin filtrar por función) para calcular el precio total
    // Incluir tanto reservadas como pagadas para calcular el precio correctamente
    const { data: reservasMenorTodas, error: errMenorTodas } = await supabase
      .from('reservas')
      .select('id, referencia, fila, asiento, nivel, precio, estado, fecha_pago')
      .eq('referencia', controlMenor)
      .in('estado', ['reservado', 'pagado']);

    if (errMenorTodas) {
      return NextResponse.json({ success: false, message: 'Error cargando reservas menor', detail: errMenorTodas.message }, { status: 500 });
    }

    // VALIDACIÓN CRÍTICA: El hermano menor DEBE tener boletos pagados para poder hacer el canje
    const reservasMenorPagadas = (reservasMenorTodas || []).filter(r => r.estado === 'pagado');
    if (!reservasMenorPagadas || reservasMenorPagadas.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'El hermano menor no tiene boletos pagados. Solo se puede realizar el canje cuando el hermano menor tiene boletos pagados.' 
      }, { status: 400 });
    }

    // Traer TODAS las reservas del hermano mayor (sin filtrar por función) para calcular el precio total
    // Incluir tanto reservadas como pagadas para calcular el precio correctamente
    const { data: reservasMayorTodas, error: errMayorTodas } = await supabase
      .from('reservas')
      .select('id, referencia, fila, asiento, nivel, precio, estado, fecha_pago')
      .eq('referencia', controlMayor)
      .in('estado', ['reservado', 'pagado']);

    if (errMayorTodas) {
      return NextResponse.json({ success: false, message: 'Error cargando reservas mayor', detail: errMayorTodas.message }, { status: 500 });
    }

    // Separar boletos del hermano mayor en pagados y reservados
    const reservasMayorPagadas = (reservasMayorTodas || []).filter(r => r.estado === 'pagado');
    const reservasMayorReservadas = (reservasMayorTodas || []).filter(r => r.estado === 'reservado');

    // Filtrar solo las reservas de funciones 2 y 3 del hermano mayor para el canje
    // Solo considerar reservas en estado 'reservado' para el canje
    const reservasMayorCanje = reservasMayorReservadas.filter(r => 
      funcionesValidas.includes(r.nivel)
    );

    // Verificar que el hermano mayor tenga al menos una reserva en función 2 o 3 (reservada) para permitir el canje
    if (!reservasMayorCanje || reservasMayorCanje.length === 0) {
      return NextResponse.json({ success: false, message: 'El hermano mayor no tiene reservas aplicables (función 2 o 3) en estado reservado para realizar el canje.' }, { status: 400 });
    }

    // VALIDACIÓN: Verificar que la fecha de pago coincida con el día actual (solo si se va a realizar el canje)
    if (realizarCanje) {
      const today = getTodayInMonterrey();
      const fechaPagoReserva = reservasMayorCanje[0].fecha_pago;
      
      if (!fechaPagoReserva) {
        return NextResponse.json({ 
          success: false, 
          message: 'Las reservas del hermano mayor no tienen fecha de pago asignada. No se puede procesar el canje.' 
        }, { status: 400 });
      }

      // Comparar fechas (solo día, sin hora)
      const fechaPago = parseDateString(fechaPagoReserva);
      const fechaPagoTime = fechaPago.getTime();
      const todayTime = today.getTime();

      if (fechaPagoTime !== todayTime) {
        // Formatear fecha para mostrar al usuario
        const fechaFormateada = fechaPago.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        return NextResponse.json({ 
          success: false, 
          message: `La fecha de pago asignada es el ${fechaFormateada}. Solo se puede procesar el canje en esa fecha.` 
        }, { status: 400 });
      }
    }

    // Calcular totales: ambos incluyen TODAS sus reservas (funciones 1, 2 y 3)
    const totalMenor = (reservasMenorTodas || []).reduce((acc, r) => acc + (Number(r.precio) || 0), 0);
    const totalMayor = (reservasMayorTodas || []).reduce((acc, r) => acc + (Number(r.precio) || 0), 0);
    
    // Calcular montos separados del hermano mayor: pagados y reservados
    const totalMayorPagados = reservasMayorPagadas.reduce((acc, r) => acc + (Number(r.precio) || 0), 0);
    const totalMayorReservados = reservasMayorReservadas.reduce((acc, r) => acc + (Number(r.precio) || 0), 0);
    
    const diferencia = totalMayor - totalMenor;

    // Ordenar reservas del mayor para elegir el "primer" boleto de forma estable (por id asc)
    // Solo usar las reservas de funciones 2 y 3 para el canje
    const ordenMayor = [...reservasMayorCanje].sort((a, b) => (a.id as number) - (b.id as number));

    // Preparar actualizaciones
    let updates: Array<{ id: number; precio: number }>; 
    if (diferencia > 0) {
      updates = ordenMayor.map((r, idx) => ({ id: r.id as number, precio: idx === 0 ? diferencia : 0 }));
    } else {
      updates = ordenMayor.map((r) => ({ id: r.id as number, precio: 0 }));
    }

    // Si se solicita realizar el canje completo
    let pagos: { pagados_mayor: number } | undefined;
    if (realizarCanje) {
      // Actualizar en DB: por simplicidad, una a una (si se requiere, se puede optimizar con RPC)
      for (const u of updates) {
        const { error: upErr } = await supabase
          .from('reservas')
          .update({ precio: u.precio })
          .eq('id', u.id)
          .eq('estado', 'reservado');
        if (upErr) {
          return NextResponse.json({ success: false, message: 'Error actualizando reservas', detail: upErr.message }, { status: 500 });
        }
      }

      // Marcar como pagado SOLO reservas del hermano mayor
      let pagadosMayor = 0;
      if (ordenMayor.length > 0) {
        const { error: payErrMayor } = await supabase
          .from('reservas')
          .update({ estado: 'pagado' })
          .in('id', ordenMayor.map(r => r.id));
        if (payErrMayor) {
          return NextResponse.json({ success: false, message: 'Error marcando pagado (mayor)', detail: payErrMayor.message }, { status: 500 });
        }
        pagadosMayor = ordenMayor.length;
      }
      pagos = { pagados_mayor: pagadosMayor };
    }

    return NextResponse.json({
      success: true,
      data: {
        control_menor: controlMenor,
        control_mayor: controlMayor,
        total_menor: totalMenor,
        total_mayor: totalMayor,
        total_mayor_pagados: totalMayorPagados,
        total_mayor_reservados: totalMayorReservados,
        boletos_mayor_pagados: reservasMayorPagadas.length,
        boletos_mayor_reservados: reservasMayorReservadas.length,
        diferencia: diferencia,
        diferencia_aplicada: Math.max(0, diferencia),
        reglas: {
          aplica_funciones: [2, 3],
          si_diferencia_positiva: 'primer boleto del mayor (funciones 2 o 3) = diferencia, demás = 0',
          si_diferencia_no_positiva: 'todos los boletos del mayor (funciones 2 o 3) = 0',
          nota: 'Los precios de ambos hermanos incluyen TODAS sus reservas (funciones 1, 2 y 3). El canje solo se aplica a reservas de funciones 2 y 3 del hermano mayor.',
        },
        updates,
        realizar_canje: realizarCanje,
        pagos,
      }
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ success: false, message: 'Error inesperado', detail: errorMessage }, { status: 500 });
  }
}


