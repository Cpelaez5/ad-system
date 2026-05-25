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

    <v-row>
      <!-- ─── Apariencia ─────────────────────────────── -->
      <v-col cols="12">
        <v-card class="settings-card" rounded="xl" elevation="0">
          <div class="settings-card-header">
            <v-icon color="white" class="mr-2">mdi-palette</v-icon>
            <span>Apariencia</span>
          </div>

          <v-card-text class="pa-6">
            <div class="pref-row">
              <div class="d-flex align-center ga-3">
                <div class="currency-icon-wrap" style="background: linear-gradient(135deg, #1e1e1e, #333333);">
                  <v-icon size="20" color="white">mdi-theme-light-dark</v-icon>
                </div>
                <div>
                  <p class="font-weight-semibold mb-0 text-high-emphasis">Modo Oscuro</p>
                  <p class="text-caption text-grey ma-0">Aplica un tema oscuro a toda la aplicación</p>
                </div>
              </div>
              <v-switch v-model="form.forceDarkMode" color="primary" hide-details inset density="compact" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>

      <!-- ─── Tasas de Cambio ─────────────────────────── -->
      <v-col cols="12" md="5">
        <v-card class="settings-card h-100" rounded="xl" elevation="0">
          <div class="settings-card-header">
            <v-icon color="white" class="mr-2">mdi-chart-line</v-icon>
            <span>Tasas de Cambio</span>
          </div>

          <v-card-text class="pa-6">
            <p class="text-body-2 text-grey-darken-2 mb-5">
              Selecciona cuáles tasas deseas ver en la barra superior del sistema.
            </p>

            <!-- Dólar -->
            <div class="pref-row mb-3">
              <div class="d-flex align-center ga-3">
                <div class="currency-icon-wrap usd">
                  <v-icon size="20" color="white">mdi-currency-usd</v-icon>
                </div>
                <div>
                  <p class="font-weight-semibold mb-0 text-high-emphasis">Dólar (USD)</p>
                  <p class="text-caption text-grey ma-0">Tasa oficial BCV</p>
                </div>
              </div>
              <v-switch v-model="form.showUsdRate" color="primary" hide-details inset density="compact" />
            </div>

            <!-- Euro -->
            <div class="pref-row">
              <div class="d-flex align-center ga-3">
                <div class="currency-icon-wrap eur">
                  <v-icon size="20" color="white">mdi-currency-eur</v-icon>
                </div>
                <div>
                  <p class="font-weight-semibold mb-0 text-high-emphasis">Euro (EUR)</p>
                  <p class="text-caption text-grey ma-0">Tasa oficial BCV</p>
                </div>
              </div>
              <v-switch v-model="form.showEurRate" color="primary" hide-details inset density="compact" />
            </div>

            <v-alert
              v-if="!form.showUsdRate && !form.showEurRate"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-4"
              rounded="lg"
            >
              Se recomienda mostrar al menos una tasa.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ─── Notificaciones por Email ────────────────── -->
      <v-col cols="12" md="7">
        <v-card class="settings-card h-100" rounded="xl" elevation="0">
          <div class="settings-card-header">
            <v-icon color="white" class="mr-2">mdi-email-outline</v-icon>
            <span>Notificaciones por Correo</span>
          </div>

          <v-card-text class="pa-6">

            <!-- ── Correo principal (configurable) ── -->
            <p class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2">
              Correo principal
            </p>
            <div class="primary-email-row mb-5">
              <div class="d-flex align-center ga-2 flex-1">
                <v-icon color="secondary" size="18">mdi-shield-account</v-icon>
                <span class="text-body-2 font-weight-medium text-high-emphasis">
                  {{ userEmail || 'Cargando...' }}
                </span>
              </div>
              <div class="d-flex align-center ga-1 flex-wrap">
                <v-chip size="x-small" color="secondary" variant="tonal">Cuenta registrada</v-chip>
                <v-switch
                  v-model="form.notifyPrimaryEmail"
                  color="success"
                  hide-details
                  inset
                  density="compact"
                />
              </div>
            </div>
            <v-alert
              v-if="!form.notifyPrimaryEmail"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-5"
              rounded="lg"
            >
              No recibirás notificaciones en tu correo principal. Si no tienes correos adicionales activos, no se enviará ningún correo.
            </v-alert>

            <!-- ── Correos adicionales ── -->
            <p class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-3">
              Correos adicionales
              <span class="text-grey font-weight-regular normal-case ml-1">(opcional)</span>
            </p>

            <!-- Lista de correos adicionales con sus toggles -->
            <div v-if="form.notificationEmails.length > 0" class="mb-4">
              <div
                v-for="(entry, i) in form.notificationEmails"
                :key="i"
                class="email-entry-card mb-3"
              >
                <!-- Email + botón eliminar -->
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="d-flex align-center ga-2">
                    <v-icon color="secondary" size="16">mdi-email</v-icon>
                    <span class="text-body-2 font-weight-medium text-high-emphasis">
                      {{ entry.email }}
                    </span>
                  </div>
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeEmail(i)"
                  />
                </div>

                <!-- Toggles de flujo para este correo -->
                <p class="text-caption text-grey mb-2">Recibe notificación cuando registro:</p>
                <div class="d-flex ga-2 flex-wrap">
                  <v-chip
                    :color="entry.notifyOnVenta ? 'success' : 'grey-lighten-2'"
                    :variant="entry.notifyOnVenta ? 'flat' : 'tonal'"
                    size="small"
                    class="cursor-pointer flow-chip"
                    prepend-icon="mdi-arrow-up-circle"
                    @click="toggleFlow(i, 'notifyOnVenta')"
                  >
                    Venta
                    <v-icon end size="14">{{ entry.notifyOnVenta ? 'mdi-check' : 'mdi-close' }}</v-icon>
                  </v-chip>

                  <v-chip
                    :color="entry.notifyOnCompra ? 'primary' : 'grey-lighten-2'"
                    :variant="entry.notifyOnCompra ? 'flat' : 'tonal'"
                    size="small"
                    class="cursor-pointer flow-chip"
                    prepend-icon="mdi-arrow-down-circle"
                    @click="toggleFlow(i, 'notifyOnCompra')"
                  >
                    Compra
                    <v-icon end size="14">{{ entry.notifyOnCompra ? 'mdi-check' : 'mdi-close' }}</v-icon>
                  </v-chip>

                  <v-chip
                    :color="entry.notifyOnGasto ? 'warning' : 'grey-lighten-2'"
                    :variant="entry.notifyOnGasto ? 'flat' : 'tonal'"
                    size="small"
                    class="cursor-pointer flow-chip"
                    prepend-icon="mdi-cash-minus"
                    @click="toggleFlow(i, 'notifyOnGasto')"
                  >
                    Gasto
                    <v-icon end size="14">{{ entry.notifyOnGasto ? 'mdi-check' : 'mdi-close' }}</v-icon>
                  </v-chip>
                </div>
              </div>
            </div>

            <!-- Estado vacío -->
            <div v-else class="empty-emails mb-4">
              <v-icon color="grey-lighten-1" size="32">mdi-email-plus-outline</v-icon>
              <p class="text-caption text-grey mt-2 ma-0">
                Agrega correos adicionales para que otras personas también reciban notificaciones.
              </p>
            </div>

            <!-- ── Formulario para agregar correo ── -->
            <v-divider class="mb-4" />
            <p class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-3">
              Agregar correo adicional
            </p>

            <v-text-field
              v-model="newEmail"
              placeholder="correo@ejemplo.com"
              variant="outlined"
              density="compact"
              hide-details="auto"
              :error-messages="emailError"
              prepend-inner-icon="mdi-email-plus-outline"
              class="mb-3"
              @keyup.enter="addEmail"
            />

            <!-- Selección de flujos para el nuevo correo -->
            <p class="text-caption text-grey-darken-1 mb-2">¿Cuándo notificar a este correo?</p>
            <div class="d-flex ga-2 flex-wrap mb-4">
              <v-chip
                :color="newEmailFlows.notifyOnVenta ? 'success' : 'grey-lighten-2'"
                :variant="newEmailFlows.notifyOnVenta ? 'flat' : 'tonal'"
                size="small"
                class="cursor-pointer flow-chip"
                prepend-icon="mdi-arrow-up-circle"
                @click="newEmailFlows.notifyOnVenta = !newEmailFlows.notifyOnVenta"
              >
                Venta
                <v-icon end size="14">{{ newEmailFlows.notifyOnVenta ? 'mdi-check' : 'mdi-plus' }}</v-icon>
              </v-chip>

              <v-chip
                :color="newEmailFlows.notifyOnCompra ? 'primary' : 'grey-lighten-2'"
                :variant="newEmailFlows.notifyOnCompra ? 'flat' : 'tonal'"
                size="small"
                class="cursor-pointer flow-chip"
                prepend-icon="mdi-arrow-down-circle"
                @click="newEmailFlows.notifyOnCompra = !newEmailFlows.notifyOnCompra"
              >
                Compra
                <v-icon end size="14">{{ newEmailFlows.notifyOnCompra ? 'mdi-check' : 'mdi-plus' }}</v-icon>
              </v-chip>

              <v-chip
                :color="newEmailFlows.notifyOnGasto ? 'warning' : 'grey-lighten-2'"
                :variant="newEmailFlows.notifyOnGasto ? 'flat' : 'tonal'"
                size="small"
                class="cursor-pointer flow-chip"
                prepend-icon="mdi-cash-minus"
                @click="newEmailFlows.notifyOnGasto = !newEmailFlows.notifyOnGasto"
              >
                Gasto
                <v-icon end size="14">{{ newEmailFlows.notifyOnGasto ? 'mdi-check' : 'mdi-plus' }}</v-icon>
              </v-chip>
            </div>

            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-plus"
              :disabled="!newEmail"
              @click="addEmail"
              block
              rounded="lg"
            >
              Agregar correo
            </v-btn>

          </v-card-text>
        </v-card>
      </v-col>

    </v-row>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- BARRA DE ACCIÓN — GUARDAR                       -->
    <!-- ═══════════════════════════════════════════════ -->
    <v-row :class="['mt-4', 'transition-all', { 'sticky-bottom': isDirty }]">
      <v-col cols="12">
        <v-card :class="['save-bar', { 'save-bar-active': isDirty }]" rounded="xl" elevation="0">
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
                Descartar
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
    // Carga síncrona desde cache local (instantánea)
    const saved = userSettingsService.getSettings()
    return {
      form: {
        ...saved,
        // Asegurar que notificationEmails sea siempre array de objetos
        notificationEmails: (saved.notificationEmails || []).map(e =>
          typeof e === 'string'
            ? { email: e, notifyOnVenta: true, notifyOnCompra: true, notifyOnGasto: false }
            : e
        ),
      },
      original: JSON.parse(JSON.stringify(saved)),

      // Email del usuario registrado
      userEmail: '',

      // Indica si estamos cargando datos desde Supabase
      loadingRemote: true,

      // Estado del formulario de nuevo correo
      newEmail: '',
      emailError: '',
      newEmailFlows: {
        notifyOnVenta:  true,
        notifyOnCompra: true,
        notifyOnGasto:  false,
      },

      // Estado de UI
      saving: false,
      snackbar: {
        show: false,
        text: '',
        color: 'success',
        icon: 'mdi-check-circle',
      },
    }
  },

  async mounted() {
    try {
      // Obtener email del usuario autenticado
      const { data } = await supabase.auth.getUser()
      this.userEmail = data?.user?.email || ''
    } catch (e) {
      console.warn('No se pudo obtener email del usuario:', e)
    }

    // Cargar configuración fresca desde Supabase (reemplaza cache local si hay datos remotos)
    try {
      const remote = await userSettingsService.loadFromSupabase()
      this.form = {
        ...remote,
        notificationEmails: (remote.notificationEmails || []).map(e =>
          typeof e === 'string'
            ? { email: e, notifyOnVenta: true, notifyOnCompra: true, notifyOnGasto: false }
            : e
        ),
      }
      this.original = JSON.parse(JSON.stringify(this.form))
    } catch (e) {
      console.warn('No se pudo cargar configuración remota:', e)
    } finally {
      this.loadingRemote = false
    }
  },

  computed: {
    isDirty() {
      return JSON.stringify(this.form) !== JSON.stringify(this.original)
    },
  },

  methods: {
    /** Alterna un flujo (notifyOnVenta/Compra/Gasto) de un correo existente */
    toggleFlow(index, field) {
      // Crear una copia del array para que Vue detecte el cambio
      const emails = [...this.form.notificationEmails]
      emails[index] = { ...emails[index], [field]: !emails[index][field] }
      this.form.notificationEmails = emails
    },

    /** Agrega un nuevo correo con sus flujos configurados */
    addEmail() {
      this.emailError = ''
      const email = this.newEmail.trim().toLowerCase()

      if (!email) return

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        this.emailError = 'Formato de correo inválido'
        return
      }

      // Verificar que no sea el correo principal
      if (email === this.userEmail) {
        this.emailError = 'Este es tu correo principal, ya siempre recibe notificaciones'
        return
      }

      // Verificar duplicado
      if (this.form.notificationEmails.some(e => e.email === email)) {
        this.emailError = 'Este correo ya está en la lista'
        return
      }

      // Agregar con configuración de flujos seleccionada
      this.form.notificationEmails = [
        ...this.form.notificationEmails,
        {
          email,
          notifyOnVenta:  this.newEmailFlows.notifyOnVenta,
          notifyOnCompra: this.newEmailFlows.notifyOnCompra,
          notifyOnGasto:  this.newEmailFlows.notifyOnGasto,
        },
      ]

      // Limpiar formulario
      this.newEmail = ''
      this.newEmailFlows = { notifyOnVenta: true, notifyOnCompra: true, notifyOnGasto: false }
    },

    /** Elimina un correo adicional por índice */
    removeEmail(index) {
      this.form.notificationEmails = this.form.notificationEmails.filter((_, i) => i !== index)
    },

    /** Guarda las configuraciones en localStorage + Supabase */
    async saveSettings() {
      this.saving = true

      try {
        const result = await userSettingsService.saveSettings({ ...this.form })
        this.original = JSON.parse(JSON.stringify(this.form))

        if (result.success) {
          this.snackbar = {
            show: true,
            text: '¡Configuración guardada correctamente!',
            color: 'success',
            icon: 'mdi-check-circle',
          }
        } else {
          // Se guardó localmente pero falló Supabase
          this.snackbar = {
            show: true,
            text: 'Guardado localmente. Se sincronizará cuando haya conexión.',
            color: 'warning',
            icon: 'mdi-cloud-off-outline',
          }
        }
      } catch (e) {
        this.snackbar = {
          show: true,
          text: 'Error al guardar. Intenta nuevamente.',
          color: 'error',
          icon: 'mdi-alert-circle',
        }
      } finally {
        this.saving = false
      }
    },

    /** Descarta los cambios y vuelve al estado guardado */
    resetForm() {
      this.form = JSON.parse(JSON.stringify(this.original))
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

.settings-card {
  border: 1px solid #e8ecf0;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}
.settings-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06) !important;
}

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

/* Email principal fijo */
.primary-email-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.15);
}

/* Tarjeta de cada correo adicional */
.email-entry-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: border-color 0.2s ease;
}
.email-entry-card:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.2);
}

/* Estado vacío */
.empty-emails {
  text-align: center;
  padding: 20px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 12px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.15);
}

/* Chips de flujo clickeables */
.flow-chip {
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.flow-chip:hover {
  opacity: 0.85;
  transform: scale(1.03);
}

/* Fila de preferencia (tasas) */
.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  transition: background 0.2s ease;
}
.pref-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.currency-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.currency-icon-wrap.usd { background: linear-gradient(135deg, #1F355C, #2d4a7a); }
.currency-icon-wrap.eur { background: linear-gradient(135deg, #02254d, #1F355C); }

/* Barra de guardado */
.save-bar {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.save-bar-active {
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.2) !important;
}

.sticky-bottom {
  position: sticky;
  bottom: 24px;
  z-index: 90;
}

.transition-all {
  transition: all 0.3s ease;
}

.normal-case { text-transform: none; }
.flex-1 { flex: 1; }
</style>
