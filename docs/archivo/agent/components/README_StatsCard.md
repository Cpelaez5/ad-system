# StatsCard Component

Componente reutilizable para mostrar tarjetas de estadísticas siguiendo el diseño oficial de AD Business Group.

## Uso Básico

```vue
<template>
  <StatsCard
    title="Total Clientes"
    :value="42"
    bg-color="#02254d"
    text-color="white"
  />
</template>

<script>
import StatsCard from '@/components/common/StatsCard.vue'

export default {
  components: { StatsCard }
}
</script>
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `title` | String | **required** | Título de la tarjeta |
| `value` | Number | **required** | Valor numérico a mostrar |
| `bgColor` | String | `'#02254d'` | Color de fondo |
| `textColor` | String | `'white'` | Color del texto |
| `isCurrency` | Boolean | `false` | Si el valor es monetario |
| `currencySymbol` | String | `'$'` | Símbolo de moneda |
| `hideSymbol` | Boolean | `false` | Ocultar símbolo de moneda |
| `showCurrencyToggle` | Boolean | `false` | Mostrar botón de conversión |
| `currentCurrency` | String | `'VES'` | Moneda actual (VES/USD) |
| `isChanging` | Boolean | `false` | Estado de cambio de moneda |

## Eventos

| Evento | Descripción |
|--------|-------------|
| `toggle-currency` | Emitido al hacer clic en el botón de conversión |

## Paleta de Colores Oficial

### Colores Principales
- **Azul Oscuro**: `#02254d` - Para totales y valores principales
- **Rojo/Vino**: `#961112` - Para alertas, emitidas, egresos
- **Amarillo/Dorado**: `#f2b648` - Para ingresos, valores positivos
- **Beige Claro**: `#f0d29b` - Para valores secundarios

### Combinaciones de Texto
- Fondos oscuros (#02254d, #961112): `text-color="white"`
- Fondos claros (#f2b648, #f0d29b): `text-color="#010101"`

## Ejemplos

### Card Simple
```vue
<StatsCard
  title="Clientes Activos"
  :value="estadisticas.totalClientes"
  bg-color="#02254d"
  text-color="white"
/>
```

### Card con Moneda
```vue
<StatsCard
  title="Ingresos Este Mes"
  :value="estadisticas.ingresosMes"
  bg-color="#f2b648"
  text-color="#010101"
  is-currency
  currency-symbol="$"
/>
```

### Card con Conversión de Moneda
```vue
<template>
  <StatsCard
    title="Monto Total"
    :value="displayTotalAmount"
    bg-color="#f0d29b"
    text-color="#010101"
    is-currency
    :currency-symbol="currencyDisplay === 'VES' ? 'Bs. ' : '$'"
    show-currency-toggle
    :current-currency="currencyDisplay"
    :is-changing="isChangingCurrency"
    @toggle-currency="toggleCurrency"
  />
</template>

<script>
export default {
  data() {
    return {
      currencyDisplay: 'VES',
      isChangingCurrency: false
    }
  },
  methods: {
    toggleCurrency() {
      this.isChangingCurrency = true
      this.currencyDisplay = this.currencyDisplay === 'VES' ? 'USD' : 'VES'
      setTimeout(() => {
        this.isChangingCurrency = false
      }, 600)
    }
  }
}
</script>
```

## Características

- ✅ AnimatedNumber integrado
- ✅ Soporte para conversión de moneda
- ✅ Animaciones suaves
- ✅ Diseño consistente con paleta oficial
- ✅ Responsive
- ✅ Accesible

## Notas de Diseño

- **Altura fija**: 120px
- **Padding**: 24px (pa-6)
- **Border radius**: 20px
- **Sin sombras**: box-shadow: none
- **Tipografía**: Berlin Sans FB Demi Bold / Open Sans
