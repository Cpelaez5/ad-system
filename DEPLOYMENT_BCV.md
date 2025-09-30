# 🚀 Guía de Despliegue - Integración BCV

## 📋 Resumen

El sistema de integración con la API del BCV está preparado para funcionar tanto en **desarrollo** como en **producción**, con manejo automático de CORS y fallbacks robustos.

## 🔧 Configuración Automática

### **Desarrollo (localhost)**
- ✅ Intenta obtener la tasa real del BCV
- ✅ Si falla por CORS, usa tasa por defecto
- ✅ Logs detallados para debugging

### **Producción (desplegado)**
- ✅ Usa directamente la tasa por defecto (evita CORS)
- ✅ Logs optimizados para producción
- ✅ Cache persistente en localStorage

## 📊 Tasa por Defecto

### **Valor Actual**
```
177.6143 VES por USD
```

### **Actualización Manual**
Puedes actualizar la tasa por defecto desde la consola del navegador:

```javascript
// Actualizar la tasa por defecto
bcvService.updateDefaultRate(180.50);

// Verificar la tasa configurada
bcvService.getConfiguredDefaultRate();

// Ver estado del servicio
bcvService.getStatus();
```

## 🎯 Comportamiento en Producción

### **Al Cargar la Aplicación**
1. **Verifica cache** (5 minutos de duración)
2. **Detecta modo producción** automáticamente
3. **Usa tasa por defecto** sin intentar API externa
4. **Muestra en navegación** con chip azul

### **Estados Visuales**
- 🔵 **Azul**: Tasa por defecto (producción)
- 🟢 **Verde**: Tasa real del BCV (desarrollo)
- 🟡 **Amarillo**: Cargando
- 🔴 **Rojo**: Error

## 🔄 Actualización de Tasa

### **Método 1: Consola del Navegador**
```javascript
// Para usuarios técnicos
bcvService.updateDefaultRate(185.25);
```

### **Método 2: localStorage Directo**
```javascript
// Persistente entre sesiones
localStorage.setItem('bcv_default_rate', '185.25');
```

### **Método 3: Actualización Programática**
```javascript
// Desde el código de la aplicación
import { bcvService } from './services/bcvService.js';
bcvService.updateDefaultRate(nuevaTasa);
```

## 📈 Monitoreo

### **Logs en Producción**
```
🚀 Modo producción: usando tasa por defecto
📊 Tasa por defecto aplicada: 177.6143 VES
📦 Usando tasa del BCV desde cache: {...}
```

### **Verificación de Estado**
```javascript
// Verificar configuración actual
console.log(bcvService.getStatus());
```

## 🛠️ Solución de Problemas

### **Problema: Tasa no se actualiza**
```javascript
// Limpiar cache y forzar actualización
bcvService.clearCache();
bcvService.updateDefaultRate(nuevaTasa);
```

### **Problema: Tasa incorrecta**
```javascript
// Verificar tasa configurada
console.log('Tasa configurada:', bcvService.getConfiguredDefaultRate());
console.log('Tasa en cache:', bcvService.getCachedRate());
```

### **Problema: CORS en desarrollo**
- ✅ **Normal**: El sistema maneja CORS automáticamente
- ✅ **Fallback**: Usa tasa por defecto si falla la API

## 📝 Notas Importantes

1. **Cache Inteligente**: 5 minutos de duración para optimizar rendimiento
2. **Detección Automática**: No requiere configuración manual
3. **Fallback Robusto**: Siempre muestra una tasa válida
4. **Persistencia**: La tasa configurada se guarda en localStorage
5. **Debugging**: Servicio accesible desde `window.bcvService`

## 🎉 Resultado Final

- ✅ **Funciona en desarrollo** con intentos de API real
- ✅ **Funciona en producción** con tasa por defecto
- ✅ **Sin errores de CORS** en producción
- ✅ **Tasa siempre visible** en la navegación
- ✅ **Fácil actualización** manual cuando sea necesario
- ✅ **Cache optimizado** para mejor rendimiento

---

**💡 Tip**: Para obtener la tasa más reciente del BCV, puedes consultar directamente la API desde Postman o curl, y luego actualizar la tasa por defecto en la aplicación.
