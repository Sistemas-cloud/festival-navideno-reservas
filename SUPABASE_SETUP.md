# 🎄 Guía de Configuración de Supabase

## ✅ Paso 1: Ejecutar el Script SQL en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, selecciona **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo `supabase-schema.sql`
5. Haz clic en **Run** (▶️) para ejecutar el script
6. Verifica que las tablas se crearon correctamente:
   - `alumno` (ya debe existir)
   - `alumno_detalles`
   - `alumno_familiar`
   - `reservas`
   - `datos_facturacion`

## ✅ Paso 2: Verificar la Tabla `alumno`

Asegúrate de que la tabla `alumno` tenga los siguientes campos:

```sql
-- Ejecuta esto en el SQL Editor para verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'alumno';
```

**Campos requeridos:**
- `alumno_id` (bigint o integer) - PRIMARY KEY
- `alumno_ref` (bigint o integer) - Número de control
- `alumno_app` (text/varchar) - Apellido paterno
- `alumno_apm` (text/varchar) - Apellido materno
- `alumno_nombre` (text/varchar) - Nombre
- `alumno_nivel` (integer) - Nivel escolar
- `alumno_grado` (integer) - Grado
- `alumno_status` (integer) - Estado (activo/inactivo)
- `alumno_ciclo_escolar` (integer) - Ciclo escolar

Si falta algún campo, agrégalo con:

```sql
-- Ejemplo para agregar campos faltantes
ALTER TABLE alumno ADD COLUMN IF NOT EXISTS alumno_ciclo_escolar INTEGER DEFAULT 21;
ALTER TABLE alumno ADD COLUMN IF NOT EXISTS alumno_status INTEGER DEFAULT 1;
```

## ✅ Paso 3: Crear Datos de Prueba (Opcional)

Si quieres probar la aplicación sin migrar todos los datos, crea algunos alumnos de prueba:

```sql
-- Alumno de prueba
INSERT INTO alumno (alumno_ref, alumno_app, alumno_apm, alumno_nombre, alumno_nivel, alumno_grado, alumno_status, alumno_ciclo_escolar)
VALUES (12345, 'García', 'López', 'Juan', 2, 3, 1, 21)
ON CONFLICT (alumno_id) DO NOTHING;

-- Obtener el alumno_id del alumno que acabas de crear
-- Suponiendo que el alumno_id es 1, agregar contraseña
INSERT INTO alumno_detalles (alumno_id, alumno_clave)
VALUES (1, 1234)
ON CONFLICT (alumno_id) DO UPDATE SET alumno_clave = 1234;

-- Agregar datos familiares
INSERT INTO alumno_familiar (alumno_id, familiar_app, familiar_apm, familiar_nombre, familiar_cel, familiar_curp, tutor_id)
VALUES (1, 'García', 'Pérez', 'María', '1234567890', 'GAPM800101HDFRRL01', 1)
ON CONFLICT DO NOTHING;
```

**Credenciales de prueba:**
- Número de control: `12345`
- Contraseña: `1234`

**O usa la contraseña maestra:**
- Contraseña maestra: `2671` (funciona con cualquier alumno)

## ✅ Paso 4: Migrar Datos Existentes (Si tienes MySQL local)

Si ya tienes datos en MySQL local, puedes migrarlos:

```bash
# 1. Exportar desde MySQL
mysqldump -u winston_richard -p winston_general alumno_detalles alumno_familiar reservas > export_data.sql

# 2. Convertir el formato MySQL a PostgreSQL (Supabase usa PostgreSQL)
# Puedes usar herramientas como: https://www.convert-in.com/mysql-to-postgres-converter.htm

# 3. O migrar usando scripts personalizados
```

**Opción alternativa: Usar Supabase CLI**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref nmxrccrbnoenkahefrrw

# Migrar datos
supabase db push
```

## ✅ Paso 5: Configurar Variables de Entorno Localmente

Ya están configuradas en `config.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nmxrccrbnoenkahefrrw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ✅ Paso 6: Configurar Variables de Entorno en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com)
2. Selecciona tu proyecto **wiston-festival-navideno**
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nmxrccrbnoenkahefrrw.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (el key completo) |
| `JWT_SECRET` | `festival-navideno-jwt-secret-2024-secure` |
| `SESSION_SECRET` | `festival-session-secret-2024-secure` |
| `NEXTAUTH_URL` | `https://wiston-festival-navideno.vercel.app` |
| `NEXTAUTH_SECRET` | `festival-nextauth-secret-2024-secure` |

5. Haz clic en **Save**
6. Ve a **Deployments** → Haz clic en los tres puntos (...) del último deployment
7. Selecciona **Redeploy** para aplicar las nuevas variables

## ✅ Paso 7: Verificar que Todo Funcione

### Localmente:
```bash
# Cargar variables de entorno y ejecutar
./start.sh

# O manualmente:
npm run dev
```

Visita: http://localhost:3000

### En Producción:
Visita: https://wiston-festival-navideno.vercel.app

### Probar el endpoint de salud:
```bash
# Local
curl http://localhost:3000/api/health

# Producción
curl https://wiston-festival-navideno.vercel.app/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-..."
}
```

## 🐛 Solución de Problemas

### Error: "Faltan variables de entorno de Supabase"
- Verifica que las variables estén en `config.env`
- Reinicia el servidor de desarrollo

### Error: "relation 'alumno' does not exist"
- Asegúrate de ejecutar `supabase-schema.sql` en el SQL Editor
- Verifica que estés en el proyecto correcto de Supabase

### Error: "row level security policy violation"
- Verifica que las políticas RLS estén habilitadas
- El script SQL ya incluye las políticas necesarias

### Error: "Invalid API key"
- Verifica que estés usando el `SUPABASE_SERVICE_ROLE_KEY` correcto
- NO uses el `anon` key, debe ser el `service_role` key

## 📊 Estructura de las Tablas Creadas

```
alumno (ya existe)
├── alumno_detalles (contraseñas)
│   └── FK: alumno_id → alumno.alumno_id
├── alumno_familiar (padres/tutores)
│   └── FK: alumno_id → alumno.alumno_id
└── reservas (boletos)
    └── referencia → alumno.alumno_ref
```

## 🔒 Seguridad

- ✅ Row Level Security (RLS) habilitado
- ✅ Service Role Key solo en backend
- ✅ Políticas de acceso configuradas
- ✅ Variables de entorno protegidas

---

**¿Listo?** Una vez completados estos pasos, tu aplicación estará completamente migrada a Supabase y funcionando en Vercel! 🎉

