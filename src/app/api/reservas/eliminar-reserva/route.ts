import { NextRequest, NextResponse } from 'next/server';
import { ReservaModel } from '@/lib/models/ReservaModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asientos, alumno_ref } = body;

    if (!asientos || !Array.isArray(asientos) || asientos.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Los asientos son requeridos'
      }, { status: 400 });
    }

    if (!alumno_ref) {
      return NextResponse.json({
        success: false,
        message: 'El número de control del alumno es requerido'
      }, { status: 400 });
    }

    const reservaModel = new ReservaModel();
    const result = await reservaModel.eliminarReserva(asientos, parseInt(alumno_ref));
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
