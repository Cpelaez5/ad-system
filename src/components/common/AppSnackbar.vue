<template>
  <v-snackbar
    v-model="isVisible"
    :color="snackbarColor"
    :timeout="timeout"
    location="top"
    multi-line
    @update:model-value="handleClose"
  >
    <div class="d-flex align-center">
      <v-icon class="mr-2" size="24">{{ snackbarIcon }}</v-icon>
      <span class="text-body-1">{{ message }}</span>
    </div>
    
    <template v-slot:actions>
      <v-btn
        variant="text"
        @click="close"
        icon="mdi-close"
        size="small"
      ></v-btn>
    </template>
  </v-snackbar>
</template>

<script>
export default {
  name: 'AppSnackbar',
  
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
    },
    message: {
      type: String,
      default: 'Operación completada'
    },
    timeout: {
      type: Number,
      default: 4000
    }
  },
  
  emits: ['update:modelValue'],
  
  computed: {
    isVisible: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      }
    },
    
    snackbarColor() {
      const colors = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
      };
      return colors[this.type] || 'info';
    },
    
    snackbarIcon() {
      const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      };
      return icons[this.type] || 'mdi-information';
    }
  },
  
  methods: {
    close() {
      this.isVisible = false;
    },
    
    handleClose(value) {
      if (!value) {
        this.$emit('update:modelValue', false);
      }
    }
  }
};
</script>

<style scoped>
/* Estilos adicionales si son necesarios */
</style>
