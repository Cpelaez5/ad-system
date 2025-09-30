# Integración con API del BCV (Banco Central de Venezuela)

## 📋 Descripción

Este documento describe la integración completa con la API del Banco Central de Venezuela (BCV) para obtener tasas de cambio en tiempo real y realizar conversiones de monedas automáticas en el sistema de facturación.

## 🏦 API del BCV

### Endpoint Principal
```
https://bcv-api.rafnixg.dev/rates/
```

### Endpoints Disponibles
- `GET /rates/` - Tasa actual del BCV
- `GET /rates/{date}` - Tasa para fecha específica
- `GET /rates/history` - Historial últimos 30 días
- `GET /rates/history?start_date={start}&end_date={end}` - Historial por rango

### Ejemplo de Respuesta
```json
{
  "dollar": 36.5,
  "date": "2025-01-20"
}
```

## 🔧 Servicio BCVService

### Ubicación
```
src/services/bcvService.js
```

### Métodos Principales

#### `getCurrentRate()`
Obtiene la tasa de cambio actual del BCV con cache de 5 minutos.

```javascript
const response = await bcvService.getCurrentRate();
if (response.success) {
  console.log(`Tasa actual: ${response.data.dollar} VES/USD`);
}
```

#### `convertUSDToVES(usdAmount)`
Convierte monto de USD a VES usando la tasa del BCV.

```javascript
const result = await bcvService.convertUSDToVES(100);
// result.data.vesAmount = 3650 (si tasa es 36.5)
```

#### `convertVESToUSD(vesAmount)`
Convierte monto de VES a USD usando la tasa del BCV.

```javascript
const result = await bcvService.convertVESToUSD(3650);
// result.data.usdAmount = 100 (si tasa es 36.5)
```

#### `getRateForDate(date)`
Obtiene la tasa para una fecha específica.

```javascript
const rate = await bcvService.getRateForDate('2025-01-15');
```

#### `getRateHistory()`
Obtiene el historial de los últimos 30 días.

```javascript
const history = await bcvService.getRateHistory();
```

### Cache y Optimización
- **Cache local**: 5 minutos en localStorage
- **Fallback**: Tasa por defecto (36.5) si la API falla
- **Manejo de errores**: Respuestas consistentes con información de error

## 🎨 Componentes de UI

### BCVRateDisplay
**Ubicación**: `src/components/common/BCVRateDisplay.vue`

Muestra la tasa actual del BCV con:
- Tasa en tiempo real
- Fecha de actualización
- Indicador de estado (actualizado/error)
- Botón de actualización manual
- Actualización automática cada 5 minutos

```vue
<BCVRateDisplay />
```

### CurrencyConverter
**Ubicación**: `src/components/common/CurrencyConverter.vue`

Conversor interactivo con:
- Campos para USD y VES
- Conversión automática bidireccional
- Información de la tasa utilizada
- Integración con formularios

```vue
<CurrencyConverter
  v-model="totalAmount"
  currency="VES"
  @currency-change="handleCurrencyChange"
/>
```

## 🔄 Integración en Facturas

### Formulario de Facturas
El conversor está integrado en `InvoiceForm.vue`:

```vue
<CurrencyConverter
  v-model="formData.financial.totalSales"
  currency="VES"
  @currency-change="handleCurrencyChange"
/>
```

### Dashboard
La tasa del BCV se muestra en el dashboard principal:

```vue
<BCVRateDisplay />
```

## 📊 Características Técnicas

### Cache Inteligente
```javascript
// Cache de 5 minutos
this.cacheExpiry = 5 * 60 * 1000;

// Verificación de cache
const cached = this.getCachedRate();
if (cached) {
  return cached;
}
```

### Manejo de Errores
```javascript
try {
  const response = await fetch(`${this.baseURL}/rates/`);
  // ... procesamiento
} catch (error) {
  // Retornar tasa por defecto
  return {
    success: false,
    error: error.message,
    data: {
      dollar: 36.5, // Tasa por defecto
      source: 'DEFAULT'
    }
  };
}
```

### Formateo Venezolano
```javascript
formatRate(rate) {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rate);
}
```

## 🚀 Uso en la Aplicación

### 1. Obtener Tasa Actual
```javascript
import { bcvService } from '@/services/bcvService.js';

const rate = await bcvService.getCurrentRate();
console.log(`Tasa BCV: ${rate.data.dollar} VES/USD`);
```

### 2. Convertir Montos
```javascript
// USD a VES
const conversion = await bcvService.convertUSDToVES(100);
console.log(`${conversion.data.usdAmount} USD = ${conversion.data.vesAmount} VES`);

// VES a USD
const conversion = await bcvService.convertVESToUSD(3650);
console.log(`${conversion.data.vesAmount} VES = ${conversion.data.usdAmount} USD`);
```

### 3. Usar en Componentes
```vue
<template>
  <div>
    <BCVRateDisplay />
    <CurrencyConverter v-model="amount" />
  </div>
</template>

<script>
import BCVRateDisplay from '@/components/common/BCVRateDisplay.vue';
import CurrencyConverter from '@/components/common/CurrencyConverter.vue';

export default {
  components: {
    BCVRateDisplay,
    CurrencyConverter
  }
};
</script>
```

## 🔧 Configuración

### Variables de Entorno
```env
# Opcional: URL personalizada del BCV
VITE_BCV_API_URL=https://bcv-api.rafnixg.dev

# Opcional: Tiempo de cache en minutos
VITE_BCV_CACHE_MINUTES=5
```

### Personalización
```javascript
// Cambiar tiempo de cache
bcvService.cacheExpiry = 10 * 60 * 1000; // 10 minutos

// Limpiar cache manualmente
bcvService.clearCache();

// Verificar estado de la API
const status = await bcvService.checkAPIStatus();
```

## 📈 Beneficios

1. **Tasas Oficiales**: Datos directamente del BCV
2. **Tiempo Real**: Actualización automática cada 5 minutos
3. **Cache Inteligente**: Optimización de rendimiento
4. **Fallback Robusto**: Funciona aunque la API falle
5. **UX Mejorada**: Conversiones automáticas en formularios
6. **Formateo Local**: Números según estándares venezolanos

## 🐛 Solución de Problemas

### API No Disponible
- El sistema usa tasas por defecto
- Se muestra indicador de error
- Cache mantiene última tasa válida

### Cache Expirado
- Se actualiza automáticamente
- Botón de actualización manual disponible
- Indicador de carga durante actualización

### Errores de Red
- Reintentos automáticos
- Mensajes de error informativos
- Fallback a tasas por defecto

## 📝 Notas de Desarrollo

- La API del BCV es gratuita y no requiere autenticación
- El cache se almacena en localStorage del navegador
- Las conversiones son precisas hasta 2 decimales
- El sistema es compatible con todas las monedas soportadas
- Se mantiene historial de tasas para auditoría
