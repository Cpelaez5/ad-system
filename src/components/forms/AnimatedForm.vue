<template>
  <v-form
    ref="form"
    v-model="valid"
    :lazy-validation="lazy"
    class="animated-form"
  >
    <div class="form-container animate-slide-in-up">
      <!-- Título del formulario -->
      <div v-if="title" class="form-title animate-fade-in animate-delay-100">
        <h3 class="text-h5 font-weight-bold mb-4">
          <v-icon left class="animate-micro-rotate">{{ titleIcon }}</v-icon>
          {{ title }}
        </h3>
      </div>

      <!-- Campos del formulario -->
      <div class="form-fields">
        <slot name="fields"></slot>
      </div>

      <!-- Mensajes de validación -->
      <div v-if="showValidationMessages" class="validation-messages animate-slide-in-up animate-delay-300">
        <v-alert
          v-for="(message, index) in validationMessages"
          :key="index"
          :type="message.type"
          :text="message.text"
          class="mb-2 animate-fade-in"
          :class="`animate-delay-${(index + 1) * 100}`"
        ></v-alert>
      </div>

      <!-- Botones de acción -->
      <div v-if="showActions" class="form-actions animate-slide-in-up animate-delay-400">
        <v-row>
          <v-col cols="12" class="d-flex justify-end gap-2">
            <CustomButton
              v-if="showCancel"
              text="Cancelar"
              color="grey"
              variant="outlined"
              @click="handleCancel"
              class="animate-micro-bounce"
            />
            <CustomButton
              :text="submitText"
              :color="submitColor"
              :loading="loading"
              :disabled="!valid || loading"
              @click="handleSubmit"
              class="animate-hover-pulse"
            />
          </v-col>
        </v-row>
      </div>
    </div>
  </v-form>
</template>

<script>
import CustomButton from '@/components/common/CustomButton.vue'

export default {
  name: 'AnimatedForm',
  components: {
    CustomButton
  },
  props: {
    title: {
      type: String,
      default: ''
    },
    titleIcon: {
      type: String,
      default: 'mdi-form-select'
    },
    valid: {
      type: Boolean,
      default: false
    },
    lazy: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    showValidationMessages: {
      type: Boolean,
      default: true
    },
    showActions: {
      type: Boolean,
      default: true
    },
    showCancel: {
      type: Boolean,
      default: true
    },
    submitText: {
      type: String,
      default: 'Guardar'
    },
    submitColor: {
      type: String,
      default: 'primary'
    },
    validationMessages: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    handleSubmit() {
      this.$emit('submit')
    },
    handleCancel() {
      this.$emit('cancel')
    },
    validate() {
      return this.$refs.form.validate()
    },
    reset() {
      this.$refs.form.reset()
    },
    resetValidation() {
      this.$refs.form.resetValidation()
    }
  }
}
</script>

<style scoped>
.animated-form {
  width: 100%;
}

.form-container {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-surface);
  transition: all var(--transition-normal);
}

.form-container:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.form-title {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 2px solid var(--color-surface);
}

.form-title h3 {
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-fields {
  margin-bottom: var(--spacing-xl);
}

.form-fields > * {
  margin-bottom: var(--spacing-lg);
}

.form-fields > *:last-child {
  margin-bottom: 0;
}

.validation-messages {
  margin-bottom: var(--spacing-lg);
}

.form-actions {
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-surface);
}

.gap-2 {
  gap: var(--spacing-sm);
}

/* Animaciones específicas para campos de formulario */
.form-fields .v-text-field {
  transition: all var(--transition-normal);
}

.form-fields .v-text-field:focus-within {
  transform: scale(1.02);
}

.form-fields .v-select {
  transition: all var(--transition-normal);
}

.form-fields .v-select:focus-within {
  transform: scale(1.02);
}

.form-fields .v-textarea {
  transition: all var(--transition-normal);
}

.form-fields .v-textarea:focus-within {
  transform: scale(1.02);
}

/* Animación de entrada para cada campo */
.form-fields > * {
  animation: slideInUp var(--animation-duration-normal) var(--ease-out);
}

.form-fields > *:nth-child(1) { animation-delay: 0.1s; }
.form-fields > *:nth-child(2) { animation-delay: 0.2s; }
.form-fields > *:nth-child(3) { animation-delay: 0.3s; }
.form-fields > *:nth-child(4) { animation-delay: 0.4s; }
.form-fields > *:nth-child(5) { animation-delay: 0.5s; }
.form-fields > *:nth-child(6) { animation-delay: 0.6s; }
.form-fields > *:nth-child(7) { animation-delay: 0.7s; }
.form-fields > *:nth-child(8) { animation-delay: 0.8s; }

/* Responsive */
@media (max-width: 768px) {
  .form-container {
    padding: var(--spacing-lg);
    margin: var(--spacing-sm);
  }
  
  .form-title h3 {
    font-size: 1.5rem;
  }
  
  .form-actions .v-col {
    flex-direction: column;
  }
  
  .gap-2 {
    flex-direction: column;
  }
}
</style>
