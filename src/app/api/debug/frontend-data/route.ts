import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { alumno_ref, clave } = await request.json();
    
    if (!alumno_ref || !clave) {
      return NextResponse.json({
        success: false,
        message: 'Faltan parámetros alumno_ref o clave'
      });
    }

    console.log('🔍 Debug Frontend Data - Simulando login completo...');

    // Simular el proceso completo de login como lo haría el frontend
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alumno_ref: alumno_ref,
        clave: clave,
      }),
    });

    const result = await response.json();
    
    console.log('📊 Respuesta del endpoint de login:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      console.log('✅ Login exitoso desde frontend');
      console.log('👥 Datos que recibiría el frontend:', result.data);
      console.log('📏 Cantidad de hermanos que recibiría:', Array.isArray(result.data) ? result.data.length : 'No es array');
      
      if (Array.isArray(result.data)) {
        result.data.forEach((hermano: { nombre: string; control: number }, index: number) => {
          console.log(`  ${index + 1}. ${hermano.nombre} (Control: ${hermano.control})`);
        });
      }

      // Simular lo que haría useAuth
      const userData = {
        alumnoRef: parseInt(alumno_ref),
        alumnoNombre: '',
        hermanos: result.data,
      };

      console.log('📱 userData que se guardaría en localStorage:', JSON.stringify(userData, null, 2));
      console.log('👥 hermanos.length:', userData.hermanos.length);
    } else {
      console.log('❌ Login fallido desde frontend:', result.message);
    }

    return NextResponse.json({
      success: true,
      debug: {
        input: { alumno_ref, clave },
        loginResponse: result,
        hermanosCount: Array.isArray(result.data) ? result.data.length : 0,
        hermanosData: result.data,
        userDataSimulation: result.success ? {
          alumnoRef: parseInt(alumno_ref),
          alumnoNombre: '',
          hermanos: result.data,
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error en debug frontend data:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
