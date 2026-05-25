<template>
  <v-container fluid class="pa-6 settings-page">

    <!-- ═══════════════════════════════════════════════ -->
    <!-- ENCABEZADO                                      -->
    <!-- ═══════════════════════════════════════════════ -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center ga-3">
          <div class="settings-icon-wrap">
            <v-icon size="28" color="white">mdi-cog</v-icon>
          </div>
          <div>
            <h1 class="text-h5 font-weight-bold" style="color:#1F355C;">Configuración</h1>
            <p class="text-body-2 text-grey-darken-1 ma-0">
              Personaliza cómo se comporta el sistema según tus preferencias.
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- TARJETAS DE CONFIGURACIÓN                       -->
    <!-- ═══════════════════════════════════════════════ -->
    <v-row>

      <!-- ─── Tasas de Cambio ─────────────────────────── -->
      <v-col cols="12" md="6">
        <v-card class="settings-card h-100" rounded="xl" elevation="0">
          <div class="settings-card-header">
            <v-icon color="white" class="mr-2">mdi-chart-line</v-icon>
            <span>Tasas de Cambio</span>
          </div>

          <v-card-text class="pa-6">
            <p class="text-body-2 text-grey-darken-2 mb-5">
              Selecciona cuáles tasas de cambio deseas ver en la barra superior del sistema.
            </p>

            <!-- Dólar -->
            <div class="pref-row mb-4">
              <div class="d-flex align-center ga-3">
                <div class="currency-icon-wrap usd">
                  <v-icon size="22" color="white">mdi-currency-usd</v-icon>
                </div>
                <div>
                  <p class="font-weight-semibold mb-0" style="color:#1F355C;">Dólar Americano (USD)</p>
                  <p class="text-caption text-grey ma-0">Tasa oficial BCV en tiempo real</p>
                </div>
              </div>
              <v-switch
                v-model="form.showUsdRate"
                color="primary"
                hide-details
                inset
                density="compact"
              />
            </div>

            <!-- Euro -->
            <div class="pref-row">
              <div class="d-flex align-center ga-3">
                <div class="currency-icon-wrap eur">
                  <v-icon size="22" color="white">mdi-currency-eur</v-icon>
                </div>
                <div>
                  <p class="font-weight-semibold mb-0" style="color:#1F355C;">Euro (EUR)</p>
                  <p class="text-caption text-grey ma-0">Tasa oficial BCV en tiempo real</p>
                </div>
              </div>
              <v-switch
                v-model="form.showEurRate"
                color="primary"
                hide-details
                inset
                density="compact"
              />
            </div>

            <!-- Aviso si ambas están desactivadas -->
            <v-alert
              v-if="!form.showUsdRate && !form.showEurRate"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-4"
              rounded="lg"
            >
              Se recomienda mostrar al menos una tasa de cambio.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ─── Notificaciones por Email ────────────────── -->
      <v-col cols="12" md="6">
        <v-card class="settings-card h-100" rounded="xl" elevation="0">
          <div class="settings-card-header">
            <v-icon color="white" class="mr-2">mdi-email-outline</v-icon>
            <span>Notificaciones por Correo</span>
          </div>

          <v-card-text class="pa-6">
            <p class="text-body-2 text-grey-darken-2 mb-5">
              Recibirás un correo automático cuando registres un documento.
              Puedes agregar correos adicionales (ej: tu contador) para que también los reciban.
            </p>

            <!-- Email principal del usuario (siempre incluido, no removible) -->
            <p class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2">
              Correo principal (siempre incluido)
            </p>
            <div class="primary-email-row mb-5">
              <div class="d-flex align-center ga-2">
                <v-icon color="secondary" size="18">mdi-lock</v-icon>
                <span class="text-body-2 font-weight-medium" style="color:#1F355C;">
                  {{ userEmail || 'Cargando...' }}
                </span>
              </div>
              <v-chip size="x-small" color="success" variant="tonal" class="ml-2">
                Predeterminado
              </v-chip>
            </div>
            <p class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2">
              Correos adicionales
            </p>

            <!-- Lista de correos -->
            <div v-if="form.notificationEmails.length > 0" class="mb-3">
              <v-chip
                v-for="(email, i) in form.notificationEmails"
                :key="i"
                closable
                color="secondary"
                variant="tonal"
                class="mr-2 mb-2"
                @click:close="removeEmail(i)"
              >
                <v-icon start size="14">mdi-email</v-icon>
                {{ email }}
              </v-chip>
            </div>

            <!-- Input para agregar correo -->
            <div class="d-flex ga-2 mb-5">
              <v-text-field
                v-model="newEmail"
                placeholder="correo@ejemplo.com"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :error-messages="emailError"
                prepend-inner-icon="mdi-email-plus-outline"
                @keyup.enter="addEmail"
                style="flex:1;"
              />
              <v-btn
                color="secondary"
                variant="tonal"
                @click="addEmail"
                :disabled="!newEmail"
                icon="mdi-plus"
              />
            </div>

            <!-- Toggles por tipo de flujo -->
            <p class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-3">
              Enviar notificación cuando registro...
            </p>

            <div class="pref-row mb-3">
              <div class="d-flex align-center ga-3">
                <v-icon color="success" size="22">mdi-arrow-up-circle</v-icon>
                <div>
                  <p class="font-weight-semibold mb-0" style="color:#1F355C;">Una Venta</p>
                  <p class="text-caption text-grey ma-0">Facturas y notas de venta</p>
                </div>
              </div>
              <v-switch
                v-model="form.notifyOnVenta"
                color="success"
                hide-details
                inset
                density="compact"
              />
            </div>

            <div class="pref-row mb-3">
              <div class="d-flex align-center ga-3">
                <v-icon color="primary" size="22">mdi-arrow-down-circle</v-icon>
                <div>
                  <p class="font-weight-semibold mb-0" style="color:#1F355C;">Una Compra</p>
                  <p class="text-caption text-grey ma-0">Facturas y notas de compra</p>
                </div>
              </div>
              <v-switch
                v-model="form.notifyOnCompra"
                color="primary"
                hide-details
                inset
                density="compact"
              />
            </div>

            <div class="pref-row">
              <div class="d-flex align-center ga-3">
                <v-icon color="warning" size="22">mdi-cash-minus</v-icon>
                <div>
                  <p class="font-weight-semibold mb-0" style="color:#1F355C;">Un Gasto</p>
                  <p class="text-caption text-grey ma-0">Registro de gastos operativos</p>
                </div>
              </div>
              <v-switch
                v-model="form.notifyOnGasto"
                color="warning"
                hide-details
                inset
                density="compact"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- BARRA DE ACCIÓN — GUARDAR                       -->
    <!-- ═══════════════════════════════════════════════ -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="save-bar" rounded="xl" elevation="0">
          <v-card-text class="d-flex align-center justify-space-between pa-4">
            <div class="d-flex align-center ga-2">
              <v-icon :color="isDirty ? 'warning' : 'success'" size="20">
                {{ isDirty ? 'mdi-circle-medium' : 'mdi-check-circle' }}
              </v-icon>
              <span class="text-body-2" :style="{ color: isDirty ? '#E0B04F' : '#4caf50' }">
                {{ isDirty ? 'Tienes cambios sin guardar' : 'Configuración actualizada' }}
              </span>
            </div>

            <div class="d-flex ga-3">
              <v-btn
                variant="text"
                color="grey"
                :disabled="!isDirty || saving"
                @click="resetForm"
              >
                Descartar cambios
              </v-btn>
              <v-btn
                color="primary"
                rounded="lg"
                :loading="saving"
                :disabled="!isDirty"
                min-width="140"
                @click="saveSettings"
                prepend-icon="mdi-content-save"
              >
                Guardar
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar de confirmación -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom right"
      :timeout="3000"
      rounded="lg"
    >
      <v-icon class="mr-2">{{ snackbar.icon }}</v-icon>
      {{ snackbar.text }}
    </v-snackbar>

  </v-container>
</template>

<script>
import userSettingsService from '@/services/user-settings-service.js'
import { supabase } from '@/lib/supabaseClient'

export default {
  name: 'SettingsView',

  data() {
    // Carga las configuraciones actuales como valores iniciales del formulario
    const saved = userSettingsService.getSettings()
    return {
      // Copia del formulario (se compara con 'original' para detectar cambios)
      form: { ...saved },
      original: { ...saved },

      // Email principal del usuario (siempre incluido, no removible)
      userEmail: '',

      // Estado de UI
      saving: false,
      newEmail: '',
      emailError: '',

      snackbar: {
        show: false,
        text: '',
        color: 'success',
        icon: 'mdi-check-circle',
      },
    }
  },

  async mounted() {
    // Cargar el email del usuario autenticado para mostrarlo como destinatario fijo
    try {
      const { data } = await supabase.auth.getUser()
      this.userEmail = data?.user?.email || ''
    } catch (e) {
      console.warn('No se pudo obtener email del usuario:', e)
    }
  },

  computed: {
    /** Detecta si hay cambios sin guardar comparando form vs original */
    isDirty() {
      return JSON.stringify(this.form) !== JSON.stringify(this.original)
    },
  },

  methods: {
    /** Agrega un correo a la lista de notificaciones */
    addEmail() {
      this.emailError = ''
      const email = this.newEmail.trim().toLowerCase()

      if (!email) return

      // Validación básica de formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        this.emailError = 'Formato de correo inválido'
        return
      }

      // Verificar duplicado
      if (this.form.notificationEmails.includes(email)) {
        this.emailError = 'Este correo ya está en la lista'
        return
      }

      // Agregar y limpiar input
      this.form.notificationEmails = [...this.form.notificationEmails, email]
      this.newEmail = ''
    },

    /** Elimina un correo de la lista por índice */
    removeEmail(index) {
      this.form.notificationEmails = this.form.notificationEmails.filter((_, i) => i !== index)
    },

    /** Guarda las configuraciones en localStorage y notifica al sistema */
    async saveSettings() {
      this.saving = true

      // Simular un pequeño delay para que el usuario vea el loading
      await new Promise(resolve => setTimeout(resolve, 500))

      userSettingsService.saveSettings({ ...this.form })

      // Actualizar 'original' para que isDirty vuelva a false
      this.original = { ...this.form }
      this.saving = false

      this.snackbar = {
        show: true,
        text: '¡Configuración guardada correctamente!',
        color: 'success',
        icon: 'mdi-check-circle',
      }
    },

    /** Descarta los cambios y vuelve a los valores guardados */
    resetForm() {
      this.form = { ...this.original }
      this.newEmail = ''
      this.emailError = ''
    },
  },
}
</script>

<style scoped>
.settings-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* Ícono del encabezado */
.settings-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #A81C22, #c0392b);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(168, 28, 34, 0.3);
}

/* Tarjetas */
.settings-card {
  border: 1px solid #e8ecf0;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}
.settings-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06) !important;
}

/* Header de cada tarjeta */
.settings-card-header {
  background: linear-gradient(135deg, #1F355C, #2d4a7a);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  color: white;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.3px;
}

/* Fila del email principal */
.primary-email-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  background: #eef2f7;
  border: 1px dashed #c5d0e0;
}

/* Fila de preferencia (label + switch) */
.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f8f9fb;
  transition: background 0.2s ease;
}
.pref-row:hover {
  background: #f0f3f8;
}

/* Íconos de moneda */
.currency-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.currency-icon-wrap.usd {
  background: linear-gradient(135deg, #1F355C, #2d4a7a);
}
.currency-icon-wrap.eur {
  background: linear-gradient(135deg, #02254d, #1F355C);
}

/* Barra de guardado */
.save-bar {
  border: 1px solid #e8ecf0;
  background: #fff;
}
</style>
