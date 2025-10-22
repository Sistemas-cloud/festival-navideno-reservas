// Script para probar el login y diagnosticar problemas
const testLogin = async () => {
  const baseUrl = 'https://wiston-festival-navideno.vercel.app';
  
  console.log('🧪 Iniciando pruebas de diagnóstico...\n');

  // Test 1: Verificar variables de entorno
  console.log('1️⃣ Verificando variables de entorno...');
  try {
    const envResponse = await fetch(`${baseUrl}/api/debug/env`);
    const envData = await envResponse.json();
    console.log('✅ Variables de entorno:', envData.data);
  } catch (error) {
    console.log('❌ Error verificando variables:', error.message);
  }

  // Test 2: Verificar conexión con Supabase
  console.log('\n2️⃣ Verificando conexión con Supabase...');
  try {
    const supabaseResponse = await fetch(`${baseUrl}/api/debug/supabase`);
    const supabaseData = await supabaseResponse.json();
    console.log('✅ Conexión Supabase:', supabaseData);
  } catch (error) {
    console.log('❌ Error conectando con Supabase:', error.message);
  }

  // Test 3: Verificar datos en Supabase
  console.log('\n3️⃣ Verificando datos en Supabase...');
  try {
    const dataResponse = await fetch(`${baseUrl}/api/debug/check-data`);
    const dataResult = await dataResponse.json();
    console.log('✅ Datos en Supabase:', JSON.stringify(dataResult.data, null, 2));
  } catch (error) {
    console.log('❌ Error verificando datos:', error.message);
  }

  // Test 4: Probar login con datos de prueba
  console.log('\n4️⃣ Probando login con datos de prueba...');
  const testCredentials = [
    { alumno_ref: 12345, clave: '2671' }, // Contraseña maestra
    { alumno_ref: 11111, clave: '1234' }, // Posible alumno de prueba
    { alumno_ref: 22222, clave: '1234' }, // Posible alumno de prueba
  ];

  for (const cred of testCredentials) {
    try {
      console.log(`\n🔐 Probando: ${cred.alumno_ref} / ${cred.clave}`);
      const loginResponse = await fetch(`${baseUrl}/api/debug/test-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cred)
      });
      
      const loginData = await loginResponse.json();
      console.log(`📊 Resultado:`, loginData);
      
      if (loginData.success) {
        console.log('✅ ¡Login exitoso!');
        break;
      }
    } catch (error) {
      console.log('❌ Error en login:', error.message);
    }
  }

  // Test 5: Probar login real
  console.log('\n5️⃣ Probando login real...');
  try {
    const realLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alumno_ref: 12345, clave: '2671' })
    });
    
    const realLoginData = await realLoginResponse.json();
    console.log('📊 Login real:', realLoginData);
    console.log('📊 Status:', realLoginResponse.status);
  } catch (error) {
    console.log('❌ Error en login real:', error.message);
  }
};

// Ejecutar las pruebas
testLogin().catch(console.error);
