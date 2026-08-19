<template>
  <!-- Renderizado: Fullscreen en Móvil (100% de pantalla) / Dialog centrado en Desktop -->
  <v-dialog
    v-model="internalValue"
    :fullscreen="isMobile"
    :max-width="isMobile ? undefined : '680'"
    persistent
    scrollable
    transition="dialog-bottom-transition"
  >
    <v-card class="proveedor-modal-card d-flex flex-column h-100" :class="{ 'rounded-0': isMobile, 'rounded-xl': !isMobile }">
      <!-- ══════════════════════════════════════════════════════ -->
      <!-- 1. CABECERA Y PESTAÑAS (FIJAS SUPERIORES)             -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div class="flex-shrink-0 bg-secondary text-white">
        <!-- Barra de Título -->
        <div class="px-4 px-md-6 py-4 d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="38" class="mr-3 text-white elevation-1">
              <v-icon size="20" color="white">
                {{ isEdit ? 'mdi-account-edit' : 'mdi-domain-plus' }}
              </v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-bold text-subtitle-1 text-md-h6" style="line-height: 1.2;">
                {{ isEdit ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor' }}
              </div>
              <div class="text-caption text-grey-lighten-2 mt-0">
                Configuración general y retenciones fiscales
              </div>
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            color="white"
            @click="close"
          ></v-btn>
        </div>

        <!-- Pestañas de Navegación Integradas (Nunca tapadas) -->
        <v-tabs
          v-model="activeTab"
          color="accent"
          bg-color="rgba(0, 0, 0, 0.2)"
          grow
          height="48"
          slider-color="accent"
          class="modal-tabs-header"
        >
          <v-tab value="general" class="modal-tab-item text-white">
            <v-icon start size="18" color="white">mdi-card-account-details-outline</v-icon>
            <span class="font-weight-bold">Datos Generales</span>
          </v-tab>
          <v-tab value="fiscal" class="modal-tab-item text-white">
            <v-icon start size="18" color="white">mdi-shield-check-outline</v-icon>
            <span class="font-weight-bold">Parámetros Fiscales</span>
          </v-tab>
        </v-tabs>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- 2. CUERPO DEL FORMULARIO CON SCROLL INDEPENDIENTE      -->
      <!-- ══════════════════════════════════════════════════════ -->
      <v-card-text class="flex-grow-1 pa-4 pa-md-6 bg-white overflow-y-auto">
        <v-form ref="form" v-model="valid" @submit.prevent="save">
          <v-window v-model="activeTab">
            <!-- PESTAÑA 1: DATOS GENERALES -->
            <v-window-item value="general">
              <v-row dense>
                <!-- Razón Social -->
                <v-col cols="12">
                  <v-text-field
                    v-model="formData.nombre"
                    label="Nombre o Razón Social *"
                    placeholder="Ej. Inversiones y Servicios Alfa C.A."
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-domain"
                    :rules="[v => !!v || 'La razón social es obligatoria']"
                    class="mb-2"
                  ></v-text-field>
                </v-col>

                <!-- RIF y Tipo de Persona -->
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.rif"
                    label="RIF / Identificación *"
                    placeholder="J-12345678-0"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-card-account-details"
                    :rules="[
                      v => !!v || 'El RIF es obligatorio',
                      v => isValidRif(v) || 'Formato de RIF inválido (Ej: J-12345678-0)'
                    ]"
                    @input="onRifInput"
                    class="mb-2"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-select
                    v-model="formData.tipo_persona"
                    :items="[
                      { title: 'Persona Jurídica (Empresa)', value: 'JURIDICA' },
                      { title: 'Persona Natural (Profesional/Indiv.)', value: 'NATURAL' }
                    ]"
                    item-title="title"
                    item-value="value"
                    label="Tipo de Persona *"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account-tie"
                    class="mb-2"
                  ></v-select>
                </v-col>

                <!-- Teléfono y Correo -->
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.telefono"
                    label="Teléfono de Contacto"
                    placeholder="0414-1234567"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-phone"
                    class="mb-2"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.email"
                    label="Correo Electrónico"
                    placeholder="contacto@proveedor.com"
                    type="email"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-email-outline"
                    :rules="[v => !v || isValidEmail(v) || 'Correo inválido']"
                    class="mb-2"
                  ></v-text-field>
                </v-col>

                <!-- Persona de Contacto -->
                <v-col cols="12">
                  <v-text-field
                    v-model="formData.contacto_nombre"
                    label="Persona de Contacto / Representante"
                    placeholder="Ej. Ing. Carlos Pérez"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account"
                    class="mb-2"
                  ></v-text-field>
                </v-col>

                <!-- Dirección Fiscal -->
                <v-col cols="12">
                  <v-textarea
                    v-model="formData.direccion"
                    label="Dirección Fiscal"
                    placeholder="Av. Principal, Edificio Empresarial, Piso 3..."
                    variant="outlined"
                    rows="2"
                    density="comfortable"
                    prepend-inner-icon="mdi-map-marker"
                    class="mb-1"
                  ></v-textarea>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- PESTAÑA 2: PARÁMETROS FISCALES -->
            <v-window-item value="fiscal">
              <v-alert
                color="secondary"
                variant="tonal"
                icon="mdi-information-outline"
                density="compact"
                class="mb-4 text-caption rounded-lg"
              >
                Configura los porcentajes automáticos para aplicar retenciones en las facturas de compra.
              </v-alert>

              <v-row dense>
                <!-- Retención de IVA -->
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="formData.iva_retention_rate"
                    :items="[
                      { title: '75% (Retención Estándar)', value: 75 },
                      { title: '100% (Casos Especiales / No Domiciliados)', value: 100 },
                      { title: '0% (Exento / Sin Retención)', value: 0 }
                    ]"
                    item-title="title"
                    item-value="value"
                    label="Porcentaje de Retención IVA *"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-percent"
                    class="mb-3"
                  ></v-select>
                </v-col>

                <!-- Concepto ISLR -->
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="formData.islr_concept_id"
                    :items="conceptosIslr"
                    item-title="displayLabel"
                    item-value="id"
                    label="Concepto ISLR (SENIAT)"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    prepend-inner-icon="mdi-file-document-outline"
                    :hint="islrHint"
                    persistent-hint
                    class="mb-3"
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props">
                        <template v-slot:subtitle>
                          <span class="text-caption text-grey-darken-1">
                            {{ item.raw.codigo ? `Cód. ${item.raw.codigo}` : '' }}
                            • Ret. {{ item.raw.porcentaje_retencion }}%
                            {{ item.raw.sustraendo_ut > 0 ? ` • Sustraendo ${item.raw.sustraendo_ut} UT` : '' }}
                          </span>
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>

                <!-- Alícuota Municipal y Municipio -->
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.municipal_rate"
                    label="Alícuota Municipal (%)"
                    type="number"
                    min="0"
                    max="100"
                    variant="outlined"
                    density="comfortable"
                    suffix="%"
                    hint="Según actividad económica"
                    persistent-hint
                    prepend-inner-icon="mdi-city-variant-outline"
                    class="mb-3"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-autocomplete
                    v-model="formData.municipio_id"
                    :items="municipios"
                    item-title="nombre"
                    item-value="id"
                    label="Municipio Domiciliado"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    hint="Aplica si coincide el municipio"
                    persistent-hint
                    prepend-inner-icon="mdi-map-marker"
                    class="mb-3"
                  ></v-autocomplete>
                </v-col>

                <!-- N° Licencia de Actividad Económica -->
                <v-col cols="12">
                  <v-text-field
                    v-model="formData.licencia_actividad_economica"
                    label="N° Licencia de Actividad Económica"
                    placeholder="Ej. LAE-2026-99881"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-certificate-outline"
                    class="mb-2"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-form>
      </v-card-text>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- 3. PIE DE PÁGINA Y ACCIONES (FIJAS INFERIORES)         -->
      <!-- ══════════════════════════════════════════════════════ -->
      <v-card-actions class="flex-shrink-0 pa-4 pa-md-5 bg-grey-lighten-4 border-t d-flex flex-wrap align-center justify-space-between" style="gap: 12px;">
        <v-btn
          v-if="activeTab === 'fiscal'"
          variant="text"
          height="42"
          class="font-weight-bold px-4 rounded-lg text-secondary"
          prepend-icon="mdi-arrow-left"
          @click="activeTab = 'general'"
        >
          Volver a Datos
        </v-btn>
        <div v-else></div>

        <div class="d-flex align-center flex-wrap justify-end" style="gap: 10px;">
          <v-btn
            variant="outlined"
            height="42"
            color="grey-darken-2"
            class="font-weight-bold px-5 rounded-lg"
            @click="close"
            :disabled="saving"
          >
            Cancelar
          </v-btn>

          <v-btn
            v-if="activeTab === 'general'"
            color="secondary"
            variant="flat"
            height="42"
            class="font-weight-bold px-6 rounded-lg elevation-1 text-white"
            append-icon="mdi-arrow-right"
            @click="activeTab = 'fiscal'"
          >
            Siguiente: Fiscal
          </v-btn>

          <v-btn
            v-else
            color="primary"
            variant="flat"
            height="42"
            class="font-weight-bold px-6 rounded-lg elevation-1 text-white"
            prepend-icon="mdi-content-save"
            :loading="saving"
            :disabled="!valid"
            @click="save"
          >
            {{ isEdit ? 'Guardar Cambios' : 'Registrar Proveedor' }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import proveedorService from '@/services/proveedorService.js'

export default {
  name: 'ProveedorModalForm',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    proveedor: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'saved'],
  data() {
    return {
      internalValue: this.modelValue,
      activeTab: 'general',
      valid: true,
      saving: false,
      conceptosIslr: [],
      municipios: [],
      formData: {
        id: null,
        nombre: '',
        rif: '',
        tipo_persona: 'JURIDICA',
        telefono: '',
        email: '',
        direccion: '',
        contacto_nombre: '',
        iva_retention_rate: 75,
        islr_concept_id: null,
        municipal_rate: 0,
        licencia_actividad_economica: '',
        municipio_id: null,
        is_active: true
      }
    }
  },
  computed: {
    isMobile() {
      return this.$vuetify?.display?.smAndDown || false
    },
    isEdit() {
      return Boolean(this.proveedor?.id)
    },
    selectedIslrConcept() {
      if (!this.formData.islr_concept_id) return null
      return this.conceptosIslr.find(c => c.id === this.formData.islr_concept_id)
    },
    islrHint() {
      if (!this.selectedIslrConcept) return 'Selecciona el concepto para calcular retención automática'
      const c = this.selectedIslrConcept
      return `Retiene ${c.porcentaje_retencion}% sobre el ${c.porcentaje_base || 100}% de la base imponible`
    }
  },
  watch: {
    modelValue(val) {
      this.internalValue = val
      if (val) {
        this.initForm()
      }
    },
    internalValue(val) {
      this.$emit('update:modelValue', val)
    },
    'formData.tipo_persona'() {
      this.loadISLRConcepts()
    }
  },
  async mounted() {
    await Promise.all([
      this.loadISLRConcepts(),
      this.loadMunicipios()
    ])
  },
  methods: {
    initForm() {
      this.activeTab = 'general'
      if (this.proveedor) {
        this.formData = {
          id: this.proveedor.id || null,
          nombre: this.proveedor.nombre || '',
          rif: this.proveedor.rif || '',
          tipo_persona: this.proveedor.tipo_persona || 'JURIDICA',
          telefono: this.proveedor.telefono || '',
          email: this.proveedor.email || '',
          direccion: this.proveedor.direccion || '',
          contacto_nombre: this.proveedor.contacto_nombre || '',
          iva_retention_rate: this.proveedor.iva_retention_rate !== undefined ? Number(this.proveedor.iva_retention_rate) : 75,
          islr_concept_id: this.proveedor.islr_concept_id || null,
          municipal_rate: this.proveedor.municipal_rate !== undefined ? Number(this.proveedor.municipal_rate) : 0,
          licencia_actividad_economica: this.proveedor.licencia_actividad_economica || '',
          municipio_id: this.proveedor.municipio_id || null,
          is_active: this.proveedor.is_active !== false
        }
      } else {
        this.formData = {
          id: null,
          nombre: '',
          rif: '',
          tipo_persona: 'JURIDICA',
          telefono: '',
          email: '',
          direccion: '',
          contacto_nombre: '',
          iva_retention_rate: 75,
          islr_concept_id: null,
          municipal_rate: 0,
          licencia_actividad_economica: '',
          municipio_id: null,
          is_active: true
        }
      }
      this.$nextTick(() => {
        this.$refs.form?.resetValidation?.()
      })
      this.loadISLRConcepts()
      this.loadMunicipios()
    },
    async loadISLRConcepts() {
      try {
        const raw = await proveedorService.getISLRConcepts(this.formData.tipo_persona)
        this.conceptosIslr = (raw || []).map(c => ({
          ...c,
          displayLabel: c.codigo ? `[${c.codigo}] ${c.nombre} (${c.porcentaje_retencion}%)` : `${c.nombre} (${c.porcentaje_retencion}%)`
        }))
      } catch (e) {
        console.error('Error cargando conceptos ISLR:', e)
      }
    },
    async loadMunicipios() {
      try {
        this.municipios = await proveedorService.getMunicipios()
      } catch (e) {
        console.error('Error cargando municipios:', e)
      }
    },
    isValidRif(val) {
      if (!val) return false
      // Formato básico J-12345678-0 o V-12345678-0 o alfanumérico
      return /^[JjVvGgEePpCc]-[0-9]{7,9}-[0-9]$/.test(val.trim()) || val.trim().length >= 6
    },
    isValidEmail(val) {
      if (!val) return true
      return /.+@.+\..+/.test(val)
    },
    onRifInput(e) {
      const val = e.target.value || ''
      if (val.toUpperCase().startsWith('V') || val.toUpperCase().startsWith('E')) {
        this.formData.tipo_persona = 'NATURAL'
      } else if (val.toUpperCase().startsWith('J') || val.toUpperCase().startsWith('G')) {
        this.formData.tipo_persona = 'JURIDICA'
      }
    },
    close() {
      this.internalValue = false
    },
    async save() {
      if (this.$refs.form && !this.$refs.form.validate()) {
        this.activeTab = 'general'
        return
      }

      this.saving = true
      try {
        let res
        if (this.isEdit) {
          res = await proveedorService.updateProveedor(this.formData.id, this.formData)
        } else {
          res = await proveedorService.createProveedor(this.formData)
        }

        if (res.success) {
          this.$emit('saved', res.data)
          this.close()
        } else {
          alert(res.error || 'Ocurrió un error al guardar el proveedor.')
        }
      } catch (err) {
        console.error('Error guardando proveedor:', err)
        alert('Error inesperado al procesar la solicitud.')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.proveedor-modal-card {
  overflow: hidden;
}

.modal-tabs-header {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.modal-tab-item {
  min-height: 48px !important;
  font-size: 0.9rem !important;
  text-transform: none !important;
  letter-spacing: 0.01em !important;
}

.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
