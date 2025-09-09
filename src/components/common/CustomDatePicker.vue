<template>
  <div class="custom-date-picker">
    <label v-if="label" class="date-picker-label" :class="{ 'error': hasError }">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    
    <VueDatePicker
      v-model="selectedDate"
      :format="format"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      :range="range"
      :multi-calendars="multiCalendars"
      :enable-time-picker="enableTimePicker"
      :time-picker="timePicker"
      :auto-apply="autoApply"
      :close-on-auto-apply="closeOnAutoApply"
      :preview-format="previewFormat"
      :class="[
        'custom-date-picker-input',
        { 'error': hasError },
        { 'disabled': disabled }
      ]"
      @update:model-value="handleDateChange"
      @cleared="handleCleared"
    />
    
    <div v-if="errorMessage" class="date-picker-error">
      {{ errorMessage }}
    </div>
    
    <div v-if="hint" class="date-picker-hint">
      {{ hint }}
    </div>
  </div>
</template>

<script>
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

export default {
  name: 'CustomDatePicker',
  components: {
    VueDatePicker
  },
  props: {
    modelValue: {
      type: [Date, String, Array],
      default: null
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Seleccionar fecha'
    },
    format: {
      type: String,
      default: 'dd/MM/yyyy'
    },
    previewFormat: {
      type: String,
      default: 'dd/MM/yyyy'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    required: {
      type: Boolean,
      default: false
    },
    clearable: {
      type: Boolean,
      default: true
    },
    range: {
      type: Boolean,
      default: false
    },
    multiCalendars: {
      type: Boolean,
      default: false
    },
    enableTimePicker: {
      type: Boolean,
      default: false
    },
    timePicker: {
      type: Boolean,
      default: false
    },
    autoApply: {
      type: Boolean,
      default: true
    },
    closeOnAutoApply: {
      type: Boolean,
      default: true
    },
    errorMessage: {
      type: String,
      default: ''
    },
    hint: {
      type: String,
      default: ''
    },
    rules: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedDate: this.modelValue,
      hasError: false
    }
  },
  watch: {
    modelValue(newValue) {
      this.selectedDate = newValue
    },
    errorMessage(newValue) {
      this.hasError = !!newValue
    }
  },
  methods: {
    handleDateChange(value) {
      this.$emit('update:modelValue', value)
      this.validateDate(value)
    },
    
    handleCleared() {
      this.$emit('update:modelValue', null)
      this.hasError = false
    },
    
    validateDate(value) {
      if (this.rules.length === 0) return
      
      for (const rule of this.rules) {
        const result = rule(value)
        if (result !== true) {
          this.hasError = true
          this.$emit('error', result)
          return
        }
      }
      
      this.hasError = false
      this.$emit('error', null)
    }
  }
}
</script>

<style scoped>
.custom-date-picker {
  width: 100%;
}

.date-picker-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #010101;
  margin-bottom: 8px;
  font-family: 'Poppins', sans-serif;
}

.date-picker-label.error {
  color: #961112;
}

.required-asterisk {
  color: #961112;
  margin-left: 2px;
}

.custom-date-picker-input {
  width: 100%;
}

.custom-date-picker-input :deep(.dp__input) {
  border: 2px solid #EDEDED;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.875rem;
  font-family: 'Poppins', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: #FFFFFF;
}

.custom-date-picker-input :deep(.dp__input:hover) {
  border-color: #F2B648;
}

.custom-date-picker-input :deep(.dp__input:focus) {
  border-color: #02254D;
  box-shadow: 0 0 0 3px rgba(2, 37, 77, 0.1);
  outline: none;
}

.custom-date-picker-input.error :deep(.dp__input) {
  border-color: #961112;
  box-shadow: 0 0 0 3px rgba(150, 17, 18, 0.1);
}

.custom-date-picker-input.disabled :deep(.dp__input) {
  background-color: #F5F5F5;
  color: #999;
  cursor: not-allowed;
}

.date-picker-error {
  color: #961112;
  font-size: 0.75rem;
  margin-top: 4px;
  font-family: 'Poppins', sans-serif;
}

.date-picker-hint {
  color: #666;
  font-size: 0.75rem;
  margin-top: 4px;
  font-family: 'Poppins', sans-serif;
}

/* Estilos para el dropdown del datepicker */
:deep(.dp__menu) {
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(2, 37, 77, 0.15);
  border: 1px solid #EDEDED;
}

:deep(.dp__calendar_header) {
  background-color: #02254D;
  color: white;
  border-radius: 8px 8px 0 0;
}

:deep(.dp__calendar_header_item) {
  color: white;
  font-weight: 500;
}

:deep(.dp__today) {
  border: 2px solid #F2B648;
  color: #02254D;
  font-weight: 600;
}

:deep(.dp__active_date) {
  background-color: #02254D;
  color: white;
}

:deep(.dp__date_hover) {
  background-color: #F0D29B;
  color: #010101;
}
</style>
