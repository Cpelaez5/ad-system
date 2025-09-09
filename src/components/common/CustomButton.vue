<template>
  <v-btn
    :color="color"
    :variant="variant"
    :size="size"
    :disabled="disabled || loading"
    :loading="loading"
    :elevation="elevation"
    :rounded="rounded"
    :block="block"
    :prepend-icon="prependIcon"
    :append-icon="appendIcon"
    :class="buttonClass"
    @click="handleClick"
  >
    <template v-if="prependIcon && !loading" v-slot:prepend>
      <v-icon :color="iconColor" :size="iconSize" class="animate-micro-rotate">{{ prependIcon }}</v-icon>
    </template>
    
    <span v-if="!loading" :class="textClass">{{ text }}</span>
    
    <template v-if="appendIcon && !loading" v-slot:append>
      <v-icon :color="iconColor" :size="iconSize" class="animate-micro-rotate">{{ appendIcon }}</v-icon>
    </template>
  </v-btn>
</template>

<script>
export default {
  name: 'CustomButton',
  props: {
    text: {
      type: String,
      default: 'Button'
    },
    color: {
      type: String,
      default: 'primary'
    },
    variant: {
      type: String,
      default: 'elevated'
    },
    size: {
      type: String,
      default: 'default'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    elevation: {
      type: [Number, String],
      default: 2
    },
    rounded: {
      type: [String, Boolean],
      default: 'lg'
    },
    block: {
      type: Boolean,
      default: false
    },
    prependIcon: {
      type: String,
      default: null
    },
    appendIcon: {
      type: String,
      default: null
    },
    iconColor: {
      type: String,
      default: null
    },
    iconSize: {
      type: [String, Number],
      default: 'default'
    },
    customClass: {
      type: String,
      default: ''
    }
  },
  computed: {
    buttonClass() {
      return [
        'custom-button',
        'animate-hover-lift',
        'animate-micro-bounce',
        this.customClass
      ]
    },
    textClass() {
      return [
        'button-text',
        `text-${this.size}`
      ]
    }
  },
  methods: {
    handleClick(event) {
      if (!this.disabled && !this.loading) {
        this.$emit('click', event)
      }
    }
  }
}
</script>

<style scoped>
.custom-button {
  font-family: 'Poppins', sans-serif;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(2, 37, 77, 0.15);
}

.custom-button:active {
  transform: translateY(0);
}

.button-text {
  font-weight: 500;
}

/* Tamaños personalizados */
.text-small {
  font-size: 0.75rem;
}

.text-default {
  font-size: 0.875rem;
}

.text-large {
  font-size: 1rem;
}

/* Estados especiales */
.custom-button.v-btn--disabled {
  opacity: 0.6;
  transform: none;
}

.custom-button.v-btn--loading {
  transform: none;
}
</style>
