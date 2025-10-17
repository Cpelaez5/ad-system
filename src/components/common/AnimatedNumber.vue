<template>
  <span>{{ displayText }}</span>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  // Target value. Accepts number or locale-formatted string (e.g., "410.000,00").
  value: {
    type: [Number, String],
    required: true,
  },
  // Optional starting value for the animation.
  start: {
    type: [Number, String],
    default: 0,
  },
  // Base animation duration in ms. Actual duration adapts to distance within bounds.
  duration: {
    type: Number,
    default: 800,
  },
  // Use adaptive duration based on distance between start and end. If false, uses fixed duration.
  adaptive: {
    type: Boolean,
    default: false,
  },
  // Minimum and maximum duration caps.
  minDuration: {
    type: Number,
    default: 300,
  },
  maxDuration: {
    type: Number,
    default: 1200,
  },
  // Locale to format numbers (e.g., 'es-VE' for 410.000,00)
  locale: {
    type: String,
    default: 'es-VE',
  },
  // Intl.NumberFormat options override. If provided, takes precedence over fraction props.
  formatOptions: {
    type: Object,
    default: () => ({}),
  },
  // Optional custom formatter: (number) => string. If provided, used instead of Intl.
  formatter: {
    type: Function,
    default: null,
  },
  // Fraction digits when not using explicit formatOptions.
  minimumFractionDigits: {
    type: Number,
    default: 2,
  },
  maximumFractionDigits: {
    type: Number,
    default: 2,
  },
  // Easing: 'linear' | 'easeOutQuad' | 'easeOutCubic' | 'easeOutQuart' | 'easeOutQuint' | 'easeOutExpo' | custom function
  easing: {
    type: [String, Function],
    default: 'easeOutCubic',
  },
  // Start animating only when component becomes visible.
  animateOnVisible: {
    type: Boolean,
    default: true,
  },
  // Respect reduced motion preference.
  respectReducedMotion: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['start', 'end'])

let rafId = 0
let visibleObserver = null
const isAnimating = ref(false)
const isVisible = ref(false)
const displayText = ref('')

const prefersReducedMotion = computed(() => {
  if (!props.respectReducedMotion) return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (_) {
    return false
  }
})

function parseLocaleNumber(input) {
  if (typeof input === 'number') return input
  if (typeof input !== 'string') return 0

  const sample = 1000.5
  const formatted = new Intl.NumberFormat(props.locale).format(sample)
  // Detect separators from the locale
  const groupSep = formatted.includes('.') && formatted.indexOf('.') < formatted.indexOf('5') ? '.' : formatted.includes('\u00A0') ? '\\u00A0' : formatted[1]
  // Better detection: replace all non-digits except decimal separator
  const decimalSep = formatted.includes('.') ? '.' : formatted.includes(',') ? ',' : '.'

  const normalized = input
    .replace(new RegExp(`[^0-9${decimalSep === '.' ? '\\.' : ','}]`, 'g'), '')
    .replace(decimalSep === ',' ? /,(?=[0-9]{1,})/ : /\.(?=[0-9]{1,})/, '.')

  const num = Number(normalized)
  return Number.isFinite(num) ? num : 0
}

function getNumberFormatter() {
  if (props.formatOptions && Object.keys(props.formatOptions).length > 0) {
    return new Intl.NumberFormat(props.locale, props.formatOptions)
  }
  return new Intl.NumberFormat(props.locale, {
    style: 'decimal',
    minimumFractionDigits: props.minimumFractionDigits,
    maximumFractionDigits: props.maximumFractionDigits,
  })
}

const formatter = computed(() => getNumberFormatter())

function ease(t) {
  if (typeof props.easing === 'function') return props.easing(t)
  switch (props.easing) {
    case 'linear':
      return t
    case 'easeOutQuad':
      return 1 - (1 - t) * (1 - t)
    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3)
    case 'easeOutQuart':
      return 1 - Math.pow(1 - t, 4)
    case 'easeOutQuint':
      return 1 - Math.pow(1 - t, 5)
    case 'easeOutExpo':
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    default:
      // fallback to easeOutCubic
      return 1 - Math.pow(1 - t, 3)
  }
}

function computeAdaptiveDuration(startValue, endValue) {
  const distance = Math.abs(endValue - startValue)
  if (distance === 0) return 0
  // Logarithmic scaling for perceived speed; clamp between min and max
  const scaled = props.duration * (Math.log10(distance + 1) / Math.log10(1000 + 1))
  return Math.min(props.maxDuration, Math.max(props.minDuration, Math.round(scaled)))
}

function computeFixedDuration() {
  return Math.min(props.maxDuration, Math.max(props.minDuration, Math.round(props.duration)))
}

function setDisplay(value) {
  if (typeof props.formatter === 'function') {
    try {
      displayText.value = props.formatter(value)
      return
    } catch (_) {
      // Fallback to Intl if custom formatter fails
    }
  }
  displayText.value = formatter.value.format(value)
}

function cancelAnimation() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  isAnimating.value = false
}

function animateFromTo(startValue, endValue, durationMs) {
  if (prefersReducedMotion.value || durationMs === 0) {
    setDisplay(endValue)
    emit('end', endValue)
    return
  }

  const startTime = performance.now()
  isAnimating.value = true
  emit('start', startValue)

  const update = (now) => {
    const elapsed = now - startTime
    const t = Math.min(elapsed / durationMs, 1)
    const progress = ease(t)
    const current = startValue + (endValue - startValue) * progress

    setDisplay(current)

    if (t < 1) {
      rafId = requestAnimationFrame(update)
    } else {
      isAnimating.value = false
      emit('end', endValue)
    }
  }

  rafId = requestAnimationFrame(update)
}

function runAnimation() {
  cancelAnimation()
  const startNum = parseLocaleNumber(props.start)
  const endNum = parseLocaleNumber(props.value)
  if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
    setDisplay(0)
    return
  }
  const durationMs = props.adaptive ? computeAdaptiveDuration(startNum, endNum) : computeFixedDuration()
  animateFromTo(startNum, endNum, durationMs)
}

// Handle value updates: animate from last shown numeric value
watch(
  () => props.value,
  (next) => {
    if (prefersReducedMotion.value) {
      setDisplay(parseLocaleNumber(next))
      return
    }
    // Extract current displayed numeric value by formatting a parse roundtrip
    const currentNumeric = parseLocaleNumber(displayText.value || props.start)
    const nextNumeric = parseLocaleNumber(next)
    if (currentNumeric === nextNumeric) return
    const durationMs = props.adaptive ? computeAdaptiveDuration(currentNumeric, nextNumeric) : computeFixedDuration()
    animateFromTo(currentNumeric, nextNumeric, durationMs)
  }
)

onMounted(() => {
  const startNum = parseLocaleNumber(props.start)
  setDisplay(startNum)

  if (!props.animateOnVisible) {
    isVisible.value = true
    runAnimation()
    return
  }

  try {
    visibleObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !isVisible.value) {
          isVisible.value = true
          runAnimation()
        }
      }
    }, { threshold: 0.1 })
    // Observe the component root element
    const el = (getCurrentInstance && getCurrentInstance()?.proxy?.$el) || null
    if (el && el.nodeType === 1) {
      visibleObserver.observe(el)
    } else {
      // Fallback: run immediately if element cannot be observed
      isVisible.value = true
      runAnimation()
    }
  } catch (_) {
    isVisible.value = true
    runAnimation()
  }
})

onBeforeUnmount(() => {
  cancelAnimation()
  if (visibleObserver) {
    try { visibleObserver.disconnect() } catch (_) {}
    visibleObserver = null
  }
})
</script>

<style scoped>
/* Inherit font and layout from parent; no extra styles to keep it lightweight */
</style>


