# 🚨 CONFIGURACIÓN URGENTE - Variables de Entorno en Vercel

## ❌ Error Actual
```
Configuración del servidor incompleta
```

Este error indica que las variables de entorno de Supabase no están configuradas en Vercel.

## ✅ Solución Paso a Paso

### 1. Ir a Vercel Dashboard
1. Ve a [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Inicia sesión con tu cuenta
3. Busca el proyecto `wiston-festival-navideno` o `festival-navideno-reservas`

### 2. Configurar Variables de Entorno
1. Haz clic en tu proyecto
2. Ve a la pestaña **Settings**
3. En el menú lateral, haz clic en **Environment Variables**
4. Haz clic en **Add New**

### 3. Agregar Variables Requeridas

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://tu-proyecto.supabase.co` (reemplaza con tu URL real)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### Variable 2: SUPABASE_SERVICE_ROLE_KEY
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `tu-service-role-key-aqui` (reemplaza con tu key real)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 4. Obtener las Credenciales de Supabase

#### Si ya tienes un proyecto en Supabase:
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → Usar para `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** → Usar para `SUPABASE_SERVICE_ROLE_KEY`

#### Si NO tienes un proyecto en Supabase:
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Espera a que se complete la configuración
5. Ve a **Settings** → **API** y copia las credenciales

### 5. Redeploy
Después de agregar las variables:
1. Ve a la pestaña **Deployments**
2. Haz clic en **Redeploy** en el último deployment
3. O haz un nuevo push a GitHub

## 🧪 Verificar Configuración

Después del redeploy, prueba estos endpoints:

### Verificar Variables de Entorno:
```
https://wiston-festival-navideno.vercel.app/api/debug/env
```

### Probar Conexión con Supabase:
```
https://wiston-festival-navideno.vercel.app/api/debug/supabase
```

### Probar Login:
```
https://wiston-festival-navideno.vercel.app/api/debug/simple-login
```

## 📋 Checklist de Configuración

- [ ] Variables de entorno agregadas en Vercel
- [ ] Redeploy completado
- [ ] `/api/debug/env` muestra ✅ para ambas variables
- [ ] `/api/debug/supabase` muestra conexión exitosa
- [ ] Login funciona correctamente

## 🆘 Si Necesitas Ayuda

Si no tienes acceso a Supabase o necesitas ayuda:

1. **Crear proyecto Supabase**:
   - Ve a [supabase.com](https://supabase.com)
   - Crea cuenta gratuita
   - Crea nuevo proyecto

2. **Configurar base de datos**:
   - Usa el archivo `supabase-schema.sql` del proyecto
   - Ejecuta las consultas SQL en el editor de Supabase

3. **Obtener credenciales**:
   - Settings → API
   - Copiar Project URL y service_role key

## 🔧 Variables de Entorno Completas

```bash
# Variables requeridas
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Variables opcionales (ya configuradas por Vercel)
NODE_ENV=production
VERCEL=1
VERCEL_ENV=production
```

## ⚠️ Importante

- **NEXT_PUBLIC_SUPABASE_URL**: Debe empezar con `https://`
- **SUPABASE_SERVICE_ROLE_KEY**: Es una cadena larga que empieza con `eyJ`
- **No compartir**: Nunca compartas tu service_role key públicamente
- **Redeploy**: Siempre haz redeploy después de cambiar variables de entorno
