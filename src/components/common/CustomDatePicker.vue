<template>
  <div class="custom-date-picker">
    <VueDatePicker
      v-model="selectedDate"
      :format="format"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="false"
      :range="range"
      :multi-calendars="multiCalendars"
      :enable-time-picker="enableTimePicker"
      :time-picker="timePicker"
      :month-picker="monthPicker"
      :auto-apply="autoApply"
      :close-on-auto-apply="closeOnAutoApply"
      :preview-format="previewFormat"
      locale="es"
      cancel-text="Cancelar"
      select-text="Seleccionar"
      :class="[ 'custom-date-picker-input' ]"
      @update:model-value="handleDateChange"
      @cleared="handleCleared"
    >
      <template #dp-input="{ value, onInput, onEnter, onTab, onClear, onBlur, onFocus, onPaste }">
        <v-text-field
          :model-value="value"
          :label="label"
          :placeholder="placeholder"
          :error-messages="hasError ? [errorMessage || 'Inválido'] : []"
          :disabled="disabled"
          :clearable="clearable"
          prepend-inner-icon="mdi-calendar"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="bg-white"
          @input="onInput"
          @keydown.enter="onEnter"
          @keydown.tab="onTab"
          @blur="onBlur"
          @focus="onFocus"
          @paste="onPaste"
          @click:clear="onClear(); handleCleared();"
        >
          <template v-if="required" v-slot:label>
            {{ label }} <span class="text-error ml-1">*</span>
          </template>
        </v-text-field>
      </template>
    </VueDatePicker>
    
    <div v-if="hint && !hasError" class="date-picker-hint">
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
    monthPicker: {
      type: Boolean,
      default: false
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
  height: max-content;
  align-self: flex-start;
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
  padding: 12px 16px 12px 40px; /* Extra left padding for icon */
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

/* =========================================
   AD SYSTEM: Modern Minimalist Calendar
   ========================================= */

/* 1. Container & Layout */
:deep(.dp__menu) {
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(2, 37, 77, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03);
  border: 1px solid #E5E7EB;
  font-family: 'Poppins', sans-serif;
  overflow: hidden;
  padding: 8px;
}

/* 2. Month/Year Controls */
:deep(.dp__month_year_row) {
  margin-bottom: 8px;
}
:deep(.dp__month_year_select) {
  color: #02254D;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s ease;
}
:deep(.dp__month_year_select:hover) {
  background-color: #F3F4F6;
}
:deep(.dp__button) {
  color: #6B7280;
  border-radius: 8px;
  transition: all 0.2s ease;
}
:deep(.dp__button:hover) {
  background-color: #F3F4F6;
  color: #02254D;
}

/* 3. Days of the Week Header */
:deep(.dp__calendar_header) {
  background-color: transparent;
  border-bottom: 1px solid #F3F4F6;
  margin-bottom: 8px;
  padding-bottom: 4px;
}
:deep(.dp__calendar_header_item) {
  color: #6B7280;
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 4. Calendar Days Grid (Interactive Cells) */
:deep(.dp__cell_inner) {
  border-radius: 50% !important; /* Perfect circles */
  width: 36px;
  height: 36px;
  margin: auto;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

/* 5. States (Hover, Active, Today) */
:deep(.dp__date_hover) {
  background-color: #F0F4F8 !important; /* Soft interactive blue */
  color: #02254D !important;
  transform: scale(1.1); /* Micro-animation */
}

:deep(.dp__active_date) {
  background-color: #02254D !important;
  color: #FFFFFF !important;
  box-shadow: 0 4px 10px rgba(2, 37, 77, 0.3);
  transform: scale(1.05);
}

:deep(.dp__today) {
  border: 2px solid #02254D !important; /* Elegant outline */
  color: #02254D;
  font-weight: 700;
}

/* 6. Overlays (Month/Year Picker) */
:deep(.dp__overlay) {
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.98);
}
:deep(.dp__overlay_cell) {
  border-radius: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
}
:deep(.dp__overlay_cell:hover) {
  background-color: #F0F4F8;
  color: #02254D;
  transform: scale(1.05);
}
:deep(.dp__overlay_cell_active) {
  background-color: #02254D !important;
  color: #FFFFFF !important;
}
</style>
