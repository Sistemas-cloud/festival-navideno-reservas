# 🐛 Debug: Auto-refresh después de Login/Logout

## 🔧 Cambios Implementados

### 1. **useAuth.ts - Múltiples estrategias de refresh:**
```typescript
// Estrategia 1: router.push + router.refresh
setTimeout(() => {
  router.push('/');
  router.refresh();
  
  // Estrategia 2: Fallback con window.location.reload
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, 500);
}, 100);
```

### 2. **page.tsx - Re-render forzado:**
```typescript
// Keys únicas con timestamp
<Dashboard key={`dashboard-${renderKey}-${Date.now()}`} />
<LoginForm key={`login-${renderKey}-${Date.now()}`} />

// Re-render cuando cambia cualquier estado
useEffect(() => {
  if (mounted) {
    setRenderKey(prev => prev + 1);
  }
}, [isAuthenticated, userData, mounted]);
```

### 3. **Estados de loading mejorados:**
- Loading durante autenticación
- Loading durante carga inicial
- Prevención de hydration mismatch

---

## 🧪 **TEST PASO A PASO**

### **Paso 1: Abrir Consola del Navegador**
1. Presiona **F12**
2. Ve a **"Console"**
3. **NO cierres la consola** durante la prueba

### **Paso 2: Hacer Login**
1. Ve a `http://localhost:3000`
2. Ingresa credenciales:
   - **Control:** `11779`
   - **Contraseña:** `f050411`
3. Click en "Login"

### **Paso 3: Observar en Consola**
**Busca estos mensajes:**
```
✅ Login exitoso
✅ Datos guardados en localStorage
✅ Estado actualizado
✅ Router.push ejecutado
✅ Router.refresh ejecutado
🔄 Fallback: window.location.reload ejecutado
```

### **Paso 4: Verificar localStorage**
En la consola, ejecuta:
```javascript
console.log('userData:', localStorage.getItem('userData'));
console.log('isAuthenticated:', localStorage.getItem('userData') !== null);
```

**Debería mostrar:**
```json
{
  "alumnoRef": 11779,
  "alumnoNombre": "",
  "hermanos": []
}
```

---

## 🔍 **Diagnóstico de Problemas**

### **Problema 1: No aparece Dashboard**
**Causa:** El estado no se actualiza
**Solución:** Verificar localStorage

### **Problema 2: Aparece Dashboard pero no automáticamente**
**Causa:** Router no funciona
**Solución:** El fallback debería recargar la página

### **Problema 3: Nada funciona**
**Causa:** JavaScript bloqueado o error
**Solución:** Verificar consola para errores

---

## 🎯 **Test Manual en Consola**

Después de hacer login, ejecuta esto en la consola (F12):

```javascript
// 1. Verificar estado actual
console.log('=== ESTADO ACTUAL ===');
console.log('localStorage:', localStorage.getItem('userData'));
console.log('URL actual:', window.location.href);

// 2. Forzar cambio manual
console.log('=== FORZANDO CAMBIO ===');
localStorage.setItem('userData', JSON.stringify({
  alumnoRef: 11779,
  alumnoNombre: "Test",
  hermanos: []
}));

// 3. Recargar página
console.log('=== RECARGANDO PÁGINA ===');
window.location.reload();
```

**Resultado esperado:** Debería aparecer el Dashboard

---

## 🚨 **Si NADA funciona**

### **Opción 1: Modo Incógnito**
1. Abre ventana incógnita
2. Ve a `http://localhost:3000`
3. Prueba login

### **Opción 2: Navegador Diferente**
1. Prueba en Firefox si usas Chrome
2. O viceversa

### **Opción 3: Limpiar Cache**
1. F12 → Network
2. Marca "Disable cache"
3. Ctrl+Shift+R

---

## 📊 **Información para Reportar**

Si sigue sin funcionar, necesito saber:

1. **¿Qué aparece en la consola?** (F12 → Console)
2. **¿Se guarda en localStorage?** (`localStorage.getItem('userData')`)
3. **¿Aparece el Dashboard con F5 manual?**
4. **¿Qué navegador usas?** (Chrome, Firefox, etc.)
5. **¿Hay errores en rojo en la consola?**

---

## ⚡ **Solución de Emergencia**

Si necesitas que funcione YA:

```javascript
// Ejecuta esto en la consola después del login
localStorage.setItem('userData', JSON.stringify({
  alumnoRef: 11779,
  alumnoNombre: "Usuario",
  hermanos: []
}));
window.location.reload();
```

Esto debería mostrar el Dashboard inmediatamente.

---

## 🔄 **Flujo Esperado**

```
1. Usuario hace login
   ↓
2. API responde: {"success": true, "data": []}
   ↓
3. localStorage.setItem('userData', ...)
   ↓
4. setUserData(newUserData)
   ↓
5. setIsAuthenticated(true)
   ↓
6. router.push('/') + router.refresh()
   ↓
7. renderKey se incrementa
   ↓
8. Componente se re-monta con nueva key
   ↓
9. Se muestra Dashboard
   ↓
10. Si no funciona: window.location.reload() (fallback)
```

---

**¡Prueba ahora y dime exactamente qué ves en la consola!** 🔍
