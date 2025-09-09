<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <v-snackbar
        v-for="notification in notifications"
        :key="notification.id"
        v-model="notification.show"
        :color="notification.color"
        :timeout="notification.timeout"
        :location="notification.location"
        :variant="notification.variant"
        class="notification-item animate-notification-in"
        @update:model-value="removeNotification(notification.id)"
      >
        <div class="notification-content">
          <v-icon 
            :icon="notification.icon" 
            :color="notification.iconColor"
            class="notification-icon animate-micro-rotate"
          ></v-icon>
          <div class="notification-text">
            <div class="notification-title animate-fade-in animate-delay-100">{{ notification.title }}</div>
            <div v-if="notification.message" class="notification-message animate-fade-in animate-delay-200">
              {{ notification.message }}
            </div>
          </div>
          <v-btn
            icon
            size="small"
            variant="text"
            @click="removeNotification(notification.id)"
            class="notification-close animate-micro-bounce"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </v-snackbar>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'NotificationSystem',
  data() {
    return {
      notifications: [],
      nextId: 1
    }
  },
  methods: {
    showNotification(options) {
      const notification = {
        id: this.nextId++,
        show: true,
        title: options.title || 'Notificación',
        message: options.message || '',
        color: options.color || 'primary',
        icon: options.icon || 'mdi-information',
        iconColor: options.iconColor || 'white',
        timeout: options.timeout || 5000,
        location: options.location || 'top right',
        variant: options.variant || 'elevated'
      }
      
      this.notifications.push(notification)
      
      // Auto-remove after timeout
      if (notification.timeout > 0) {
        setTimeout(() => {
          this.removeNotification(notification.id)
        }, notification.timeout)
      }
      
      return notification.id
    },
    
    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index > -1) {
        this.notifications.splice(index, 1)
      }
    },
    
    // Métodos de conveniencia
    success(title, message = '') {
      return this.showNotification({
        title,
        message,
        color: 'success',
        icon: 'mdi-check-circle',
        iconColor: 'white'
      })
    },
    
    error(title, message = '') {
      return this.showNotification({
        title,
        message,
        color: 'error',
        icon: 'mdi-alert-circle',
        iconColor: 'white',
        timeout: 7000
      })
    },
    
    warning(title, message = '') {
      return this.showNotification({
        title,
        message,
        color: 'warning',
        icon: 'mdi-alert',
        iconColor: 'white'
      })
    },
    
    info(title, message = '') {
      return this.showNotification({
        title,
        message,
        color: 'info',
        icon: 'mdi-information',
        iconColor: 'white'
      })
    }
  },
  
  mounted() {
    // Hacer los métodos disponibles globalmente
    this.$app.config.globalProperties.$notify = {
      show: this.showNotification,
      success: this.success,
      error: this.error,
      warning: this.warning,
      info: this.info
    }
  }
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.notification-item {
  pointer-events: auto;
  margin-bottom: 10px;
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-text {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 2px;
}

.notification-message {
  font-size: 0.8rem;
  line-height: 1.3;
  opacity: 0.9;
}

.notification-close {
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.notification-close:hover {
  opacity: 1;
}

/* Animaciones mejoradas */
.notification-enter-active {
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

.notification-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Efectos adicionales para notificaciones */
.notification-item {
  position: relative;
  overflow: hidden;
}

.notification-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: notificationShimmer 2s infinite;
}

@keyframes notificationShimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Animaciones específicas por tipo de notificación */
.notification-item.success {
  animation: successPulse 0.6s ease-out;
}

.notification-item.error {
  animation: errorShake 0.5s ease-out;
}

.notification-item.warning {
  animation: warningBounce 0.8s ease-out;
}

.notification-item.info {
  animation: infoSlide 0.4s ease-out;
}

@keyframes successPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes errorShake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-5px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(5px);
  }
}

@keyframes warningBounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

@keyframes infoSlide {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
