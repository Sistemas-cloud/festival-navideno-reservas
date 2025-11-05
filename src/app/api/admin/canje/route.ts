import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function isAuthorized(req: NextRequest): boolean {
  const user = req.headers.get('x-admin-user');
  const pass = req.headers.get('x-admin-pass');
  return user === 'admin' && pass === 'Admin2025.';
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

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

    // Traer reservas activas de ambos
    const { data: reservasMenor, error: errMenor } = await supabase
      .from('reservas')
      .select('id, referencia, fila, asiento, nivel, precio, estado')
      .eq('referencia', controlMenor)
      .in('nivel', funcionesValidas)
      .eq('estado', 'reservado');

    if (errMenor) {
      return NextResponse.json({ success: false, message: 'Error cargando reservas menor', detail: errMenor.message }, { status: 500 });
    }

    const { data: reservasMayor, error: errMayor } = await supabase
      .from('reservas')
      .select('id, referencia, fila, asiento, nivel, precio, estado')
      .eq('referencia', controlMayor)
      .in('nivel', funcionesValidas)
      .eq('estado', 'reservado');

    if (errMayor) {
      return NextResponse.json({ success: false, message: 'Error cargando reservas mayor', detail: errMayor.message }, { status: 500 });
    }

    if (!reservasMayor || reservasMayor.length === 0) {
      return NextResponse.json({ success: false, message: 'El hermano mayor no tiene reservas aplicables (función 2 o 3).' }, { status: 400 });
    }

    const totalMenor = (reservasMenor || []).reduce((acc, r) => acc + (Number(r.precio) || 0), 0);
    const totalMayor = (reservasMayor || []).reduce((acc, r) => acc + (Number(r.precio) || 0), 0);
    const diferencia = totalMayor - totalMenor;

    // Ordenar reservas del mayor para elegir el "primer" boleto de forma estable (por id asc)
    const ordenMayor = [...(reservasMayor || [])].sort((a, b) => (a.id as number) - (b.id as number));

    // Preparar actualizaciones
    let updates: Array<{ id: number; precio: number }>; 
    if (diferencia > 0) {
      const firstId = ordenMayor[0].id as number;
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
        diferencia: diferencia,
        diferencia_aplicada: Math.max(0, diferencia),
        reglas: {
          aplica_funciones: [2, 3],
          si_diferencia_positiva: 'primer boleto del mayor = diferencia, demás = 0',
          si_diferencia_no_positiva: 'todos los boletos del mayor = 0',
        },
        updates,
        realizar_canje: realizarCanje,
        pagos,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: 'Error inesperado', detail: e?.message }, { status: 500 });
  }
}


