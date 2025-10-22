# 🎄 INSTRUCCIONES - Migración Completa MySQL → Supabase

## 📋 RESUMEN

Este documento te guía para migrar **3 tablas** de MySQL a Supabase:
- ✅ `alumno` (ya migrada)
- ✅ `alumno_detalles` (nueva)
- ✅ `alumno_familiar` (nueva)

---

## 🚀 PASO 1: Ejecutar Schema SQL Completo en Supabase

### 1️⃣ Ve al SQL Editor de Supabase

1. Abre: https://app.supabase.com
2. Entra a tu proyecto: **nmxrccrbnoenkahefrrw**
3. Menú lateral → **SQL Editor** (ícono `</>`)
4. Click en **"New query"**

### 2️⃣ Ejecutar el Script

1. Abre el archivo: **`supabase-schema-completo.sql`**
2. Copia **TODO** el contenido (Ctrl+A, Ctrl+C)
3. Pega en el SQL Editor de Supabase
4. Click en **"Run"** ▶️ (esquina inferior derecha)

**Resultado esperado:**
```
Success. 
Query returned successfully in XXX ms.
```

### 3️⃣ Verificar Tablas Creadas

Ejecuta esta query en el SQL Editor:

```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name AND table_schema = 'public') as num_columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('alumno', 'alumno_detalles', 'alumno_familiar', 'reservas')
ORDER BY table_name;
```

**Resultado esperado:**
| table_name | num_columnas |
|------------|--------------|
| alumno | ~15 |
| alumno_detalles | 22 |
| alumno_familiar | 26 |
| reservas | 10 |

---

## 📦 PASO 2: Migrar Datos con PHP

### Opción A: Usar el Script desde el Navegador (Recomendado)

#### 1️⃣ Copiar el Script a tu Servidor

```bash
# Si tienes servidor web local (XAMPP, WAMP, etc.)
cp migrar-completo.php /ruta/a/tu/servidor/htdocs/
# O
cp migrar-completo.php /var/www/html/
```

#### 2️⃣ Abrir en el Navegador

```
http://localhost/migrar-completo.php
```

Verás una interfaz bonita con el progreso en tiempo real.

---

### Opción B: Ejecutar desde la Terminal

```bash
php migrar-completo.php
```

Verás el progreso en texto plano en la consola.

---

## ⏱️ TIEMPO ESTIMADO

- **alumno**: ~30 segundos (2,260 registros ya migrados, se actualizarán)
- **alumno_detalles**: ~10-20 segundos (dependiendo del número de registros)
- **alumno_familiar**: ~20-40 segundos (dependiendo del número de registros)

**Total**: ~1-2 minutos

---

## 📊 QUÉ HACE EL SCRIPT

### Para cada tabla:
1. ✅ Se conecta a MySQL local
2. ✅ Obtiene TODOS los registros
3. ✅ Limpia la tabla en Supabase (elimina datos anteriores)
4. ✅ Enriquece datos (solo para `alumno`: agrega `alumno_nombre_completo`)
5. ✅ Envía datos en lotes de 500 registros
6. ✅ Muestra progreso en tiempo real

---

## 🔧 CONFIGURACIÓN DEL SCRIPT

Si necesitas cambiar la configuración, edita `migrar-completo.php`:

```php
// Líneas 7-10: Configuración MySQL
$mysql_host = "localhost";
$mysql_user = "winston_richard";
$mysql_pass = "101605";
$mysql_db   = "winston_general"; // ⚠️ Cambia si tu BD tiene otro nombre

// Líneas 13-14: Configuración Supabase (ya está correcta)
$supabase_url = "https://nmxrccrbnoenkahefrrw.supabase.co";
$supabase_token = "eyJhbGciOiJIUzI1..."; // Service role key
```

---

## ✅ VERIFICAR MIGRACIÓN

### 1️⃣ En Supabase Dashboard

1. Ve a: https://app.supabase.com
2. Tu proyecto → **Table Editor**
3. Verifica cada tabla:
   - `alumno` → Debería tener ~2,260 registros
   - `alumno_detalles` → Registros de detalles
   - `alumno_familiar` → Registros de familiares

### 2️⃣ Con el Script de Verificación (Node.js)

```bash
cd /home/sistemam/Escritorio/festival-navideno-reservas
node verify-supabase.js
```

**Resultado esperado:**
```
✅ Tabla "alumno" accesible
   📊 Registros encontrados: 2260
✅ Tabla "alumno_detalles" accesible
   📊 Registros encontrados: XXXX
✅ Tabla "alumno_familiar" accesible
   📊 Registros encontrados: XXXX
✅ Tabla "reservas" accesible
   📊 Registros encontrados: 0
```

### 3️⃣ Con SQL en Supabase

```sql
-- Contar registros en cada tabla
SELECT 'alumno' as tabla, COUNT(*) as total FROM alumno
UNION ALL
SELECT 'alumno_detalles', COUNT(*) FROM alumno_detalles
UNION ALL
SELECT 'alumno_familiar', COUNT(*) FROM alumno_familiar
UNION ALL
SELECT 'reservas', COUNT(*) FROM reservas;
```

---

## 🧪 PROBAR LA APLICACIÓN

### 1️⃣ Probar Localmente

```bash
cd /home/sistemam/Escritorio/festival-navideno-reservas
npm run dev
```

Visita: http://localhost:3000

**Probar login:**
- Número de control: (cualquier `alumno_ref` de tu BD)
- Contraseña: `2671` (contraseña maestra)

### 2️⃣ Verificar Endpoint de Salud

```bash
curl http://localhost:3000/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### ❌ Error: "relation 'alumno_detalles' does not exist"
**Solución:** Ejecuta el script SQL completo en Supabase (Paso 1)

### ❌ Error PHP: "Access denied for user"
**Solución:** Verifica las credenciales MySQL en `migrar-completo.php`
```php
$mysql_user = "winston_richard";
$mysql_pass = "101605";
$mysql_db   = "winston_general";
```

### ❌ Error: "Unknown database"
**Solución:** Verifica el nombre de tu base de datos MySQL:
```bash
mysql -u winston_richard -p
# Dentro de MySQL:
SHOW DATABASES;
# Usa el nombre correcto en $mysql_db
```

### ❌ Error: "cURL error"
**Solución:** Verifica conexión a internet y que el token de Supabase sea correcto

### ❌ Error: "HTTP 400" al migrar
**Solución:** 
1. Verifica que las tablas existan en Supabase (Paso 1)
2. Ejecuta de nuevo el schema SQL completo
3. Intenta migrar nuevamente

### ⚠️ "Contraseña incorrecta" al hacer login
**Solución:** 
1. Usa la contraseña maestra: `2671`
2. O verifica que `alumno_detalles` tenga registros:
```sql
SELECT COUNT(*) FROM alumno_detalles;
```

---

## 📁 ARCHIVOS IMPORTANTES

```
festival-navideno-reservas/
├── supabase-schema-completo.sql   ← Script SQL para Supabase
├── migrar-completo.php            ← Script PHP para migrar datos
├── verify-supabase.js             ← Script de verificación
├── INSTRUCCIONES_MIGRACION_COMPLETA.md ← Este archivo
└── config.env                     ← Variables de entorno (ya configuradas)
```

---

## 🎯 CHECKLIST COMPLETO

- [ ] ✅ Ejecutar `supabase-schema-completo.sql` en Supabase SQL Editor
- [ ] ✅ Verificar que las 4 tablas existen (alumno, alumno_detalles, alumno_familiar, reservas)
- [ ] ✅ Ejecutar `migrar-completo.php` (web o terminal)
- [ ] ✅ Verificar migración con `node verify-supabase.js`
- [ ] ✅ Probar login local: `npm run dev` → http://localhost:3000
- [ ] ✅ Configurar variables en Vercel (ver INSTRUCCIONES_FINALES.md)
- [ ] ✅ Hacer Redeploy en Vercel
- [ ] ✅ Probar producción: https://wiston-festival-navideno.vercel.app

---

## 📊 ESTRUCTURA FINAL

```
MySQL (Local)                    Supabase (Cloud)
┌─────────────────┐             ┌─────────────────┐
│ alumno          │  ─────────► │ alumno          │ ✅ Migrada
├─────────────────┤             ├─────────────────┤
│ alumno_detalles │  ─────────► │ alumno_detalles │ ✅ Migrada
├─────────────────┤             ├─────────────────┤
│ alumno_familiar │  ─────────► │ alumno_familiar │ ✅ Migrada
└─────────────────┘             └─────────────────┘
                                 ┌─────────────────┐
                                 │ reservas        │ ✅ Vacía (se llenará con uso)
                                 └─────────────────┘
```

---

## 🎉 ¡LISTO!

Una vez completados estos pasos:
- ✅ Todas las tablas estarán en Supabase
- ✅ La aplicación funcionará localmente
- ✅ Solo falta configurar Vercel para producción

**Tiempo total estimado:** ~10 minutos

---

## 📞 NOTAS IMPORTANTES

1. **Backup**: El script VACÍA las tablas en Supabase antes de migrar. Asegúrate de que eso es lo que quieres.

2. **Contraseña maestra**: `2671` funciona con cualquier alumno (útil para testing)

3. **Datos sensibles**: El script respeta charset UTF-8 para nombres con acentos y caracteres especiales

4. **Integridad**: Las foreign keys están configuradas para mantener integridad referencial

5. **Timestamps**: Los campos de fecha/hora se preservan de MySQL a PostgreSQL

---

**¿Listo para empezar?** Ejecuta primero el Paso 1 (SQL) y luego el Paso 2 (PHP) 🚀

