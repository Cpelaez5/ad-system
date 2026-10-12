# CurrencyStatsCard Component

Componente reutilizable para mostrar tarjetas de estadísticas monetarias con botón de conversión de moneda, siguiendo el diseño oficial de AD Business Group.

## Uso

```vue
<template>
  <CurrencyStatsCard
    title="Monto Total"
    :value="totalAmount"
    bg-color="#f0d29b"
    text-color="#010101"
    :currency-symbol="currency === 'VES' ? 'Bs. ' : '$'"
    @toggle-currency="handleCurrencyToggle"
  />
</template>

<script>
import CurrencyStatsCard from '@/components/common/CurrencyStatsCard.vue'

export default {
  components: { CurrencyStatsCard },
  data() {
    return {
      currency: 'VES',
      totalAmount: 15000.50
    }
  },
  methods: {
    handleCurrencyToggle() {
      this.currency = this.currency === 'VES' ? 'USD' : 'VES'
    }
  }
}
</script>
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `title` | String | **required** | Título de la tarjeta |
| `value` | Number | **required** | Valor monetario a mostrar |
| `bgColor` | String | `'#f0d29b'` | Color de fondo |
| `textColor` | String | `'#010101'` | Color del texto |
| `currencySymbol` | String | **required** | Símbolo de moneda (ej: '$', 'Bs. ') |

## Eventos

| Evento | Descripción |
|--------|-------------|
| `toggle-currency` | Emitido al hacer clic en el botón de conversión |

## Características

- ✅ AnimatedNumber integrado
- ✅ Botón de conversión de moneda
- ✅ Diseño consistente con Dashboard (120px altura)
- ✅ Hover effect (translateY(-2px))
- ✅ Colores oficiales AD Business Group
- ✅ Formato monetario automático (2 decimales)

## Ejemplo Completo

```vue
<template>
  <v-row>
    <!-- Stats normales -->
    <v-col cols="12" sm="6" md="3">
      <StatsCard
        title="Total Facturas"
        :value="stats.total"
        bg-color="#02254d"
        text-color="white"
      />
    </v-col>

    <!-- Stats con moneda -->
    <v-col cols="12" sm="6" md="3">
      <CurrencyStatsCard
        title="Monto Total"
        :value="displayAmount"
        bg-color="#f0d29b"
        text-color="#010101"
        :currency-symbol="currencyDisplay === 'VES' ? 'Bs. ' : '$'"
        @toggle-currency="toggleCurrency"
      />
    </v-col>
  </v-row>
</template>

<script>
import StatsCard from '@/components/common/StatsCard.vue'
import CurrencyStatsCard from '@/components/common/CurrencyStatsCard.vue'
import bcvService from '@/services/bcvService.js'

export default {
  components: { StatsCard, CurrencyStatsCard },
  data() {
    return {
      currencyDisplay: 'VES',
      bcvRate: 1,
      stats: {
        total: 42,
        totalAmount: 15000.50
      }
    }
  },
  computed: {
    displayAmount() {
      if (this.currencyDisplay === 'USD') {
        return this.stats.totalAmount / this.bcvRate
      }
      return this.stats.totalAmount
    }
  },
  async mounted() {
    const rate = await bcvService.getBcvRate()
    this.bcvRate = rate || 1
  },
  methods: {
    toggleCurrency() {
      this.currencyDisplay = this.currencyDisplay === 'VES' ? 'USD' : 'VES'
    }
  }
}
</script>
```

## Diferencias con StatsCard

| Característica | StatsCard | CurrencyStatsCard |
|----------------|-----------|-------------------|
| **Uso** | Stats generales | Stats monetarias |
| **Botón toggle** | ❌ No | ✅ Sí |
| **Formato** | Configurable | Siempre 2 decimales |
| **Símbolo** | Opcional | Requerido |

## Cuándo Usar

### Usa `CurrencyStatsCard` cuando:
- Necesitas mostrar montos monetarios
- Quieres permitir conversión de moneda
- El valor siempre debe tener 2 decimales

### Usa `StatsCard` cuando:
- Muestras contadores (facturas, clientes, etc.)
- No necesitas conversión de moneda
- El valor puede ser entero o decimal

## Notas de Diseño

- **Altura fija**: 120px
- **Padding**: 24px (pa-6)
- **Border radius**: 20px
- **Hover effect**: translateY(-2px)
- **Botón**: Icon button, size x-small, variant text
- **Formato**: Siempre 2 decimales para moneda
