# 📦 Índice de Componentes Reutilizables

> Ubicación: `src/components/common/`

---

## Componentes de Estadísticas

### StatsCard.vue ✅
**Uso**: Tarjetas de estadísticas genéricas
```vue
<StatsCard
  title="Total Clientes"
  :value="42"
  bg-color="#02254d"
  text-color="white"
/>
```
📄 [Documentación](./StatsCard.md)

---

### CurrencyStatsCard.vue ✅
**Uso**: Stats con botón de conversión de moneda
```vue
<CurrencyStatsCard
  title="Monto Total"
  :value="15000.50"
  :currency-symbol="currency === 'VES' ? 'Bs. ' : '$'"
  @toggle-currency="toggleCurrency"
/>
```
📄 [Documentación](./CurrencyStatsCard.md)

---

### AnimatedNumber.vue
**Uso**: Animación de números en KPIs
```vue
<AnimatedNumber :value="1500" :duration="1000" />
```

**Props principales**:
- `value`: Número a mostrar
- `duration`: Duración animación (ms)
- `locale`: Formato regional
- `formatter`: Función de formato

---

## Componentes de Formulario

### FileUploadZone.vue ✅
**Uso**: Drag & drop para archivos (facturas, documentos)
```vue
<FileUploadZone
  :loading="isProcessing"
  @file-selected="handleFile"
  @extract-data="extractWithOCR"
/>
```
📄 [Documentación](./FileUploadZone.md)

---

### CustomDatePicker.vue
**Uso**: Selector de fechas avanzado
```vue
<CustomDatePicker
  v-model="fecha"
  label="Fecha de emisión"
  :min="minDate"
  :max="maxDate"
/>
```

---

### CustomButton.vue
**Uso**: Botones personalizados con estados
```vue
<CustomButton
  text="Guardar"
  icon="mdi-content-save"
  :loading="isSaving"
  @click="save"
/>
```

---

## Componentes de Feedback

### AppSnackbar.vue ✅
**Uso**: Notificaciones tipo snackbar
```vue
<AppSnackbar
  v-model="snackbar.show"
  :type="snackbar.type"
  :message="snackbar.message"
/>
```
📄 [Documentación](./AppSnackbar.md)

**Tipos**: `success`, `error`, `warning`, `info`

---

### NotificationSystem.vue
**Uso**: Sistema de notificaciones en tiempo real
```vue
<NotificationSystem ref="notifications" />

// En methods:
this.$refs.notifications.show({
  type: 'success',
  title: 'Guardado',
  message: 'Factura creada correctamente'
})
```

---

### LoadingSpinner.vue
**Uso**: Spinners de carga (6 tipos)
```vue
<LoadingSpinner type="circular" size="40" color="primary" />
```

**Tipos**: `circular`, `linear`, `dots`, `pulse`, `bounce`, `fade`

---

## Componentes de Datos

### AnimatedTable.vue
**Uso**: Tablas con animaciones de filas
```vue
<AnimatedTable
  :headers="headers"
  :items="items"
  :loading="isLoading"
/>
```

---

### BCVRateDisplay.vue
**Uso**: Mostrar tasa BCV en tiempo real
```vue
<BCVRateDisplay show-update-time />
```

---

### CurrencyConverter.vue
**Uso**: Conversión USD ↔ VES
```vue
<CurrencyConverter
  :amount="1000"
  from="USD"
  to="VES"
/>
```

---

## Componentes de Navegación

### PageTransition.vue
**Uso**: Transiciones entre páginas
```vue
<PageTransition type="slide">
  <router-view />
</PageTransition>
```

**Tipos**: `fade`, `slide`, `scale`, `none`

---

## Referencia Rápida

| Componente | ¿Tiene README? | Uso Principal |
|------------|----------------|---------------|
| AnimatedNumber | ❌ | Números animados KPIs |
| AnimatedTable | ❌ | Tablas con animación |
| AppSnackbar | ✅ | Notificaciones |
| BCVRateDisplay | ❌ | Tasa BCV |
| CurrencyConverter | ❌ | Conversión moneda |
| CurrencyStatsCard | ✅ | Stats con moneda |
| CustomButton | ❌ | Botones custom |
| CustomDatePicker | ❌ | Selector fechas |
| FileUploadZone | ✅ | Upload archivos |
| LoadingSpinner | ❌ | Spinners carga |
| NotificationSystem | ❌ | Notificaciones RT |
| PageTransition | ❌ | Transiciones página |
| StatsCard | ✅ | Tarjetas stats |

---

## Cómo Agregar Nuevo Componente

1. Crear archivo en `src/components/common/`
2. Documentar con README si es reutilizable
3. Agregar a este índice
4. Seguir patrones de componentes existentes
