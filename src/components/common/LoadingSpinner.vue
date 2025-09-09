<template>
  <div class="loading-spinner-container" :class="containerClass">
    <!-- Spinner principal -->
    <div class="spinner-wrapper" :class="spinnerClass">
      <div class="spinner" :class="spinnerType">
        <div v-if="type === 'dots'" class="dots-spinner">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        
        <div v-else-if="type === 'pulse'" class="pulse-spinner">
          <div class="pulse-circle"></div>
          <div class="pulse-circle"></div>
          <div class="pulse-circle"></div>
        </div>
        
        <div v-else-if="type === 'bars'" class="bars-spinner">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
        
        <div v-else-if="type === 'ring'" class="ring-spinner">
          <div class="ring"></div>
        </div>
        
        <div v-else-if="type === 'wave'" class="wave-spinner">
          <div class="wave"></div>
          <div class="wave"></div>
          <div class="wave"></div>
          <div class="wave"></div>
          <div class="wave"></div>
        </div>
        
        <!-- Spinner por defecto (circular) -->
        <div v-else class="circular-spinner">
          <div class="spinner-circle"></div>
        </div>
      </div>
    </div>

    <!-- Texto de carga -->
    <div v-if="text" class="loading-text animate-fade-in animate-delay-300">
      {{ text }}
    </div>

    <!-- Texto secundario -->
    <div v-if="subtext" class="loading-subtext animate-fade-in animate-delay-500">
      {{ subtext }}
    </div>

    <!-- Progreso (opcional) -->
    <div v-if="showProgress && progress !== null" class="loading-progress animate-slide-in-up animate-delay-400">
      <v-progress-linear
        :model-value="progress"
        :color="progressColor"
        :height="progressHeight"
        :rounded="progressRounded"
        class="progress-bar"
      ></v-progress-linear>
      <div class="progress-text animate-fade-in animate-delay-600">
        {{ Math.round(progress) }}%
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    type: {
      type: String,
      default: 'circular',
      validator: (value) => ['circular', 'dots', 'pulse', 'bars', 'ring', 'wave'].includes(value)
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large', 'xlarge'].includes(value)
    },
    color: {
      type: String,
      default: 'primary'
    },
    text: {
      type: String,
      default: ''
    },
    subtext: {
      type: String,
      default: ''
    },
    showProgress: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: null
    },
    progressColor: {
      type: String,
      default: 'primary'
    },
    progressHeight: {
      type: Number,
      default: 4
    },
    progressRounded: {
      type: Boolean,
      default: true
    },
    overlay: {
      type: Boolean,
      default: false
    },
    fullscreen: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    containerClass() {
      return [
        `spinner-${this.size}`,
        {
          'spinner-overlay': this.overlay,
          'spinner-fullscreen': this.fullscreen
        }
      ]
    },
    spinnerClass() {
      return [
        `spinner-${this.size}`,
        `spinner-${this.color}`
      ]
    },
    spinnerType() {
      return `spinner-${this.type}`
    }
  }
}
</script>

<style scoped>
.loading-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}

/* Tamaños */
.spinner-small {
  width: 24px;
  height: 24px;
}

.spinner-medium {
  width: 40px;
  height: 40px;
}

.spinner-large {
  width: 60px;
  height: 60px;
}

.spinner-xlarge {
  width: 80px;
  height: 80px;
}

/* Overlay y fullscreen */
.spinner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
  z-index: 1000;
}

.spinner-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  z-index: 9999;
}

/* Spinner circular */
.circular-spinner {
  width: 100%;
  height: 100%;
  position: relative;
}

.spinner-circle {
  width: 100%;
  height: 100%;
  border: 3px solid var(--color-surface);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Spinner de puntos */
.dots-spinner {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.dot {
  width: 8px;
  height: 8px;
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: dotsBounce 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
.dot:nth-child(3) { animation-delay: 0s; }

@keyframes dotsBounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Spinner de pulso */
.pulse-spinner {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.pulse-circle {
  width: 8px;
  height: 8px;
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: pulse 1.4s ease-in-out infinite both;
}

.pulse-circle:nth-child(1) { animation-delay: -0.32s; }
.pulse-circle:nth-child(2) { animation-delay: -0.16s; }
.pulse-circle:nth-child(3) { animation-delay: 0s; }

@keyframes pulse {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Spinner de barras */
.bars-spinner {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  justify-content: center;
  height: 100%;
}

.bar {
  width: 4px;
  background-color: var(--color-primary);
  border-radius: 2px;
  animation: barsGrow 1.2s ease-in-out infinite;
}

.bar:nth-child(1) { animation-delay: -1.1s; }
.bar:nth-child(2) { animation-delay: -1.0s; }
.bar:nth-child(3) { animation-delay: -0.9s; }
.bar:nth-child(4) { animation-delay: -0.8s; }

@keyframes barsGrow {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* Spinner de anillo */
.ring-spinner {
  width: 100%;
  height: 100%;
  position: relative;
}

.ring {
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top: 3px solid var(--color-primary);
  border-right: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: ringRotate 1s linear infinite;
}

@keyframes ringRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Spinner de onda */
.wave-spinner {
  display: flex;
  gap: 2px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.wave {
  width: 3px;
  height: 60%;
  background-color: var(--color-primary);
  border-radius: 2px;
  animation: waveMove 1.2s ease-in-out infinite;
}

.wave:nth-child(1) { animation-delay: -1.1s; }
.wave:nth-child(2) { animation-delay: -1.0s; }
.wave:nth-child(3) { animation-delay: -0.9s; }
.wave:nth-child(4) { animation-delay: -0.8s; }
.wave:nth-child(5) { animation-delay: -0.7s; }

@keyframes waveMove {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* Texto de carga */
.loading-text {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
}

.loading-subtext {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-align: center;
}

/* Progreso */
.loading-progress {
  width: 100%;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.progress-bar {
  transition: all var(--transition-normal);
}

.progress-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  font-weight: 500;
}

/* Colores */
.spinner-primary .spinner-circle,
.spinner-primary .dot,
.spinner-primary .pulse-circle,
.spinner-primary .bar,
.spinner-primary .ring,
.spinner-primary .wave {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.spinner-secondary .spinner-circle,
.spinner-secondary .dot,
.spinner-secondary .pulse-circle,
.spinner-secondary .bar,
.spinner-secondary .ring,
.spinner-secondary .wave {
  background-color: var(--color-secondary);
  border-color: var(--color-secondary);
}

.spinner-accent .spinner-circle,
.spinner-accent .dot,
.spinner-accent .pulse-circle,
.spinner-accent .bar,
.spinner-accent .ring,
.spinner-accent .wave {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
}

/* Responsive */
@media (max-width: 768px) {
  .loading-spinner-container {
    padding: var(--spacing-md);
  }
  
  .loading-text {
    font-size: 0.875rem;
  }
  
  .loading-subtext {
    font-size: 0.75rem;
  }
}
</style>
