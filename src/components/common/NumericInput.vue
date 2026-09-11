<template>
  <v-text-field
    :model-value="displayValue"
    :label="label"
    :prefix="prefix"
    :suffix="suffix"
    :readonly="readonly"
    :disabled="disabled"
    :density="density"
    :variant="variant"
    :hide-details="hideDetails"
    :error="error"
    :error-messages="errorMessages"
    :bg-color="bgColor"
    :color="color"
    :append-inner-icon="appendInnerIcon"
    type="text"
    inputmode="decimal"
    pattern="[0-9]*[.,]?[0-9]*"
    @input="onInput"
    @blur="onBlur"
    @focus="onFocus"
    class="numeric-input"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotScope">
      <slot :name="slotName" v-bind="slotScope || {}" />
    </template>
  </v-text-field>
</template>

<script>
/**
 * NumericInput.vue
 * Componente de entrada financiera First-Mobile.
 * Resuelve el bug de pérdida de ceros (ej: '0.05', '12.0') y soporte universal de punto '.' y coma ','.
 */
export default {
  name: 'NumericInput',
  props: {
    modelValue: {
      type: [Number, String],
      default: 0
    },
    label: {
      type: String,
      default: ''
    },
    prefix: {
      type: String,
      default: ''
    },
    suffix: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    density: {
      type: String,
      default: 'compact'
    },
    variant: {
      type: String,
      default: 'outlined'
    },
    hideDetails: {
      type: [Boolean, String],
      default: false
    },
    error: {
      type: Boolean,
      default: false
    },
    errorMessages: {
      type: [String, Array],
      default: () => []
    },
    bgColor: {
      type: String,
      default: undefined
    },
    color: {
      type: String,
      default: undefined
    },
    appendInnerIcon: {
      type: String,
      default: undefined
    },
    allowDecimals: {
      type: Boolean,
      default: true
    },
    maxDecimals: {
      type: Number,
      default: 2
    },
    min: {
      type: Number,
      default: undefined
    },
    max: {
      type: Number,
      default: undefined
    }
  },
  emits: ['update:modelValue', 'change', 'blur', 'focus'],
  data() {
    return {
      isFocused: false,
      localRaw: ''
    }
  },
  computed: {
    displayValue() {
      // Mientras el usuario escribe (campo enfocado), mostrar exactamente su buffer local
      if (this.isFocused) {
        return this.localRaw
      }
      // Cuando no está enfocado, mostrar el valor formateado o numérico
      if (this.modelValue === null || this.modelValue === undefined || this.modelValue === '') {
        return ''
      }
      return String(this.modelValue)
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(newVal) {
        if (!this.isFocused) {
          if (newVal === null || newVal === undefined || newVal === '') {
            this.localRaw = ''
          } else {
            this.localRaw = String(newVal)
          }
        }
      }
    }
  },
  methods: {
    onFocus(e) {
      this.isFocused = true
      // Al enfocar, inicializar el buffer local si estaba vacío pero había modelo
      if (this.modelValue !== null && this.modelValue !== undefined && this.modelValue !== '') {
        this.localRaw = String(this.modelValue)
      } else {
        this.localRaw = ''
      }
      this.$emit('focus', e)
    },
    onInput(e) {
      const raw = e?.target?.value ?? ''
      // Normalizar coma a punto
      let val = raw.replace(/,/g, '.')

      // Filtrar caracteres: solo dígitos y máximo un punto
      val = val.replace(/[^0-9.]/g, '')
      const parts = val.split('.')
      if (parts.length > 2) {
        val = parts[0] + '.' + parts.slice(1).join('')
      }

      // Limitar decimales si aplica
      if (this.allowDecimals && this.maxDecimals !== undefined && parts.length === 2) {
        if (parts[1].length > this.maxDecimals) {
          val = parts[0] + '.' + parts[1].substring(0, this.maxDecimals)
        }
      } else if (!this.allowDecimals) {
        val = parts[0]
      }

      this.localRaw = val

      // Emitir valor numérico al padre
      if (val === '' || val === '.') {
        this.$emit('update:modelValue', 0)
        return
      }

      const parsed = parseFloat(val)
      if (!isNaN(parsed)) {
        let finalVal = parsed
        if (this.min !== undefined && finalVal < this.min) finalVal = this.min
        if (this.max !== undefined && finalVal > this.max) finalVal = this.max
        this.$emit('update:modelValue', finalVal)
      } else {
        this.$emit('update:modelValue', 0)
      }
    },
    onBlur(e) {
      this.isFocused = false
      // Al desenfocar, formatear limpiamente si hay valor numérico
      if (this.localRaw !== '') {
        const parsed = parseFloat(this.localRaw)
        if (!isNaN(parsed)) {
          // Si el usuario dejó algo como '12.' normalizar a '12' o con decimales
          this.localRaw = String(parsed)
          this.$emit('update:modelValue', parsed)
        } else {
          this.localRaw = '0'
          this.$emit('update:modelValue', 0)
        }
      } else {
        this.localRaw = ''
      }
      this.$emit('blur', e)
      this.$emit('change', this.modelValue)
    }
  }
}
</script>

<style scoped>
.numeric-input :deep(input) {
  font-variant-numeric: tabular-nums;
}
</style>
