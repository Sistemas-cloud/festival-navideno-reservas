# 🎄 INSTRUCCIONES FINALES - Migración a Supabase Completada

## ✅ Estado Actual

- ✅ **Código migrado** a Supabase
- ✅ **Conexión verificada** 
- ✅ **2,260 alumnos** ya en la base de datos
- ⚠️  **Faltan 3 tablas** por crear

---

## 🚨 PASO CRÍTICO: Crear Tablas en Supabase

### 1️⃣ Ve al SQL Editor de Supabase

1. Abre tu navegador y ve a: https://app.supabase.com
2. Entra a tu proyecto (nmxrccrbnoenkahefrrw)
3. En el menú lateral izquierdo, haz clic en **"SQL Editor"** (ícono de código)
4. Haz clic en **"New query"**

### 2️⃣ Copia y Ejecuta el Script

1. Abre el archivo: `supabase-schema.sql` (está en la raíz del proyecto)
2. Copia **TODO** el contenido
3. Pégalo en el editor SQL de Supabase
4. Haz clic en el botón **"Run"** (▶️) en la esquina inferior derecha

**Deberías ver:**
```
Success. No rows returned
```

### 3️⃣ Verifica que se Crearon las Tablas

Ejecuta esta query en el SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Deberías ver:**
- ✅ alumno
- ✅ alumno_detalles
- ✅ alumno_familiar
- ✅ datos_facturacion
- ✅ reservas

---

## 📝 PASO 2: Crear Datos de Prueba

Necesitas agregar contraseñas para poder hacer login. Ejecuta esto en el SQL Editor:

```sql
-- Contraseña maestra que funciona para TODOS los alumnos
-- Ya está programada en el código: 2671

-- O puedes crear contraseñas específicas para algunos alumnos:
-- Primero encuentra algunos alumno_id:
SELECT alumno_id, alumno_ref, alumno_nombre, alumno_app 
FROM alumno 
LIMIT 5;

-- Luego agrega contraseñas (reemplaza los IDs con los que obtuviste):
INSERT INTO alumno_detalles (alumno_id, alumno_clave) VALUES
  (1, 1234),
  (2, 1234),
  (3, 1234)
ON CONFLICT (alumno_id) DO UPDATE SET alumno_clave = EXCLUDED.alumno_clave;
```

**Para hacer login:**
- Usa cualquier `alumno_ref` de la tabla alumno
- Contraseña: `2671` (maestra, funciona con todos)
- O la contraseña específica que asignaste (ej: `1234`)

---

## 🖥️ PASO 3: Probar Localmente

### Verificar Conexión
```bash
cd /home/sistemam/Escritorio/festival-navideno-reservas
node verify-supabase.js
```

**Deberías ver:**
```
✅ Tabla "alumno" accesible
✅ Tabla "alumno_detalles" accesible
✅ Tabla "alumno_familiar" accesible
✅ Tabla "reservas" accesible
✅ Total de alumnos: 2260
```

### Iniciar la Aplicación
```bash
npm run dev
```

Visita: http://localhost:3000

**Probar login:**
1. Busca un número de control en Supabase:
   ```sql
   SELECT alumno_ref FROM alumno LIMIT 1;
   ```
2. Usa ese número de control
3. Contraseña: `2671`

---

## ☁️ PASO 4: Configurar Vercel (Para Producción)

### 1️⃣ Agregar Variables de Entorno en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto: **wiston-festival-navideno**
3. Ve a **Settings** (Configuración)
4. Haz clic en **Environment Variables** en el menú lateral

### 2️⃣ Agrega estas 6 variables:

Haz clic en **"Add New"** para cada una:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nmxrccrbnoenkahefrrw.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teHJjY3Jibm9lbmthaGVmcnJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1MTg0OCwiZXhwIjoyMDY5NzI3ODQ4fQ._SIR3rmq7TWukuym30cCP4BAKGe-dhnillDV0Bz6Hf0` |
| `JWT_SECRET` | `festival-navideno-jwt-secret-2024-secure` |
| `SESSION_SECRET` | `festival-session-secret-2024-secure` |
| `NEXTAUTH_URL` | `https://wiston-festival-navideno.vercel.app` |
| `NEXTAUTH_SECRET` | `festival-nextauth-secret-2024-secure` |

**⚠️ IMPORTANTE:** Para cada variable, selecciona los 3 ambientes:
- ✅ Production
- ✅ Preview
- ✅ Development

### 3️⃣ Hacer Re-deploy

1. Ve a la pestaña **"Deployments"**
2. En el último deployment (el más reciente), haz clic en los **tres puntos** (⋮)
3. Selecciona **"Redeploy"**
4. Confirma con **"Redeploy"**

Espera 1-2 minutos...

### 4️⃣ Verificar que Funciona

Visita: https://wiston-festival-navideno.vercel.app

O prueba el endpoint de salud:
```bash
curl https://wiston-festival-navideno.vercel.app/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

---

## 🎯 Checklist Final

- [ ] ✅ Ejecutar `supabase-schema.sql` en Supabase SQL Editor
- [ ] ✅ Verificar que las 5 tablas existen
- [ ] ✅ Crear datos de prueba (contraseñas)
- [ ] ✅ Ejecutar `node verify-supabase.js` localmente
- [ ] ✅ Probar login local con contraseña maestra `2671`
- [ ] ✅ Agregar 6 variables de entorno en Vercel
- [ ] ✅ Hacer Redeploy en Vercel
- [ ] ✅ Probar https://wiston-festival-navideno.vercel.app

---

## 📚 Archivos Importantes Creados

1. **`supabase-schema.sql`** - Script para crear las tablas
2. **`src/lib/supabase.ts`** - Cliente de Supabase configurado
3. **`src/lib/models/AuthModel.ts`** - Autenticación migrada
4. **`src/lib/models/ReservaModel.ts`** - Reservas migradas
5. **`verify-supabase.js`** - Script de verificación
6. **`config.env`** - Variables de entorno locales
7. **`SUPABASE_SETUP.md`** - Guía detallada completa

---

## 🆘 Solución de Problemas

### "relation does not exist"
→ Ejecuta el script `supabase-schema.sql` en Supabase

### "Contraseña incorrecta"
→ Usa la contraseña maestra: `2671`

### Error 500 en Vercel
→ Verifica que agregaste todas las variables de entorno

### "Invalid API key"
→ Verifica que usaste el `SUPABASE_SERVICE_ROLE_KEY` correcto

### Sigue sin funcionar
```bash
# Verificar localmente primero
node verify-supabase.js

# Ver logs en Vercel
# Ve a tu proyecto → Functions → Ver logs en tiempo real
```

---

## 🎉 ¡Ya Casi!

Solo necesitas ejecutar el script SQL en Supabase y configurar Vercel.

**Tiempo estimado:** 5-10 minutos

**¿Listo?** Ejecuta el script SQL ahora y luego prueba la aplicación! 🚀

---

**📞 Recuerda:**
- Contraseña maestra para pruebas: `2671`
- URL local: http://localhost:3000
- URL producción: https://wiston-festival-navideno.vercel.app

