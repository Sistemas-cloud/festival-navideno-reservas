#!/usr/bin/env node

// Script de verificación de conexión a Supabase
require('dotenv').config({ path: './config.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verificando conexión a Supabase...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarConexion() {
  try {
    console.log('📡 Conectando a:', supabaseUrl);
    
    // Verificar tabla alumno
    console.log('\n1️⃣  Verificando tabla "alumno"...');
    const { data: alumnos, error: alumnoError } = await supabase
      .from('alumno')
      .select('*')
      .limit(1);
    
    if (alumnoError) {
      console.error('   ❌ Error:', alumnoError.message);
    } else {
      console.log('   ✅ Tabla "alumno" accesible');
      console.log('   📊 Registros encontrados:', alumnos ? alumnos.length : 0);
    }

    // Verificar tabla alumno_detalles
    console.log('\n2️⃣  Verificando tabla "alumno_detalles"...');
    const { data: detalles, error: detallesError } = await supabase
      .from('alumno_detalles')
      .select('*')
      .limit(1);
    
    if (detallesError) {
      console.error('   ❌ Error:', detallesError.message);
      if (detallesError.code === '42P01') {
        console.error('   💡 Tabla no existe. Ejecuta el script supabase-schema.sql');
      }
    } else {
      console.log('   ✅ Tabla "alumno_detalles" accesible');
      console.log('   📊 Registros encontrados:', detalles ? detalles.length : 0);
    }

    // Verificar tabla alumno_familiar
    console.log('\n3️⃣  Verificando tabla "alumno_familiar"...');
    const { data: familiar, error: familiarError } = await supabase
      .from('alumno_familiar')
      .select('*')
      .limit(1);
    
    if (familiarError) {
      console.error('   ❌ Error:', familiarError.message);
      if (familiarError.code === '42P01') {
        console.error('   💡 Tabla no existe. Ejecuta el script supabase-schema.sql');
      }
    } else {
      console.log('   ✅ Tabla "alumno_familiar" accesible');
      console.log('   📊 Registros encontrados:', familiar ? familiar.length : 0);
    }

    // Verificar tabla reservas
    console.log('\n4️⃣  Verificando tabla "reservas"...');
    const { data: reservas, error: reservasError } = await supabase
      .from('reservas')
      .select('*')
      .limit(1);
    
    if (reservasError) {
      console.error('   ❌ Error:', reservasError.message);
      if (reservasError.code === '42P01') {
        console.error('   💡 Tabla no existe. Ejecuta el script supabase-schema.sql');
      }
    } else {
      console.log('   ✅ Tabla "reservas" accesible');
      console.log('   📊 Registros encontrados:', reservas ? reservas.length : 0);
    }

    // Contar total de alumnos
    console.log('\n5️⃣  Contando alumnos totales...');
    const { count, error: countError } = await supabase
      .from('alumno')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('   ❌ Error:', countError.message);
    } else {
      console.log('   ✅ Total de alumnos:', count);
    }

    console.log('\n✅ Verificación completada!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Si faltan tablas, ejecuta: supabase-schema.sql en Supabase SQL Editor');
    console.log('   2. Agrega datos de prueba o migra tus datos existentes');
    console.log('   3. Ejecuta: npm run dev');
    console.log('   4. Visita: http://localhost:3000');

  } catch (error) {
    console.error('\n❌ Error general:', error.message);
    process.exit(1);
  }
}

verificarConexion();

