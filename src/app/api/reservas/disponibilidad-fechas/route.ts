import { NextRequest, NextResponse } from 'next/server';
import { ReservaModel } from '@/lib/models/ReservaModel';
import { isInternalUser, findInternalUser } from '@/lib/config/internalUsers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alumno_ref } = body;

    if (!alumno_ref) {
      return NextResponse.json({
        success: false,
        message: 'ID del alumno es requerido'
      }, { status: 400 });
    }

    const reservaModel = new ReservaModel();
    
    // Determinar la función del alumno
    let funcion: number;
    if (isInternalUser(parseInt(alumno_ref))) {
      const internalUser = findInternalUser(parseInt(alumno_ref));
      if (internalUser) {
        funcion = internalUser.funcion;
      } else {
        return NextResponse.json({
          success: false,
          message: 'Error al determinar función del usuario'
        }, { status: 400 });
      }
    } else {
      funcion = await reservaModel.getNivelAlumno(parseInt(alumno_ref));
    }

    const disponibilidad = await reservaModel.getPaymentDateAvailability(funcion);
    
    return NextResponse.json({
      success: true,
      funcion,
      disponibilidad
    });

  } catch (error) {
    console.error('Error al obtener disponibilidad de fechas:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

