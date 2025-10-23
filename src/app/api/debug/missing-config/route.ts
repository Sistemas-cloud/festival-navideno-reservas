import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Verificando configuración faltante...');
    
    const requiredVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    const missingVars = [];
    const presentVars = [];

    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value || value.trim() === '') {
        missingVars.push(key);
      } else {
        presentVars.push(key);
      }
    }

    const configStatus = {
      status: missingVars.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
      missing: missingVars,
      present: presentVars,
      total: Object.keys(requiredVars).length,
      configured: presentVars.length,
      missingCount: missingVars.length
    };

    console.log('📊 Estado de configuración:', configStatus);

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Configuración incompleta',
        data: {
          ...configStatus,
          instructions: {
            step1: 'Ve a Vercel Dashboard → Settings → Environment Variables',
            step2: 'Agrega las variables faltantes',
            step3: 'Haz redeploy del proyecto',
            missingVars: missingVars.map(varName => ({
              name: varName,
              description: varName === 'NEXT_PUBLIC_SUPABASE_URL' 
                ? 'URL de tu proyecto Supabase (ej: https://tu-proyecto.supabase.co)'
                : 'Service Role Key de Supabase (clave larga que empieza con eyJ)',
              whereToGet: varName === 'NEXT_PUBLIC_SUPABASE_URL'
                ? 'Supabase Dashboard → Settings → API → Project URL'
                : 'Supabase Dashboard → Settings → API → service_role key'
            }))
          }
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración completa',
      data: configStatus
    });

  } catch (error) {
    console.error('💥 Error verificando configuración:', error);
    return NextResponse.json({
      success: false,
      message: 'Error verificando configuración',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
