import { NextRequest, NextResponse } from 'next/server';
import { ReservaModel } from '@/lib/models/ReservaModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idAlumno } = body;

    if (!idAlumno) {
      return NextResponse.json({
        success: false,
        message: 'ID del alumno es requerido'
      }, { status: 400 });
    }

    const reservaModel = new ReservaModel();
    const reservas = await reservaModel.getReservas(parseInt(idAlumno));
    
    return NextResponse.json(reservas);

  } catch (error) {
    console.error('Error al obtener reservas:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
