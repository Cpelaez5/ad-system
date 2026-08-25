<template>
  <v-container class="pa-4 pa-sm-6 d-flex flex-column" style="min-height: 500px;">
    <v-row class="mb-2 flex-grow-0">
      <v-col cols="12">
        <h1 class="text-h5 text-sm-h4 mb-1 font-weight-bold text-white d-flex align-center">
          <v-icon color="#e0b04f" class="mr-2" size="large">mdi-message-text-outline</v-icon>
          Demo: Chat con IA
        </h1>
        <p class="text-body-2 text-sm-body-1 text-grey-lighten-1 mb-0">
          Prueba la generación de texto libre con el perfil activo. Funciona con Gemini y DeepSeek.
        </p>
      </v-col>
    </v-row>

    <!-- Zona de Chat -->
    <v-row class="flex-grow-1 overflow-y-auto mb-4 custom-scrollbar" ref="chatContainer">
      <v-col cols="12" class="d-flex flex-column gap-3">
        <!-- Burbuja de bienvenida -->
        <div class="chat-message bot pa-3 rounded-lg bg-surface-dark border-thin text-body-2 text-white">
          ¡Hola! Soy la Inteligencia Artificial configurada en tu sistema contable. ¿En qué puedo ayudarte hoy?
        </div>

        <!-- Mensajes del usuario y bot -->
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          class="chat-message pa-3 rounded-lg text-body-2"
          :class="[
            msg.role === 'user' ? 'user align-self-end bg-primary text-white' : 'bot bg-surface-dark border-thin text-white'
          ]"
          style="max-width: 85%;"
        >
          <div v-if="msg.role === 'bot'" class="d-flex align-center mb-1 text-caption text-gold">
            <v-icon size="small" class="mr-1">mdi-robot-outline</v-icon> IA
          </div>
          <div v-else class="d-flex justify-end mb-1 text-caption text-grey-lighten-2">
            Tú <v-icon size="small" class="ml-1">mdi-account-outline</v-icon>
          </div>
          
          <!-- Si es error -->
          <div v-if="msg.isError" class="text-error font-weight-bold d-flex align-center">
            <v-icon size="small" class="mr-2">mdi-alert-circle</v-icon>
            {{ msg.content }}
          </div>
          <!-- Si es texto normal -->
          <div v-else style="white-space: pre-wrap;">{{ msg.content }}</div>
        </div>

        <!-- Indicador de escribiendo -->
        <div v-if="isTyping" class="chat-message bot pa-3 rounded-lg bg-surface-dark border-thin text-body-2 text-grey-lighten-1 d-flex align-center">
          <v-progress-circular indeterminate size="16" width="2" color="#e0b04f" class="mr-2"></v-progress-circular>
          La IA está pensando...
        </div>
      </v-col>
    </v-row>

    <!-- Input Box -->
    <v-row class="flex-grow-0 mt-auto">
      <v-col cols="12">
        <v-form @submit.prevent="sendMessage">
          <v-text-field
            v-model="promptInput"
            placeholder="Escribe tu mensaje aquí..."
            variant="outlined"
            color="#e0b04f"
            bg-color="#121212"
            hide-details
            :disabled="isTyping"
            append-inner-icon="mdi-send"
            @click:append-inner="sendMessage"
          ></v-text-field>
        </v-form>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { procesarChatIA } from '@/services/ai/aiChatService.js';

const promptInput = ref('');
const isTyping = ref(false);
const messages = ref([]);
const chatContainer = ref(null);

async function scrollToBottom() {
  await nextTick();
  if (chatContainer.value && chatContainer.value.$el) {
    const el = chatContainer.value.$el;
    el.scrollTop = el.scrollHeight;
  }
}

async function sendMessage() {
  const text = promptInput.value.trim();
  if (!text) return;

  // 1. Agregar mensaje del usuario
  messages.value.push({ role: 'user', content: text });
  promptInput.value = '';
  await scrollToBottom();

  // 2. Iniciar carga
  isTyping.value = true;
  await scrollToBottom();

  try {
    const data = await procesarChatIA(text);
    // 3. Agregar respuesta bot
    messages.value.push({ role: 'bot', content: data.text });
  } catch (error) {
    console.error('Error en Chat:', error);
    messages.value.push({ 
      role: 'bot', 
      content: `${error.code || 'ERROR'}: ${error.message || 'Ocurrió un error inesperado.'}`,
      isError: true 
    });
  } finally {
    isTyping.value = false;
    await scrollToBottom();
  }
}
</script>

<style scoped>
.gap-3 { gap: 12px; }
.bg-surface-dark { background-color: #121212 !important; }
.bg-primary { background-color: #1F355C !important; }
.text-gold { color: #e0b04f !important; }
.border-thin { border: 1px solid rgba(255, 255, 255, 0.1) !important; }

.chat-message.bot { align-self: flex-start; }
.chat-message.user { align-self: flex-end; border: 1px solid #2a477d; }

.custom-scrollbar {
  max-height: 400px;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.05); 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2); 
  border-radius: 4px;
}
</style>
