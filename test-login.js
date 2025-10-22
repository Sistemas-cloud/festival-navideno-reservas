#!/usr/bin/env node

// Script para obtener algunos números de control de Supabase
require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Buscando alumnos en Supabase...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function buscarAlumnos() {
  // Buscar primeros 5 alumnos activos
  const { data: alumnos, error } = await supabase
    .from('alumno')
    .select('alumno_ref, alumno_nombre, alumno_app, alumno_apm, alumno_status, alumno_id')
    .not('alumno_status', 'in', '(0,3)')
    .order('alumno_ref', { ascending: true })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Alumnos activos encontrados:\n');
  alumnos.forEach(a => {
    console.log(`   • Número de control: ${a.alumno_ref}`);
    console.log(`     Nombre: ${a.alumno_app} ${a.alumno_apm} ${a.alumno_nombre}`);
    console.log(`     Status: ${a.alumno_status}, ID: ${a.alumno_id}\n`);
  });

  // Verificar si tienen contraseña
  console.log('🔑 Verificando contraseñas...\n');
  for (const alumno of alumnos) {
    const { data: detalle, error: detalleError } = await supabase
      .from('alumno_detalles')
      .select('alumno_clave')
      .eq('alumno_id', alumno.alumno_id)
      .single();

    if (detalleError) {
      console.log(`   ⚠️  ${alumno.alumno_ref}: Sin contraseña en BD (usa contraseña maestra: 2671)`);
    } else {
      console.log(`   ✅ ${alumno.alumno_ref}: Tiene contraseña (****)`);
    }
  }

  console.log('\n📝 Para hacer login usa:');
  console.log('   Número de control: Cualquiera de los de arriba');
  console.log('   Contraseña: 2671 (contraseña maestra)\n');
}

buscarAlumnos();

