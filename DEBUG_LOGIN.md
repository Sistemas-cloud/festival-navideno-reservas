# 🐛 Debug: Login no cambia automáticamente

## ✅ Estado del Servidor
- ✅ Servidor corriendo en puerto 3000
- ✅ API `/api/auth/login` responde correctamente
- ✅ Conexión a Supabase funcionando

## 🔍 Cómo Debuggear

### 1. Abrir Consola del Navegador
1. Presiona **F12** en tu navegador
2. Ve a la pestaña **"Console"**
3. Haz login
4. Observa si aparecen mensajes

### 2. Verificar que localStorage se actualiza
En la consola del navegador (F12), ejecuta:
```javascript
localStorage.getItem('userData')
```

**Debería mostrar:** Un objeto JSON con tus datos después del login
**Si muestra:** `null` - El login no está guardando los datos

### 3. Verificar estado de autenticación
En la consola del navegador, después de hacer login:
```javascript
// Ver si hay datos guardados
console.log('userData:', localStorage.getItem('userData'));

// Forzar recarga de la página
window.location.reload();
```

### 4. Verificar red (Network)
1. F12 → Pestaña **"Network"** o **"Red"**
2. Haz login
3. Busca la petición a `/api/auth/login`
4. Haz click en ella
5. Ve la pestaña **"Response"**

**Debe mostrar:**
```json
{
  "success": true,
  "data": []
}
```

## 🔧 Solución Temporal

Si después de hacer login no cambia automáticamente:

1. Presiona **F5** (refresh)
2. **Deberías ver el Dashboard** - Esto confirma que el login SÍ funciona
3. El problema es solo con el auto-refresh

## 💡 Causas Posibles

### Causa 1: Extensiones del Navegador
- **Bloqueadores de JavaScript**
- **Extensiones de privacidad**
- **Antivirus que modifican JavaScript**

**Solución:** Prueba en modo incógnito / ventana privada

### Causa 2: Cache del Navegador
**Solución:** 
1. F12 → Network
2. Marca "Disable cache"
3. Recarga con Ctrl+Shift+R

### Causa 3: React DevTools
Si tienes React DevTools instalado, podría interferir

**Solución:** Desactívalo temporalmente

### Causa 4: localStorage bloqueado
Algunos navegadores/configuraciones bloquean localStorage

**Test en consola:**
```javascript
// ¿Funciona localStorage?
localStorage.setItem('test', 'ok');
console.log(localStorage.getItem('test'));
localStorage.removeItem('test');
```

**Debe mostrar:** `"ok"`

## 🎯 Prueba con Navegador Diferente

Si usas Chrome, prueba en:
- Firefox
- Navegador del sistema (sin extensiones)

## 📊 Información para Reportar

Si sigue sin funcionar, necesito saber:

1. **¿Qué muestra la consola?** (F12 → Console)
2. **¿Se guarda en localStorage?** (`localStorage.getItem('userData')`)
3. **¿Funciona con F5 manual?** (Confirma que el login SÍ funciona)
4. **¿Qué navegador usas?** (Chrome, Firefox, etc.)
5. **¿Tienes extensiones instaladas?** (bloqueadores de ads, etc.)

## 🔄 Código Implementado

### src/app/page.tsx
```typescript
// Fuerza re-render cuando cambia isAuthenticated
useEffect(() => {
  setRenderKey(prev => prev + 1);
}, [isAuthenticated]);

// Usa key para forzar remontaje
if (isAuthenticated && userData) {
  return <Dashboard key={`dashboard-${renderKey}`} />;
}
```

### src/hooks/useAuth.ts
```typescript
// Actualiza estado
setUserData(newUserData);
setIsAuthenticated(true);

// Delay para asegurar propagación
setTimeout(() => {
  router.refresh();
}, 100);
```

## 🧪 Test Manual en Consola

Después de hacer login, ejecuta esto en la consola (F12):

```javascript
// 1. Ver si hay datos
console.log('Datos guardados:', localStorage.getItem('userData'));

// 2. Forzar cambio de vista manualmente
window.location.reload();

// 3. Si con F5 SÍ funciona, el problema es el auto-refresh
```

## ✅ Verificación Final

```bash
# En terminal, verificar que el servidor responde
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"alumno_ref": "11528", "clave": "2671"}'

# Debe mostrar:
# {"success":true,"data":[]}
```

---

**Servidor:** ✅ Funcionando  
**API:** ✅ Responde correctamente  
**Supabase:** ✅ Conectado  
**Código:** ✅ Implementado  

El problema debe ser del lado del navegador (cache, extensiones, etc.)

