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
    const pagos = await reservaModel.getPagos(parseInt(idAlumno));
    
    return NextResponse.json(pagos);

  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
