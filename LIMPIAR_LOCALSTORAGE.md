# 🧹 Limpiar localStorage

## 🚨 **Problema Identificado:**

El sistema está usando el organization ID viejo `"fallback-org-fallback-admin"` que quedó en el localStorage de la sesión anterior.

## 🛠️ **Solución:**

### **1. Limpiar localStorage Completamente:**
```javascript
// En la consola del navegador (F12)
localStorage.clear()
location.reload()
```

### **2. Verificar Organization ID:**
```javascript
// En la consola del navegador
console.log('Organization ID actual:', localStorage.getItem('organization_id'))
```

### **3. Establecer UUID Correcto Manualmente:**
```javascript
// En la consola del navegador
localStorage.setItem('organization_id', '11111111-1111-1111-1111-111111111111')
console.log('UUID establecido:', localStorage.getItem('organization_id'))
location.reload()
```

## 🎯 **Resultado Esperado:**

Después de limpiar el localStorage:
```
✅ Organization ID válido encontrado: 11111111-1111-1111-1111-111111111111
✅ Tenant inicializado correctamente: 11111111-1111-1111-1111-111111111111
```

## 🔧 **Comandos de Debug:**

### **Verificar Estado Actual:**
```javascript
// En la consola del navegador
console.log('localStorage completo:', localStorage)
console.log('Organization ID:', localStorage.getItem('organization_id'))
console.log('Auth Token:', localStorage.getItem('authToken'))
```

### **Limpiar Todo:**
```javascript
// En la consola del navegador
localStorage.clear()
sessionStorage.clear()
location.reload()
```

## 🎉 **Estado Esperado Final:**

- **✅ Organization ID**: `11111111-1111-1111-1111-111111111111`
- **✅ Login funciona**: Con fallback corregido
- **✅ Datos reales**: 5 clientes, 3 facturas
- **✅ Sin errores**: No más "invalid input syntax for type uuid"

**¡Ejecuta el comando de limpieza en la consola!** 🚀
