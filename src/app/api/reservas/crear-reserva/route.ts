import { NextRequest, NextResponse } from 'next/server';
import { ReservaModel } from '@/lib/models/ReservaModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asientos, alumno_ref, hermanos_data, precio, zona } = body;

    if (!asientos || !alumno_ref || !precio || !zona) {
      return NextResponse.json({
        success: false,
        message: 'Datos de reserva incompletos'
      }, { status: 400 });
    }

    const reservaModel = new ReservaModel();
    const result = await reservaModel.crearReserva(
      asientos,
      parseInt(alumno_ref),
      hermanos_data || [],
      parseFloat(precio),
      zona
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        fila: asientos[0]?.fila,
        asiento: asientos[0]?.asiento,
        estado: 'reservado',
        alumno_ref: parseInt(alumno_ref)
      });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error) {
    console.error('Error al crear reserva:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
