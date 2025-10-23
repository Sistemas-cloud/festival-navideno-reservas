import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/lib/models/AuthModel';

export async function POST(request: NextRequest) {
  try {
    const { alumno_ref, clave } = await request.json();
    
    if (!alumno_ref || !clave) {
      return NextResponse.json({
        success: false,
        message: 'Faltan parámetros alumno_ref o clave'
      });
    }

    console.log('🔍 Debug Login Data - Iniciando...');
    console.log('📝 Parámetros recibidos:', { alumno_ref, clave });

    const authModel = new AuthModel();
    const result = await authModel.authenticate(parseInt(alumno_ref), clave);

    console.log('📊 Resultado completo del AuthModel:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      console.log('✅ Login exitoso');
      console.log('👥 Datos de hermanos recibidos:', result.data);
      console.log('📏 Cantidad de hermanos:', Array.isArray(result.data) ? result.data.length : 'No es array');
      
      if (Array.isArray(result.data)) {
        result.data.forEach((hermano: { nombre: string; control: number }, index: number) => {
          console.log(`  ${index + 1}. ${hermano.nombre} (Control: ${hermano.control})`);
        });
      }
    } else {
      console.log('❌ Login fallido:', result.message);
    }

    return NextResponse.json({
      success: true,
      debug: {
        input: { alumno_ref, clave },
        authResult: result,
        hermanosCount: Array.isArray(result.data) ? result.data.length : 0,
        hermanosData: result.data
      }
    });

  } catch (error) {
    console.error('❌ Error en debug login data:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
