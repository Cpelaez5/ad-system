# 🔧 Debug de Tenant

## 🚨 **Problema Actual:**

El sistema sigue usando `"mock-org-1"` en lugar del UUID real `"11111111-1111-1111-1111-111111111111"`.

## 🛠️ **Soluciones Implementadas:**

1. **✅ tenantHelpers.js modificado**: Para detectar y reemplazar IDs mock
2. **✅ initTenant.js creado**: Inicialización automática del tenant
3. **✅ main.js actualizado**: Para cargar la inicialización

## 📋 **Comandos de Debug:**

### **1. Verificar Organization ID Actual:**
```javascript
// En la consola del navegador
console.log('Organization ID actual:', localStorage.getItem('organization_id'))
```

### **2. Forzar Reset del Tenant:**
```javascript
// En la consola del navegador
import('@/utils/initTenant').then(({ resetTenant }) => {
  resetTenant()
  console.log('Tenant reseteado')
})
```

### **3. Limpiar localStorage Completamente:**
```javascript
// En la consola del navegador
localStorage.clear()
location.reload()
```

### **4. Establecer UUID Manualmente:**
```javascript
// En la consola del navegador
localStorage.setItem('organization_id', '11111111-1111-1111-1111-111111111111')
console.log('UUID establecido manualmente')
location.reload()
```

### **5. Verificar tenantHelpers:**
```javascript
// En la consola del navegador
import('@/utils/tenantHelpers').then(({ getCurrentOrganizationId }) => {
  const orgId = getCurrentOrganizationId()
  console.log('Organization ID desde tenantHelpers:', orgId)
})
```

## 🔄 **Pasos de Solución:**

### **Paso 1: Limpiar y Resetear**
```javascript
// Ejecutar en la consola
localStorage.clear()
import('@/utils/initTenant').then(({ resetTenant }) => {
  resetTenant()
  location.reload()
})
```

### **Paso 2: Verificar Resultado**
Después del reload, deberías ver en la consola:
```
🔄 Inicializando tenant del sistema...
⚠️ Organization ID inválido o mock detectado, estableciendo UUID real
✅ Organization ID UUID real establecido: 11111111-1111-1111-1111-111111111111
✅ Tenant inicializado correctamente: 11111111-1111-1111-1111-111111111111
```

### **Paso 3: Verificar Datos**
El dashboard debería mostrar:
- **Total de Clientes**: 5
- **Facturas del Mes**: 3
- **Ingresos del Mes**: $15,000.00

## 🎯 **Resultado Esperado:**

- **✅ Organization ID**: `11111111-1111-1111-1111-111111111111`
- **✅ Datos reales**: 5 clientes, 3 facturas
- **✅ Sin errores**: No más "invalid input syntax for type uuid"

## 🚨 **Si Sigue Fallando:**

### **Opción 1: Reiniciar Aplicación**
```bash
# En la terminal
taskkill /f /im node.exe
npm run dev
```

### **Opción 2: Verificar Cache del Navegador**
- Abrir DevTools (F12)
- Ir a Application > Storage > Clear storage
- Hacer clic en "Clear site data"

### **Opción 3: Modo Incógnito**
- Abrir navegador en modo incógnito
- Ir a `http://localhost:5173`

## 📊 **Estado Esperado Final:**

```
✅ Variables de entorno de Supabase cargadas correctamente
✅ Organization ID UUID real establecido: 11111111-1111-1111-1111-111111111111
✅ Tenant inicializado correctamente
🔄 Obteniendo estadísticas de clientes desde Supabase...
✅ Estadísticas cargadas: {totalClientes: 5, facturasMes: 3, ingresosMes: 15000, documentos: 3}
```

**¡Ejecuta los comandos de debug para solucionar el problema!** 🚀
