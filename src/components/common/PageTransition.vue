<template>
  <transition
    :name="transitionName"
    :mode="mode"
    @before-enter="beforeEnter"
    @enter="enter"
    @after-enter="afterEnter"
    @before-leave="beforeLeave"
    @leave="leave"
    @after-leave="afterLeave"
  >
    <slot></slot>
  </transition>
</template>

<script>
export default {
  name: 'PageTransition',
  props: {
    name: {
      type: String,
      default: 'fade'
    },
    mode: {
      type: String,
      default: 'out-in'
    },
    duration: {
      type: Number,
      default: 300
    }
  },
  computed: {
    transitionName() {
      return this.name
    }
  },
  methods: {
    beforeEnter(el) {
      this.$emit('before-enter', el)
    },
    enter(el, done) {
      this.$emit('enter', el, done)
      setTimeout(done, this.duration)
    },
    afterEnter(el) {
      this.$emit('after-enter', el)
    },
    beforeLeave(el) {
      this.$emit('before-leave', el)
    },
    leave(el, done) {
      this.$emit('leave', el, done)
      setTimeout(done, this.duration)
    },
    afterLeave(el) {
      this.$emit('after-leave', el)
    }
  }
}
</script>

<style scoped>
/* Transición de desvanecimiento */
.fade-enter-active,
.fade-leave-active {
  transition: all var(--transition-normal);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Transición de deslizamiento */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--transition-normal);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

/* Transición de escala */
.scale-enter-active,
.scale-leave-active {
  transition: all var(--transition-normal);
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(1.2);
}

/* Transición de rotación */
.rotate-enter-active,
.rotate-leave-active {
  transition: all var(--transition-slow);
}

.rotate-enter-from {
  opacity: 0;
  transform: rotate(-180deg) scale(0.8);
}

.rotate-leave-to {
  opacity: 0;
  transform: rotate(180deg) scale(1.2);
}

/* Transición de deslizamiento hacia arriba */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all var(--transition-normal);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

/* Transición de deslizamiento hacia abajo */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-normal);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* Transición de deslizamiento hacia la izquierda */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all var(--transition-normal);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

/* Transición de deslizamiento hacia la derecha */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all var(--transition-normal);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Transición de flip */
.flip-enter-active,
.flip-leave-active {
  transition: all var(--transition-slow);
}

.flip-enter-from {
  opacity: 0;
  transform: rotateY(-90deg);
}

.flip-leave-to {
  opacity: 0;
  transform: rotateY(90deg);
}

/* Transición de zoom */
.zoom-enter-active,
.zoom-leave-active {
  transition: all var(--transition-normal);
}

.zoom-enter-from {
  opacity: 0;
  transform: scale(0);
}

.zoom-leave-to {
  opacity: 0;
  transform: scale(0);
}

/* Transición de bounce */
.bounce-enter-active {
  animation: bounceIn var(--transition-slow) var(--ease-bounce);
}

.bounce-leave-active {
  animation: bounceOut var(--transition-normal) var(--ease-in);
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bounceOut {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
  100% {
    opacity: 0;
    transform: scale(0.3);
  }
}
</style>
