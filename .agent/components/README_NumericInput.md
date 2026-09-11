# 🔢 NumericInput - Componente Reutilizable

## 📝 Descripción

Componente de entrada numérica y financiera diseñado bajo principios First-Mobile y S.O.L.I.D.
Resuelve de raíz el bug común de Vue `v-model.number` donde al escribir decimales con cero inicial (como `0.05` o `12.0`), el valor `0` intermedio se eliminaba al parsearse tempranamente a float.

Ofrece soporte universal para teclados numéricos (punto `.` y coma `,`), formateo tabular y limitación de decimales.

---

## 📦 Ubicación

```
src/components/common/NumericInput.vue
```

---

## 🚀 Uso Básico

### 1. Importar el componente

```vue
<script>
import NumericInput from '@/components/common/NumericInput.vue';

export default {
  components: {
    NumericInput
  }
}
</script>
```

### 2. Agregar al template

```vue
<NumericInput
  v-model="formData.financial.taxableSales"
  label="Base Imponible"
  prefix="Bs."
  :max-decimals="2"
  variant="outlined"
  density="compact"
/>
```

---

## ⚙️ Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `modelValue` | `Number \| String` | `0` | Valor enlazado bidireccionalmente (`v-model`) |
| `label` | `String` | `''` | Etiqueta del campo |
| `prefix` | `String` | `''` | Prefijo (ej: `Bs.`, `$`, `€`) |
| `suffix` | `String` | `''` | Sufijo (ej: `%`, `Kg`) |
| `readonly` | `Boolean` | `false` | Solo lectura |
| `disabled` | `Boolean` | `false` | Deshabilitado |
| `allowDecimals` | `Boolean` | `true` | Permitir o no decimales |
| `maxDecimals` | `Number` | `2` | Número máximo de decimales permitidos |
| `min` | `Number` | `undefined` | Valor numérico mínimo permitido |
| `max` | `Number` | `undefined` | Valor numérico máximo permitido |
| `density` | `String` | `'compact'` | Densidad de Vuetify (`compact`, `comfortable`, `default`) |
| `variant` | `String` | `'outlined'` | Estilo visual de Vuetify |

---

## 💡 Eventos Emitidos

- `update:modelValue`: Emitido en cada cambio válido con el valor en tipo numérico (`Number`).
- `change`: Emitido al perder el foco (`blur`) si el valor cambió.
- `focus`: Emitido al recibir el foco.
- `blur`: Emitido al perder el foco.
