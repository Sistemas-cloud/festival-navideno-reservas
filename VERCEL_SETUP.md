# Configuración de Vercel para Festival Navideño

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en Vercel, necesitas configurar las siguientes variables de entorno:

### 1. Variables de Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

### 2. Cómo configurar en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto "festival-navideno-reservas"
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

| Variable | Valor | Entorno |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tu-proyecto.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `tu-service-role-key` | Production, Preview, Development |

### 3. Obtener las credenciales de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Verificar la configuración

Después de configurar las variables, puedes verificar que estén correctas visitando:

- `https://tu-app.vercel.app/api/debug/env` - Verifica variables de entorno
- `https://tu-app.vercel.app/api/debug/supabase` - Prueba conexión con Supabase

### 5. Redeploy

Después de agregar las variables de entorno:

1. Ve a **Deployments** en Vercel
2. Haz clic en **Redeploy** en el último deployment
3. O haz un nuevo push a GitHub para trigger un nuevo deployment

## Troubleshooting

### Error: "Error interno del servidor"

1. Verifica que las variables de entorno estén configuradas
2. Revisa los logs en Vercel Dashboard → Functions → View Function Logs
3. Usa los endpoints de debug para diagnosticar el problema

### Error: "Cannot find name 'existing'"

Este error ya fue corregido en el código. Si persiste, haz un redeploy.

### Error de conexión con Supabase

1. Verifica que la URL de Supabase sea correcta
2. Verifica que el service_role_key sea correcto
3. Asegúrate de que las tablas existan en Supabase
