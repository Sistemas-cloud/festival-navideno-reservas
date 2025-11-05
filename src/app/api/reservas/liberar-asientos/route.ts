import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { isPaymentDatePassed } from '@/lib/utils/paymentDates';

/**
 * Endpoint para liberar automáticamente asientos cuya fecha de pago ya pasó
 * Este endpoint puede ser llamado periódicamente por un cron job o manualmente
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    console.log('🔓 Iniciando proceso de liberación automática de asientos...');
    
    // Obtener todas las reservas que aún no están pagadas
    const { data: reservasPendientes, error: fetchError } = await supabase
      .from('reservas')
      .select('id, fila, asiento, nivel, referencia, fecha_pago, estado')
      .eq('estado', 'reservado');

    if (fetchError) {
      console.error('❌ Error al obtener reservas pendientes:', fetchError);
      return NextResponse.json({
        success: false,
        message: 'Error al obtener reservas pendientes'
      }, { status: 500 });
    }

    if (!reservasPendientes || reservasPendientes.length === 0) {
      console.log('✅ No hay reservas pendientes para verificar');
      return NextResponse.json({
        success: true,
        message: 'No hay reservas pendientes',
        liberados: 0
      });
    }

    console.log(`🔍 Verificando ${reservasPendientes.length} reservas pendientes...`);

    // Filtrar las reservas cuya fecha de pago ya pasó
    const reservasAVencer = reservasPendientes.filter(reserva => {
      if (!reserva.fecha_pago) {
        // Si no tiene fecha de pago, no se libera (debería tener una)
        return false;
      }
      return isPaymentDatePassed(reserva.fecha_pago);
    });

    if (reservasAVencer.length === 0) {
      console.log('✅ No hay reservas que necesiten liberación');
      return NextResponse.json({
        success: true,
        message: 'No hay reservas que necesiten liberación',
        liberados: 0,
        verificadas: reservasPendientes.length
      });
    }

    console.log(`🗑️ Se encontraron ${reservasAVencer.length} reservas a liberar`);

    // Obtener los IDs de las reservas a eliminar
    const idsALiberar = reservasAVencer.map(r => r.id);

    // Eliminar las reservas (liberar asientos)
    const { error: deleteError } = await supabase
      .from('reservas')
      .delete()
      .in('id', idsALiberar);

    if (deleteError) {
      console.error('❌ Error al liberar asientos:', deleteError);
      return NextResponse.json({
        success: false,
        message: 'Error al liberar asientos',
        error: deleteError.message
      }, { status: 500 });
    }

    console.log(`✅ ${reservasAVencer.length} asientos liberados exitosamente`);

    // Preparar detalles de las reservas liberadas para el log
    const detalles = reservasAVencer.map(r => ({
      fila: r.fila,
      asiento: r.asiento,
      nivel: r.nivel,
      referencia: r.referencia,
      fecha_pago: r.fecha_pago
    }));

    return NextResponse.json({
      success: true,
      message: `${reservasAVencer.length} asiento(s) liberado(s) exitosamente`,
      liberados: reservasAVencer.length,
      verificadas: reservasPendientes.length,
      detalles: detalles
    });

  } catch (error) {
    console.error('❌ Error en proceso de liberación:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Endpoint GET para verificar cuántas reservas están pendientes de liberación
 * Útil para monitoreo sin realizar la liberación
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Obtener todas las reservas que aún no están pagadas
    const { data: reservasPendientes, error: fetchError } = await supabase
      .from('reservas')
      .select('id, fila, asiento, nivel, referencia, fecha_pago, estado')
      .eq('estado', 'reservado');

    if (fetchError) {
      return NextResponse.json({
        success: false,
        message: 'Error al obtener reservas pendientes'
      }, { status: 500 });
    }

    if (!reservasPendientes || reservasPendientes.length === 0) {
      return NextResponse.json({
        success: true,
        pendientes: 0,
        listasParaLiberar: 0
      });
    }

    // Filtrar las reservas cuya fecha de pago ya pasó
    const reservasAVencer = reservasPendientes.filter(reserva => {
      if (!reserva.fecha_pago) return false;
      return isPaymentDatePassed(reserva.fecha_pago);
    });

    return NextResponse.json({
      success: true,
      totalPendientes: reservasPendientes.length,
      listasParaLiberar: reservasAVencer.length,
      detalles: reservasAVencer.map(r => ({
        fila: r.fila,
        asiento: r.asiento,
        nivel: r.nivel,
        fecha_pago: r.fecha_pago
      }))
    });

  } catch (error) {
    console.error('❌ Error al verificar reservas:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

