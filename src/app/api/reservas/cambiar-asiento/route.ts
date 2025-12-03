import { NextRequest, NextResponse } from 'next/server';
import { ReservaModel } from '@/lib/models/ReservaModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asiento_actual, asiento_nuevo, alumno_ref, precio, zona } = body;

    if (!asiento_actual || !asiento_actual.fila || !asiento_actual.asiento) {
      return NextResponse.json({
        success: false,
        message: 'El asiento actual es requerido'
      }, { status: 400 });
    }

    if (!asiento_nuevo || !asiento_nuevo.fila || !asiento_nuevo.asiento) {
      return NextResponse.json({
        success: false,
        message: 'El nuevo asiento es requerido'
      }, { status: 400 });
    }

    if (!alumno_ref) {
      return NextResponse.json({
        success: false,
        message: 'El número de control del alumno es requerido'
      }, { status: 400 });
    }

    if (!precio) {
      return NextResponse.json({
        success: false,
        message: 'El precio es requerido'
      }, { status: 400 });
    }

    if (!zona) {
      return NextResponse.json({
        success: false,
        message: 'La zona es requerida'
      }, { status: 400 });
    }

    const reservaModel = new ReservaModel();
    const result = await reservaModel.cambiarAsiento(
      { fila: asiento_actual.fila, asiento: asiento_actual.asiento },
      { fila: asiento_nuevo.fila, asiento: asiento_nuevo.asiento },
      parseInt(alumno_ref),
      parseFloat(precio),
      zona
    );
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error al cambiar asiento:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

