import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/lib/models/AuthModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alumno_ref, clave } = body;

    if (!alumno_ref || !clave) {
      return NextResponse.json({
        success: false,
        message: 'Número de control y contraseña son requeridos'
      }, { status: 400 });
    }

    const authModel = new AuthModel();
    const result = await authModel.authenticate(
      parseInt(alumno_ref),
      parseInt(clave)
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
