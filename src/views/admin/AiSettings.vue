<template>
  <v-container fluid class="pa-4 pa-sm-6 ai-settings-container">
    <!-- Encabezado -->
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex justify-space-between align-center flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-white mb-2">Configuración de Inteligencia Artificial</h1>
          <p class="text-body-1 text-grey-lighten-1 mb-0">
            Gestiona los perfiles de proveedores IA (Gemini, Deepseek, etc.) y monitorea el consumo del OCR.
          </p>
        </div>
        <div class="d-flex gap-3">
          <v-btn
            color="#e0b04f"
            variant="elevated"
            class="text-black font-weight-bold px-6 rounded-pill"
            @click="openNewModal"
            :disabled="loading"
          >
            <v-icon icon="mdi-plus" class="mr-2" size="small"></v-icon>
            Nuevo Perfil
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Pestañas -->
    <v-tabs v-model="activeTab" color="#e0b04f" bg-color="transparent" class="mb-6" theme="dark">
      <v-tab value="config" class="text-none font-weight-bold">
        <v-icon start>mdi-cog</v-icon> Perfiles y Auditoría
      </v-tab>
      <v-tab value="demo" class="text-none font-weight-bold">
        <v-icon start>mdi-flask</v-icon> Laboratorio de Pruebas
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab" class="overflow-visible">
      
      <!-- Pestaña Configuración -->
      <v-window-item value="config">
        <v-row>
      <!-- Panel de Perfiles (Izquierda) -->
      <v-col cols="12" md="5" lg="4">
        <h3 class="text-h6 text-white mb-4 font-weight-bold">Perfiles Disponibles</h3>
        
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="#e0b04f"></v-progress-circular>
        </div>
        
        <div v-else-if="profiles.length === 0" class="text-center py-10 bg-surface-dark rounded-lg border-thin">
          <v-icon icon="mdi-robot-off-outline" size="large" color="grey-lighten-1" class="mb-3"></v-icon>
          <p class="text-body-2 text-grey-lighten-1 mb-0">No tienes perfiles configurados.</p>
        </div>
        
        <div v-else class="d-flex flex-column gap-4">
          <!-- Tarjetas de cada perfil -->
          <v-card 
            v-for="profile in profiles" 
            :key="profile.id"
            :color="profile.is_active ? '#1F355C' : 'rgba(255,255,255,0.05)'" 
            theme="dark" 
            elevation="2" 
            class="rounded-lg transition-fast-in-fast-out"
            :class="profile.is_active ? 'border-active' : 'border-thin'"
          >
            <v-card-text class="pa-4">
              <div class="d-flex justify-space-between align-start mb-3">
                <div>
                  <div class="d-flex align-center gap-2 mb-1">
                    <span class="text-subtitle-1 font-weight-bold text-white">{{ profile.profile_name }}</span>
                    <v-chip v-if="profile.is_active" color="success" size="x-small" variant="flat" class="text-uppercase font-weight-bold">
                      Activo
                    </v-chip>
                  </div>
                  <div class="text-caption text-grey-lighten-1 text-capitalize">
                    <v-icon :icon="profile.provider === 'gemini' ? 'mdi-google' : 'mdi-brain'" size="x-small" class="mr-1"></v-icon>
                    {{ profile.provider }} • {{ profile.model }}
                  </div>
                </div>
                <!-- Menú de acciones -->
                <v-menu location="bottom end">
                  <template v-slot:activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" color="grey-lighten-1" v-bind="props"></v-btn>
                  </template>
                  <v-list density="compact" bg-color="#1F355C" theme="dark">
                    <v-list-item @click="openEditModal(profile)">
                      <template v-slot:prepend><v-icon icon="mdi-pencil" size="small" class="mr-2"></v-icon></template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="!profile.is_active" @click="deleteProfile(profile.id)" class="text-error">
                      <template v-slot:prepend><v-icon icon="mdi-delete" size="small" class="mr-2" color="error"></v-icon></template>
                      <v-list-item-title>Eliminar</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <div class="d-flex align-center mb-4">
                <v-icon icon="mdi-key-variant" color="grey-lighten-1" size="x-small" class="mr-2"></v-icon>
                <span class="text-body-2 text-grey-lighten-1 font-mono">••••••••••••{{ profile.key_suffix }}</span>
              </div>

              <!-- Botón Activar (si no es activo) -->
              <v-btn
                v-if="!profile.is_active"
                block
                variant="outlined"
                color="grey-lighten-1"
                class="text-none font-weight-medium rounded-pill"
                @click="activateProfile(profile)"
                :loading="activatingId === profile.id"
                :disabled="activatingId !== null"
              >
                Cambiar a este modelo
              </v-btn>
              
              <!-- Estado de conexión (si es activo) -->
              <div v-else class="d-flex align-center bg-black-transparent pa-2 rounded">
                <v-icon :icon="statusIcon" :color="statusColor" size="small" class="mr-2"></v-icon>
                <span class="text-caption" :class="`text-${statusColor}`">{{ statusText }}</span>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-col>

      <!-- Historial de Uso (Derecha) -->
      <v-col cols="12" md="7" lg="8">
        <h3 class="text-h6 text-white mb-4 font-weight-bold d-flex align-center">
          Auditoría de Uso Reciente
          <v-spacer></v-spacer>
          <v-btn icon="mdi-refresh" variant="text" size="small" color="grey-lighten-1" @click="loadUsageLogs" :loading="loadingLogs"></v-btn>
        </h3>
        
        <v-card color="#1F355C" theme="dark" elevation="4" class="rounded-lg fill-height border-thin">
          <v-card-text class="pa-0">
            <!-- Vista Móvil (Tarjetas) -->
            <div class="d-md-none pa-4">
              <div v-if="loadingLogs" class="text-center py-4">
                <v-progress-circular indeterminate color="#e0b04f"></v-progress-circular>
              </div>
              <div v-else-if="usageLogs.length === 0" class="text-center py-8">
                <p class="text-grey-lighten-1">No hay registros de uso aún.</p>
              </div>
              <div v-else class="d-flex flex-column gap-3">
                <v-card v-for="log in usageLogs" :key="log.id" color="rgba(255,255,255,0.05)" flat class="border-thin">
                  <v-card-text class="pa-3">
                    <div class="d-flex justify-space-between align-center mb-2">
                      <span class="text-caption text-grey-lighten-1">{{ formatDate(log.created_at) }}</span>
                      <v-chip :color="log.status === 'success' ? 'success' : 'error'" size="x-small" variant="flat">
                        {{ log.status === 'success' ? 'Éxito' : 'Fallo' }}
                      </v-chip>
                    </div>
                    <div class="d-flex justify-space-between align-center">
                      <span class="text-body-2 font-weight-medium">{{ log.model }}</span>
                      <span class="text-body-2 text-gold font-mono">{{ log.costo_estimado ? '$' + Number(log.costo_estimado).toFixed(6) : '-' }}</span>
                    </div>
                    <div v-if="log.error_code" class="mt-2 text-caption text-error">
                      <v-icon icon="mdi-alert" size="x-small" class="mr-1"></v-icon>
                      {{ log.error_code }}
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>

            <!-- Vista Desktop (Tabla) -->
            <v-table class="bg-transparent d-none d-md-block" density="comfortable" hover>
              <thead>
                <tr>
                  <th class="text-grey-lighten-1 font-weight-bold text-left">Fecha</th>
                  <th class="text-grey-lighten-1 font-weight-bold text-left">Estado</th>
                  <th class="text-grey-lighten-1 font-weight-bold text-left">Modelo</th>
                  <th class="text-grey-lighten-1 font-weight-bold text-right">Costo (USD)</th>
                  <th class="text-grey-lighten-1 font-weight-bold text-left">Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingLogs">
                  <td colspan="5" class="text-center py-4">
                    <v-progress-circular indeterminate color="#e0b04f" size="24"></v-progress-circular>
                  </td>
                </tr>
                <tr v-else-if="usageLogs.length === 0">
                  <td colspan="5" class="text-center py-8 text-grey-lighten-1">No hay registros de uso aún.</td>
                </tr>
                <tr v-else v-for="log in usageLogs" :key="log.id">
                  <td class="text-body-2 text-grey-lighten-2">{{ formatDate(log.created_at) }}</td>
                  <td>
                    <v-chip :color="log.status === 'success' ? 'success' : 'error'" size="small" variant="flat">
                      {{ log.status === 'success' ? 'Éxito' : 'Fallo' }}
                    </v-chip>
                  </td>
                  <td class="text-body-2 text-white">{{ log.model }}</td>
                  <td class="text-body-2 text-gold font-mono text-right">
                    {{ log.costo_estimado ? '$' + Number(log.costo_estimado).toFixed(6) : '-' }}
                  </td>
                  <td class="text-caption text-grey-lighten-1 text-truncate" style="max-width: 150px;" :title="log.error_message">
                    {{ log.error_code || '-' }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
      </v-window-item>

      <!-- Pestaña Demo / Pruebas -->
      <v-window-item value="demo">
        
        <div class="d-flex justify-center mb-6">
          <v-btn-toggle 
            v-model="demoType" 
            color="#e0b04f" 
            mandatory 
            rounded="pill" 
            class="border-thin bg-surface-dark"
          >
            <v-btn value="ocr" class="text-none font-weight-medium px-6">
              <v-icon start size="small">mdi-file-document-outline</v-icon>
              Extraer Factura
            </v-btn>
            <v-btn value="chat" class="text-none font-weight-medium px-6">
              <v-icon start size="small">mdi-message-text-outline</v-icon>
              Chat Libre
            </v-btn>
          </v-btn-toggle>
        </div>

        <v-card color="#121212" theme="dark" elevation="0" class="border-thin rounded-lg">
          <OCRDemo v-if="demoType === 'ocr'" />
          <AiChatDemo v-if="demoType === 'chat'" />
        </v-card>

      </v-window-item>

    </v-window>

    <!-- Modal de Edición/Creación -->
    <v-dialog v-model="showEditModal" max-width="500px" persistent>
      <v-card color="#1F355C" theme="dark" class="rounded-lg border-thin">
        <v-card-title class="text-h6 font-weight-bold pa-5 pb-3">
          {{ editForm.id ? 'Editar Perfil IA' : 'Nuevo Perfil IA' }}
        </v-card-title>
        
        <v-card-text class="pa-5 pt-0">
          <v-form ref="form" @submit.prevent="saveSettings" :disabled="saving">
            
            <v-text-field
              v-model="editForm.profileName"
              label="Nombre del Perfil"
              placeholder="Ej. Gemini Producción"
              variant="outlined"
              color="#e0b04f"
              bg-color="rgba(0,0,0,0.2)"
              class="mb-4"
              required
            ></v-text-field>

            <v-select
              v-model="editForm.provider"
              :items="[
                { title: 'Google Gemini', value: 'gemini' },
                { title: 'DeepSeek', value: 'deepseek' }
              ]"
              label="Proveedor"
              variant="outlined"
              color="#e0b04f"
              bg-color="rgba(0,0,0,0.2)"
              class="mb-4"
              hide-details="auto"
            ></v-select>

            <v-text-field
              v-model="editForm.model"
              label="Modelo API"
              placeholder="ej. gemini-3.7-flash"
              variant="outlined"
              color="#e0b04f"
              bg-color="rgba(0,0,0,0.2)"
              hint="Sugerencias: gemini-3.1-pro-preview, gemini-3.7-flash, deepseek-chat"
              persistent-hint
              class="mb-4"
              required
            ></v-text-field>

            <v-text-field
              v-model="editForm.apiKey"
              label="Llave de API"
              type="password"
              autocomplete="new-password"
              :placeholder="editForm.id ? 'Deja en blanco para mantener la actual' : 'Pega tu API Key aquí'"
              variant="outlined"
              color="#e0b04f"
              bg-color="rgba(0,0,0,0.2)"
              :required="!editForm.id"
              hide-details="auto"
            ></v-text-field>

          </v-form>
        </v-card-text>

        <v-divider color="rgba(255,255,255,0.1)"></v-divider>

        <v-card-actions class="pa-4 bg-black-transparent">
          <v-spacer></v-spacer>
          <v-btn
            color="grey-lighten-1"
            variant="text"
            @click="showEditModal = false"
            :disabled="saving"
            class="text-none font-weight-medium"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="#e0b04f"
            variant="flat"
            @click="saveSettings"
            :loading="saving"
            class="text-black font-weight-bold px-4 ml-2 text-none"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import OCRDemo from '@/views/shared/OCRDemo.vue';
import AiChatDemo from '@/components/chat/AiChatDemo.vue';

const activeTab = ref('config');
const demoType = ref('chat'); // chat por defecto para probar la novedad
const form = ref(null);

const loading = ref(true);
const loadingLogs = ref(true);
const saving = ref(false);
const activatingId = ref(null);
const showEditModal = ref(false);

const profiles = ref([]);
const usageLogs = ref([]);
const connectionStatus = ref('connected'); // Solo aplica al perfil activo

const editForm = ref({
  id: null,
  profileName: '',
  provider: 'gemini',
  model: 'gemini-3.7-flash',
  apiKey: ''
});

// Computed properties for Active Profile
const activeProfile = computed(() => {
  return profiles.value.find(p => p.is_active) || null;
});

const statusColor = computed(() => {
  if (connectionStatus.value === 'connected') return 'success';
  if (connectionStatus.value === 'invalid_key') return 'error';
  if (connectionStatus.value === 'quota_exceeded') return 'warning';
  return 'grey';
});

const statusIcon = computed(() => {
  if (connectionStatus.value === 'connected') return 'mdi-check-circle';
  if (connectionStatus.value === 'invalid_key') return 'mdi-close-circle';
  if (connectionStatus.value === 'quota_exceeded') return 'mdi-alert-circle';
  return 'mdi-help-circle';
});

const statusText = computed(() => {
  if (connectionStatus.value === 'connected') return 'Conexión Establecida';
  if (connectionStatus.value === 'invalid_key') return 'Llave Inválida / Rechazada';
  if (connectionStatus.value === 'quota_exceeded') return 'Límite de Cuota Alcanzado';
  return 'Estado Desconocido';
});

onMounted(async () => {
  await loadProfiles();
  await loadUsageLogs();
});

function openNewModal() {
  editForm.value = {
    id: null,
    profileName: '',
    provider: 'gemini',
    model: '',
    apiKey: ''
  };
  showEditModal.value = true;
}

function openEditModal(profile) {
  editForm.value = {
    id: profile.id,
    profileName: profile.profile_name,
    provider: profile.provider,
    model: profile.model,
    apiKey: '' // No mostrar por seguridad
  };
  showEditModal.value = true;
}

async function loadProfiles() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('ai_provider_profiles')
      .select('*')
      .order('is_active', { ascending: false }) // Activo primero
      .order('created_at', { ascending: false });
      
    if (data) {
      profiles.value = data;
      checkConnectionStatus();
    }
  } catch (err) {
    console.error("Error cargando perfiles:", err);
  } finally {
    loading.value = false;
  }
}

async function activateProfile(profile) {
  if (profile.is_active) return;
  activatingId.value = profile.id;
  try {
    // 1. Apagar todos primero para evitar conflicto en el índice único parcial
    const { error: err1 } = await supabase
      .from('ai_provider_profiles')
      .update({ is_active: false })
      .eq('is_active', true);
    if (err1) throw err1;

    // 2. Encender el seleccionado
    const { error: err2 } = await supabase
      .from('ai_provider_profiles')
      .update({ is_active: true })
      .eq('id', profile.id);
    if (err2) throw err2;

    await loadProfiles();
  } catch (err) {
    console.error("Error activando perfil:", err);
    alert('Error al cambiar de perfil. Inténtalo de nuevo.');
  } finally {
    activatingId.value = null;
  }
}

async function deleteProfile(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este perfil IA?')) return;
  try {
    await supabase.from('ai_provider_profiles').delete().eq('id', id);
    await loadProfiles();
  } catch (err) {
    console.error("Error eliminando perfil:", err);
  }
}

async function loadUsageLogs() {
  loadingLogs.value = true;
  try {
    const { data } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
      
    if (data) {
      usageLogs.value = data;
      checkConnectionStatus(); 
    }
  } catch (err) {
    console.error("Error cargando logs:", err);
  } finally {
    loadingLogs.value = false;
  }
}

function checkConnectionStatus() {
  if (!usageLogs.value.length || !activeProfile.value) return;
  
  // Validamos si el último log pertenece al modelo actualmente activo
  const lastLog = usageLogs.value[0];
  if (lastLog.provider !== activeProfile.value.provider || lastLog.model !== activeProfile.value.model) {
    connectionStatus.value = 'connected'; // Asumimos OK hasta que haya un log real
    return;
  }

  if (lastLog.status === 'success') {
    connectionStatus.value = 'connected';
  } else if (lastLog.error_code === 'INVALID_KEY') {
    connectionStatus.value = 'invalid_key';
  } else if (lastLog.error_code === 'QUOTA_EXCEEDED' || lastLog.error_code === 'PREVIEW_RATE_LIMIT') {
    connectionStatus.value = 'quota_exceeded';
  }
}

async function saveSettings() {
  if (!editForm.value.profileName || !editForm.value.model || (!editForm.value.id && !editForm.value.apiKey)) {
    alert("Por favor completa los campos requeridos.");
    return;
  }

  saving.value = true;
  try {
    let keySuffix = '0000';
    if (editForm.value.apiKey) {
      const keyStr = editForm.value.apiKey;
      keySuffix = keyStr.substring(keyStr.length - 4);
    }

    const payload = {
      profile_name: editForm.value.profileName,
      provider: editForm.value.provider,
      model: editForm.value.model,
    };
    
    if (editForm.value.apiKey) {
      // FIX: En backend real, encriptar vía RPC o Edge Function
      payload.encrypted_api_key = editForm.value.apiKey; 
      payload.key_suffix = keySuffix;
    }

    if (editForm.value.id) {
      // Actualizar existente
      const { error } = await supabase.from('ai_provider_profiles')
        .update(payload)
        .eq('id', editForm.value.id);
      if (error) throw error;
    } else {
      // Crear nuevo (Será inactivo por defecto si ya hay otro activo, o activo si es el primero)
      payload.is_active = profiles.value.length === 0;
      const { error } = await supabase.from('ai_provider_profiles')
        .insert(payload);
      if (error) throw error;
    }
    
    showEditModal.value = false;
    await loadProfiles();
    
  } catch (err) {
    console.error(err);
    alert('Error al guardar la configuración: ' + (err.message || 'Error desconocido'));
  } finally {
    saving.value = false;
  }
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString('es-VE', { 
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
</script>

<style scoped>
.ai-settings-container {
  background-color: #010101;
  min-height: 100vh;
}

.border-thin {
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.border-active {
  border: 1px solid #e0b04f !important;
  box-shadow: 0 0 10px rgba(224, 176, 79, 0.1) !important;
}

/* Forzar color blanco/gris en pestañas inactivas */
:deep(.v-tab:not(.v-tab--selected)) {
  color: #BDBDBD !important;
}

.text-gold {
  color: #e0b04f !important;
}

.bg-black-transparent {
  background-color: rgba(0, 0, 0, 0.2) !important;
}
.bg-surface-dark {
  background-color: #121212 !important;
}

/* Scrollbar para la tabla en desktop */
.v-table {
  background: transparent !important;
}
.v-table th {
  background: rgba(0, 0, 0, 0.2) !important;
  border-bottom: 1px solid rgba(255,255,255,0.1) !important;
}
.v-table td {
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}
</style>
