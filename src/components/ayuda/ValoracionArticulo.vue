<template>
  <section class="valoracion" aria-label="¿Te sirvió esta guía?">
    <p class="valoracion__pregunta">¿Te sirvió?</p>
    <div class="valoracion__botones" role="group" aria-label="Tu opinión">
      <v-btn
        variant="tonal"
        size="large"
        class="text-none"
        :color="voto === 'si' ? 'success' : undefined"
        :aria-pressed="voto === 'si' ? 'true' : 'false'"
        data-testid="ayuda-util-si"
        @click="voto = 'si'"
      >
        <span aria-hidden="true" class="valoracion__emoji">👍</span> Sí
      </v-btn>
      <v-btn
        variant="tonal"
        size="large"
        class="text-none"
        :color="voto === 'no' ? 'warning' : undefined"
        :aria-pressed="voto === 'no' ? 'true' : 'false'"
        data-testid="ayuda-util-no"
        @click="voto = 'no'"
      >
        <span aria-hidden="true" class="valoracion__emoji">👎</span> No mucho
      </v-btn>
    </div>
    <p v-if="voto === 'si'" class="valoracion__gracias" role="status">¡Gracias! Nos alegra haberte ayudado.</p>
    <p v-else-if="voto === 'no'" class="valoracion__gracias" role="status">Gracias por decírnoslo. Escríbenos por el chat y te ayudamos.</p>

    <div class="valoracion__chat">
      <v-btn color="primary" variant="flat" size="large" prepend-icon="mdi-chat-outline" class="text-none" data-testid="ayuda-chat" @click="escribir">
        Escríbenos por el chat
      </v-btn>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
// Solo visual por ahora: no se guarda en ninguna base de datos.
const voto = ref(null)

function esCliente() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}')?.role === 'cliente'
  } catch {
    return false
  }
}

/** Con sesión de cliente abre el chat de soporte; sin sesión, lleva a entrar (el chat vive dentro de la cuenta). */
function escribir() {
  if (esCliente()) {
    window.dispatchEvent(new CustomEvent('ad-open-support-chat'))
    return
  }
  router.push({ path: '/login' })
}
</script>

<style scoped>
.valoracion {
  margin-top: 40px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 16px;
  max-width: 72ch;
}
.valoracion__pregunta { font-size: 1.2rem; font-weight: 700; margin: 0 0 12px; }
.valoracion__botones { display: flex; flex-wrap: wrap; gap: 12px; }
.valoracion__emoji { margin-right: 6px; font-size: 1.2rem; }
.valoracion__gracias { margin: 12px 0 0; }
.valoracion__chat { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
</style>
