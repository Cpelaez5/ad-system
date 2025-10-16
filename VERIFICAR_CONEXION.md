# 🔍 Verificar Conexión con Supabase

## 📋 Pasos para Verificar

### 1. **Abrir la Aplicación**
- Ve a `http://localhost:5173`
- Abre DevTools (F12) y ve a la pestaña Console

### 2. **Verificar Variables de Entorno**
Ejecuta estos comandos en la consola:

```javascript
// Verificar que las variables de entorno estén cargadas
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY)
```

**Resultado esperado:**
- URL: `https://ybeippdhlvjzfgpbcoqy.supabase.co`
- Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. **Verificar Conexión con Supabase**
```javascript
// Probar conexión con Supabase
import('@/lib/supabaseClient').then(({ testSupabaseConnection }) => {
  testSupabaseConnection().then(result => console.log('Conexión:', result))
})
```

**Resultado esperado:**
- `{ connected: true, tablesCreated: true }`

### 4. **Verificar Datos de Clientes**
```javascript
// Obtener clientes desde Supabase
import('@/services/clientService').then(({ default: clientService }) => {
  clientService.getClients().then(clients => console.log('Clientes:', clients))
})
```

**Resultado esperado:**
- Array con 8 clientes (5 para Org 1, 3 para Org 2)

### 5. **Verificar Datos de Facturas**
```javascript
// Obtener facturas desde Supabase
import('@/services/invoiceService').then(({ default: invoiceService }) => {
  invoiceService.getInvoices().then(invoices => console.log('Facturas:', invoices))
})
```

**Resultado esperado:**
- Array con 5 facturas (3 para Org 1, 2 para Org 2)

### 6. **Probar Login**
- Usuario: `admin`
- Contraseña: `admin123`

**Resultado esperado:**
- Login exitoso
- Redirección al dashboard
- Estadísticas reales visibles

## 🚨 Posibles Problemas

### **Problema 1: Variables de entorno no cargadas**
- **Síntoma**: Consola muestra `undefined`
- **Solución**: Reiniciar la aplicación

### **Problema 2: Supabase no conecta**
- **Síntoma**: Error de conexión
- **Solución**: Verificar credenciales

### **Problema 3: Datos no cargan**
- **Síntoma**: Arrays vacíos
- **Solución**: Verificar que se ejecutó `supabase-seed-data.sql`

## 📊 Estado Esperado

### **✅ Aplicación funcionando:**
- URL: `http://localhost:5173`
- Variables de entorno cargadas
- Sin errores en consola
- Supabase conectado

### **✅ Datos disponibles:**
- 8 clientes
- 5 facturas
- 2 organizaciones
- Usuarios de prueba

### **✅ Login funcional:**
- Credenciales de prueba funcionan
- Redirección al dashboard
- Datos reales visibles

## 🎯 Próximos Pasos

1. **Ejecutar comandos de verificación**
2. **Reportar resultados**
3. **Solucionar problemas encontrados**
4. **Probar funcionalidades completas**
