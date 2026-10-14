<template>
  <div class="mi-negocio">
    <!-- ═════════════ CARGANDO ═════════════ -->
    <template v-if="cargandoInicial">
      <v-skeleton-loader type="heading, text" max-width="420" class="mb-6 bg-transparent" />
      <v-skeleton-loader type="image" height="110" class="rounded-xl mb-5" />
      <v-skeleton-loader type="image" height="90" class="rounded-xl mb-5" />
      <v-skeleton-loader type="image" height="260" class="rounded-xl mb-5" />
    </template>

    <!-- ═════════════ ERROR ═════════════ -->
    <template v-else-if="errorCarga">
      <AvisoAmable
        tipo="error"
        titulo="No pudimos cargar tu negocio"
        :mensaje="errorCarga"
        texto-accion="Reintentar"
        @accion="cargarTodo"
      />
    </template>

    <!-- ═════════════ CONTENIDO ═════════════ -->
    <template v-else>
      <EncabezadoPagina
        titulo="Mi negocio"
        subtitulo="Los datos que usamos para tus facturas, retenciones y comprobantes."
      />

      <AvisoAmable
        v-if="avisoFiscalPendiente"
        tipo="advertencia"
        :mensaje="avisoFiscalPendiente"
        cerrable
        class="mb-5"
        @cerrar="avisoFiscalPendiente = null"
      />

      <!-- Mientras falte algo: avance + siguiente paso. Completo: una sola línea de logro
           (antes se repetían la lista tachada y el panel "completo"). -->
      <template v-if="!todoListo">
        <div class="mi-negocio__panel">
          <ListaPasos
            :titulo="tituloAvance"
            :pasos="bloques"
            @ir="irABloque"
          />
          <PanelSiguientePaso
            :titulo="siguienteBloque ? `Completa «${siguienteBloque.titulo}»` : ''"
            :detalle="siguienteBloque ? siguienteBloque.detalle : ''"
            :texto-boton="siguienteBloque ? siguienteBloque.textoBoton : ''"
            :icono-boton="siguienteBloque ? siguienteBloque.icono : ''"
            @accion="irABloque(siguienteBloque)"
          />
        </div>
      </template>
      <div v-else class="mi-negocio__logro" role="status">
        <v-icon icon="mdi-check-decagram" color="success" size="26" />
        <span><strong>Tu negocio está completo.</strong> Ya tenemos todo para tus facturas y comprobantes de retención.</span>
      </div>

      <!-- ═════════════ BLOQUE A: DATOS DE LA EMPRESA ═════════════ -->
      <section ref="refEmpresa" class="bloque-negocio">
        <header class="bloque-negocio__cabecera">
          <h2 class="bloque-negocio__titulo">
            Datos de la empresa
            <v-icon v-if="empresaCompleta" icon="mdi-check-circle" size="18" color="success" class="ml-1" />
          </h2>
          <p class="bloque-negocio__ayuda">Así identificamos tu negocio en tus facturas y comprobantes.</p>
        </header>

        <v-form ref="companyForm" v-model="companyFormValid" @submit.prevent="updateCompanyData">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.companyName"
                label="Razón social / Nombre"
                variant="outlined"
                color="primary"
                prepend-inner-icon="mdi-domain"
                :rules="[v => !!v || 'Requerido']"
              />
            </v-col>

            <v-col cols="12" md="6">
              <div class="d-flex align-center">
                <v-text-field
                  v-model="form.rif"
                  label="RIF"
                  variant="outlined"
                  color="primary"
                  prepend-inner-icon="mdi-card-account-details"
                  readonly
                  bg-color="grey-lighten-4"
                  hint="Para cambiarlo, contacta a soporte"
                  persistent-hint
                />
                <AyudaTermino clave="rif" class="ml-1 mt-n5" />
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.phone"
                label="Teléfono"
                variant="outlined"
                color="primary"
                prepend-inner-icon="mdi-phone"
              />
            </v-col>

            <v-col cols="12" md="6">
              <div class="d-flex align-center">
                <v-text-field
                  v-model="form.licencia_actividad_economica"
                  label="N.° de Licencia de Actividad Económica"
                  variant="outlined"
                  color="primary"
                  prepend-inner-icon="mdi-certificate-outline"
                  placeholder="Ej. LAE-12345"
                  :error="!form.licencia_actividad_economica && showMissingFieldsHighlight"
                  :hint="(!form.licencia_actividad_economica && showMissingFieldsHighlight) ? 'Requerido' : ''"
                  persistent-hint
                  :rules="[v => !!v || 'Requerido']"
                />
                <AyudaTermino clave="licencia_actividad_economica" class="ml-1 mt-n5" />
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="form.estado"
                :items="states"
                label="Estado"
                variant="outlined"
                color="primary"
                prepend-inner-icon="mdi-map-marker-outline"
                @update:model-value="onStateChange"
                :error="!form.estado && showMissingFieldsHighlight"
                :hint="(!form.estado && showMissingFieldsHighlight) ? 'Requerido' : ''"
                persistent-hint
                :rules="[v => !!v || 'Requerido']"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="form.municipio"
                :items="municipalities"
                label="Municipio"
                variant="outlined"
                color="primary"
                prepend-inner-icon="mdi-city"
                :disabled="!form.estado"
                :error="!form.municipio && showMissingFieldsHighlight"
                :hint="(!form.municipio && showMissingFieldsHighlight) ? 'Requerido' : ''"
                persistent-hint
                :rules="[v => !!v || 'Requerido']"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="form.address"
                label="Dirección fiscal"
                variant="outlined"
                color="primary"
                prepend-inner-icon="mdi-map-marker"
                rows="2"
                auto-grow
              />
            </v-col>
          </v-row>

          <div class="d-flex justify-end mt-2">
            <v-btn
              color="primary"
              type="submit"
              size="large"
              class="text-none"
              :loading="loading"
              :disabled="!companyFormValid"
              prepend-icon="mdi-content-save"
            >
              Guardar datos de la empresa
            </v-btn>
          </div>
        </v-form>
      </section>

      <!-- ═════════════ BLOQUE B: PERFIL FISCAL GUIADO ═════════════ -->
      <section ref="refFiscal" class="bloque-negocio">
        <header class="bloque-negocio__cabecera">
          <h2 class="bloque-negocio__titulo">
            Perfil fiscal
            <v-icon v-if="perfilFiscalCompleto" icon="mdi-check-circle" size="18" color="success" class="ml-1" />
          </h2>
          <p class="bloque-negocio__ayuda">Responde estas preguntas para calcular bien tus retenciones. Si no estás seguro, pregúntale a tu contador.</p>
        </header>

        <div class="pregunta-fiscal">
          <div class="pregunta-fiscal__texto">¿Qué vendes principalmente?</div>
          <v-btn-toggle
            v-model="form.activity_type"
            color="primary"
            variant="outlined"
            mandatory
            class="pregunta-fiscal__toggle pregunta-fiscal__toggle--ancho"
          >
            <v-btn value="goods" class="text-none">Bienes</v-btn>
            <v-btn value="services" class="text-none">Servicios</v-btn>
            <v-btn value="manufacturing" class="text-none">Manufactura</v-btn>
          </v-btn-toggle>
        </div>

        <div class="pregunta-fiscal">
          <div class="pregunta-fiscal__texto">¿Tu negocio es persona natural o jurídica?</div>
          <v-btn-toggle
            v-model="form.taxpayer_type"
            color="primary"
            variant="outlined"
            mandatory
            class="pregunta-fiscal__toggle"
          >
            <v-btn value="NATURAL" class="text-none">Natural</v-btn>
            <v-btn value="JURIDICA" class="text-none">Jurídica</v-btn>
          </v-btn-toggle>
        </div>

        <v-divider class="my-4" />

        <div class="pregunta-fiscal">
          <div class="pregunta-fiscal__texto">
            ¿Eres contribuyente especial?
            <AyudaTermino clave="contribuyente_especial" />
          </div>
          <v-btn-toggle v-model="form.es_contribuyente_especial" color="primary" variant="outlined" mandatory class="pregunta-fiscal__toggle">
            <v-btn :value="true" class="text-none">Sí</v-btn>
            <v-btn :value="false" class="text-none">No</v-btn>
          </v-btn-toggle>
        </div>

        <div class="pregunta-fiscal">
          <div class="pregunta-fiscal__texto">
            ¿Eres agente de retención municipal?
            <AyudaTermino clave="retencion_municipal" />
          </div>
          <v-btn-toggle v-model="form.es_agente_retencion_municipal" color="primary" variant="outlined" mandatory class="pregunta-fiscal__toggle">
            <v-btn :value="true" class="text-none">Sí</v-btn>
            <v-btn :value="false" class="text-none">No</v-btn>
          </v-btn-toggle>
        </div>

        <div class="pregunta-fiscal">
          <div class="pregunta-fiscal__texto">
            ¿Retienes el ISLR a tus proveedores?
            <AyudaTermino clave="retencion_islr" />
          </div>
          <v-btn-toggle v-model="form.retains_islr" color="primary" variant="outlined" mandatory class="pregunta-fiscal__toggle">
            <v-btn :value="true" class="text-none">Sí</v-btn>
            <v-btn :value="false" class="text-none">No</v-btn>
          </v-btn-toggle>
        </div>

        <div class="d-flex justify-end mt-2">
          <v-btn
            color="primary"
            size="large"
            class="text-none"
            :loading="loadingFiscal"
            prepend-icon="mdi-content-save"
            @click="updateFiscalProfile"
          >
            Guardar perfil fiscal
          </v-btn>
        </div>
      </section>

      <!-- ═════════════ BLOQUE C: SELLO Y FIRMA ═════════════ -->
      <section ref="refSello" class="bloque-negocio">
        <header class="bloque-negocio__cabecera">
          <h2 class="bloque-negocio__titulo">
            Sello y firma
            <v-icon v-if="selloCompleto" icon="mdi-check-circle" size="18" color="success" class="ml-1" />
          </h2>
          <p class="bloque-negocio__ayuda">
            Se estampan solos en tus comprobantes de retención y documentos fiscales. Arrastra una imagen o toca para elegirla (PNG con fondo transparente, JPG, WebP o PDF).
          </p>
        </header>

        <v-row>
          <!-- Sello -->
          <v-col cols="12" sm="6">
            <div
              class="seal-upload-box"
              :class="{ 'seal-upload-box--arrastrando': arrastrandoSello }"
              role="button"
              tabindex="0"
              aria-label="Cargar sello de la empresa"
              @click="$refs.sealFileInput.click()"
              @keydown.enter="$refs.sealFileInput.click()"
              @dragover.prevent="arrastrandoSello = true"
              @dragleave.prevent="arrastrandoSello = false"
              @drop.prevent="handleDrop($event, 'seal')"
            >
              <div class="d-flex align-center justify-space-between w-100 mb-2">
                <span class="text-subtitle-2 font-weight-bold text-secondary">
                  <v-icon size="18" class="mr-1" color="secondary">mdi-stamper</v-icon>
                  Sello de la empresa
                </span>
                <v-chip v-if="sealConfig.sealUrl" size="x-small" color="success" variant="flat">Activo</v-chip>
              </div>

              <div class="seal-preview-wrap my-3 d-flex align-center justify-center rounded-lg">
                <img v-if="sealConfig.sealUrl" :src="sealConfig.sealUrl" alt="Sello de la empresa" class="seal-img" />
                <div v-else class="text-center pa-4 text-grey-darken-1">
                  <v-icon size="36" color="grey-lighten-1" class="mb-1">mdi-image-outline</v-icon>
                  <p class="text-caption ma-0">Arrastra tu sello aquí o toca para elegirlo</p>
                </div>
              </div>

              <input
                type="file"
                ref="sealFileInput"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                class="d-none"
                @click.stop
                @change="handleFileUpload($event, 'seal')"
              />

              <div class="d-flex ga-2 w-100 mt-auto pt-2" @click.stop>
                <v-btn variant="tonal" color="secondary" size="small" block prepend-icon="mdi-upload" class="text-none" :loading="uploadingSeal" @click="$refs.sealFileInput.click()">
                  {{ sealConfig.sealUrl ? 'Cambiar sello' : 'Cargar sello' }}
                </v-btn>
                <v-btn v-if="sealConfig.sealUrl" variant="text" color="error" icon="mdi-delete-outline" size="small" aria-label="Eliminar sello" @click="deleteSealAsset('seal')" />
              </div>
            </div>
          </v-col>

          <!-- Firma -->
          <v-col cols="12" sm="6">
            <div
              class="seal-upload-box"
              :class="{ 'seal-upload-box--arrastrando': arrastrandoFirma }"
              role="button"
              tabindex="0"
              aria-label="Cargar firma autorizada"
              @click="$refs.signatureFileInput.click()"
              @keydown.enter="$refs.signatureFileInput.click()"
              @dragover.prevent="arrastrandoFirma = true"
              @dragleave.prevent="arrastrandoFirma = false"
              @drop.prevent="handleDrop($event, 'signature')"
            >
              <div class="d-flex align-center justify-space-between w-100 mb-2">
                <span class="text-subtitle-2 font-weight-bold text-secondary">
                  <v-icon size="18" class="mr-1" color="secondary">mdi-draw-pen</v-icon>
                  Firma autorizada
                </span>
                <v-chip v-if="sealConfig.signatureUrl" size="x-small" color="success" variant="flat">Activa</v-chip>
              </div>

              <div class="seal-preview-wrap my-3 d-flex align-center justify-center rounded-lg">
                <img v-if="sealConfig.signatureUrl" :src="sealConfig.signatureUrl" alt="Firma autorizada" class="seal-img" />
                <div v-else class="text-center pa-4 text-grey-darken-1">
                  <v-icon size="36" color="grey-lighten-1" class="mb-1">mdi-draw</v-icon>
                  <p class="text-caption ma-0">Arrastra tu firma aquí o toca para elegirla</p>
                </div>
              </div>

              <input
                type="file"
                ref="signatureFileInput"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                class="d-none"
                @click.stop
                @change="handleFileUpload($event, 'signature')"
              />

              <div class="d-flex ga-2 w-100 mt-auto pt-2" @click.stop>
                <v-btn variant="tonal" color="secondary" size="small" block prepend-icon="mdi-upload" class="text-none" :loading="uploadingSignature" @click="$refs.signatureFileInput.click()">
                  {{ sealConfig.signatureUrl ? 'Cambiar firma' : 'Cargar firma' }}
                </v-btn>
                <v-btn v-if="sealConfig.signatureUrl" variant="text" color="error" icon="mdi-delete-outline" size="small" aria-label="Eliminar firma" @click="deleteSealAsset('signature')" />
              </div>
            </div>
          </v-col>
        </v-row>
      </section>

      <!-- ═════════════ BLOQUE D: TU CUENTA ═════════════ -->
      <section ref="refCuenta" class="bloque-negocio">
        <header class="bloque-negocio__cabecera">
          <h2 class="bloque-negocio__titulo">
            Tu cuenta
            <v-icon v-if="cuentaCompleta" icon="mdi-check-circle" size="18" color="success" class="ml-1" />
          </h2>
          <p class="bloque-negocio__ayuda">Tus datos personales y la seguridad de tu acceso.</p>
        </header>

        <div class="cuenta-cabecera">
          <v-avatar size="64" color="primary" class="text-h5 font-weight-bold">{{ userInitials }}</v-avatar>
          <div class="cuenta-cabecera__texto">
            <div class="cuenta-cabecera__nombre">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</div>
            <div class="cuenta-cabecera__email">{{ currentUser?.email }}</div>
          </div>
          <v-chip color="success" size="small" variant="flat" class="font-weight-bold">{{ currentUser?.role?.toUpperCase() }}</v-chip>
        </div>

        <v-row class="mt-4">
          <v-col cols="12" md="6">
            <v-form ref="personalForm" v-model="personalFormValid" @submit.prevent="updateUserData">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.firstName" label="Nombre" variant="outlined" density="comfortable" :rules="[v => !!v || 'Requerido']" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.lastName" label="Apellido" variant="outlined" density="comfortable" :rules="[v => !!v || 'Requerido']" />
                </v-col>
              </v-row>
              <div class="d-flex justify-end">
                <v-btn color="primary" variant="tonal" type="submit" class="text-none" :loading="loadingUser" :disabled="!personalFormValid">
                  Actualizar mis datos
                </v-btn>
              </div>
            </v-form>
          </v-col>

          <v-col cols="12" md="6">
            <div class="seguridad-caja">
              <div class="seguridad-caja__texto">
                <v-icon color="error" class="mr-2">mdi-shield-lock-outline</v-icon>
                Te recomendamos usar una contraseña segura y no repetirla en otros sitios.
              </div>
              <v-btn color="error" variant="tonal" prepend-icon="mdi-lock-reset" class="text-none" @click="openPasswordModal">
                Cambiar contraseña
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </section>
    </template>

    <!-- Modal de Cambio de Contraseña -->
    <DialogoAdaptable
      v-model="showPasswordModal"
      titulo="Cambiar contraseña"
      icono="mdi-lock-reset"
      persistent
      :cargando="loadingPassword"
    >
      <v-alert color="info" variant="tonal" icon="mdi-shield-check" class="mb-4 text-caption" border="start">
        Por tu seguridad, necesitamos verificar tu contraseña actual antes de realizar el cambio.
      </v-alert>

      <v-form @submit.prevent="updatePassword" ref="passwordForm">
        <v-text-field
          v-model="passwordForm.current"
          label="Contraseña actual"
          type="password"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          prepend-inner-icon="mdi-lock"
          :rules="[v => !!v || 'Requerido']"
        />

        <v-divider class="my-4" />

        <v-text-field
          v-model="passwordForm.new"
          label="Nueva contraseña"
          type="password"
          variant="outlined"
          density="comfortable"
          class="mb-2"
          prepend-inner-icon="mdi-lock-plus"
          :rules="[v => !!v || 'Requerido', v => v.length >= 6 || 'Mínimo 6 caracteres']"
        />

        <v-text-field
          v-model="passwordForm.confirm"
          label="Repetir nueva contraseña"
          type="password"
          variant="outlined"
          density="comfortable"
          class="mb-4"
          prepend-inner-icon="mdi-lock-check"
          :error-messages="passwordError"
          :rules="[v => !!v || 'Requerido']"
        />
      </v-form>

      <template #acciones>
        <v-btn variant="text" color="grey-darken-1" class="text-none" :disabled="loadingPassword" @click="showPasswordModal = false">
          Cancelar
        </v-btn>
        <v-btn color="primary" variant="flat" class="text-none" :loading="loadingPassword" :disabled="!formValid" @click="updatePassword">
          Actualizar contraseña
        </v-btn>
      </template>
    </DialogoAdaptable>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
// ═══════════════════════════════════════════════════════════
// Mi negocio (/cliente/mi-area) — ola "patrón cliente", ver
// docs/mvp/diseno/patron-cliente.md §"Mi negocio".
//
// Avance real por 4 bloques (Datos de la empresa, Perfil fiscal, Sello y
// firma, Tu cuenta) + "tu siguiente paso" con el primer bloque incompleto.
// Mismos campos que exige el router guard y el paso "perfil" de Inicio.vue
// (activity_type, licencia_actividad_economica, estado, municipio) para que
// el % de avance sea coherente en toda la app.
// ═══════════════════════════════════════════════════════════

import userService from '@/services/userService';
import sealService from '@/services/seal-service';
import venezuelaLocationsService from '@/services/venezuelaLocationsService';
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue';
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue';
import ListaPasos from '@/components/ui/ListaPasos.vue';
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue';
import AvisoAmable from '@/components/ui/AvisoAmable.vue';
import AyudaTermino from '@/components/ui/AyudaTermino.vue';

export default {
  name: 'ClienteMiArea',
  components: {
    EncabezadoPagina,
    DialogoAdaptable,
    ListaPasos,
    PanelSiguientePaso,
    AvisoAmable,
    AyudaTermino,
  },
  data() {
    return {
      currentUser: null,
      cargandoInicial: true,
      errorCarga: null,
      loading: false,
      loadingFiscal: false,
      loadingUser: false,
      loadingPassword: false,
      showPasswordModal: false,
      uploadingSeal: false,
      uploadingSignature: false,
      arrastrandoSello: false,
      arrastrandoFirma: false,
      companyFormValid: true,
      personalFormValid: true,
      avisoFiscalPendiente: null,
      sealConfig: {
        sealUrl: null,
        signatureUrl: null,
        combinedUrl: null
      },
      form: {
        firstName: '', lastName: '', email: '', username: '',
        companyName: '', rif: '', phone: '', address: '',
        licencia_actividad_economica: '', estado: '', municipio: '',
        activity_type: 'goods',
        taxpayer_type: 'JURIDICA',
        es_contribuyente_especial: false,
        es_agente_retencion_municipal: false,
        retains_islr: false,
      },
      passwordForm: { current: '', new: '', confirm: '' },
      states: [],
      municipalities: [],
      snackbar: { show: false, text: '', color: 'success' }
    };
  },
  computed: {
    userInitials() {
      return ((this.form.firstName?.charAt(0) || '') + (this.form.lastName?.charAt(0) || '')).toUpperCase();
    },
    passwordError() {
      if (!this.passwordForm.confirm) return '';
      return this.passwordForm.new !== this.passwordForm.confirm ? 'Las contraseñas no coinciden' : '';
    },
    formValid() {
      return this.passwordForm.current &&
             this.passwordForm.new &&
             this.passwordForm.confirm &&
             !this.passwordError &&
             this.passwordForm.new.length >= 6;
    },

    // Mismos 4 campos que usan Inicio.vue (perfilCompleto) y el router guard
    // (isFiscalIncomplete) para decidir si el perfil de negocio está listo.
    isProfileIncomplete() {
      return !this.form.activity_type ||
             !this.form.licencia_actividad_economica ||
             !this.form.estado ||
             !this.form.municipio;
    },
    showMissingFieldsHighlight() {
      return this.isProfileIncomplete;
    },

    // ── Avance real por bloque (nunca a mano) ──────────────────────────────
    empresaCompleta() {
      return !!(this.form.companyName && this.form.licencia_actividad_economica && this.form.estado && this.form.municipio);
    },
    perfilFiscalCompleto() {
      // Las 3 preguntas sí/no son booleanas con default `false` en la base de
      // datos: no hay forma de distinguir "respondió que no" de "nunca lo
      // respondió" sin una migración. Por eso el bloque se marca listo con
      // activity_type (único campo de este bloque sin valor por defecto),
      // igual que el resto de la app — ver informe para el detalle.
      return !!this.form.activity_type;
    },
    selloCompleto() {
      return !!(this.sealConfig.sealUrl || this.sealConfig.signatureUrl);
    },
    cuentaCompleta() {
      return !!(this.form.firstName && this.form.lastName);
    },
    bloques() {
      return [
        { clave: 'empresa', titulo: 'Datos de la empresa', detalle: 'Nombre, licencia, estado y municipio: con eso calculamos bien tus comprobantes.', icono: 'mdi-domain', textoBoton: 'Completar', hecho: this.empresaCompleta },
        { clave: 'fiscal', titulo: 'Perfil fiscal', detalle: 'Contribuyente especial, retenciones y qué vendes.', icono: 'mdi-file-percent-outline', textoBoton: 'Completar', hecho: this.perfilFiscalCompleto },
        { clave: 'sello', titulo: 'Sello y firma', detalle: 'Para que salgan solos en tus comprobantes de retención.', icono: 'mdi-stamper', textoBoton: 'Agregar', hecho: this.selloCompleto },
        { clave: 'cuenta', titulo: 'Tu cuenta', detalle: 'Tu nombre y apellido, para identificarte en el sistema.', icono: 'mdi-account-circle-outline', textoBoton: 'Revisar', hecho: this.cuentaCompleta },
      ];
    },
    bloquesListos() {
      return this.bloques.filter((b) => b.hecho).length;
    },
    porcentajeListo() {
      return Math.round((this.bloquesListos / this.bloques.length) * 100);
    },
    todoListo() {
      return this.bloquesListos === this.bloques.length;
    },
    siguienteBloque() {
      return this.bloques.find((b) => !b.hecho) || null;
    },
    tituloAvance() {
      return this.todoListo ? 'Tu negocio está listo' : `Tu negocio está ${this.porcentajeListo}% listo`;
    },
  },
  beforeRouteLeave(to, from, next) {
    if (this.currentUser?.role === 'cliente' && this.isProfileIncomplete) {
      const confirmLeave = window.confirm("Aún no has completado tu información de Tipo de Actividad, Licencia, Estado y Municipio. Esta información es obligatoria para la correcta generación de comprobantes. ¿Estás seguro que deseas salir sin guardar estos datos?");
      if (confirmLeave) {
        next();
      } else {
        next(false); // Cancelar la navegación
      }
    } else {
      next();
    }
  },
  async mounted() {
    await this.cargarTodo();

    if (this.$route.query.required === 'fiscal') {
      const missing = [];
      if (!this.form.activity_type) missing.push('qué vendes');
      if (!this.form.licencia_actividad_economica) missing.push('N.° de licencia');
      if (!this.form.estado) missing.push('estado');
      if (!this.form.municipio) missing.push('municipio');

      const fieldsText = missing.length > 0 ? missing.join(', ') : 'tus datos fiscales';
      this.avisoFiscalPendiente = `Completa ${fieldsText} para poder registrar ventas y gastos.`;

      this.$nextTick(() => this.irABloque(this.siguienteBloque || this.bloques[0]));
    }
  },
  methods: {
    async cargarTodo() {
      this.cargandoInicial = true;
      this.errorCarga = null;
      try {
        this.states = venezuelaLocationsService.getStates();
        await this.loadUser();
        await this.loadSealConfig();
      } catch (e) {
        console.error('Error al cargar Mi negocio:', e);
        this.errorCarga = 'No pudimos cargar tu información. Intenta de nuevo en un momento.';
      } finally {
        this.cargandoInicial = false;
      }
    },

    async loadUser(force = false) {
      this.currentUser = await userService.getCurrentUser(force);
      if (this.currentUser) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ad-user-updated', { detail: this.currentUser }));
        }

        this.form.firstName = this.currentUser.firstName || '';
        this.form.lastName = this.currentUser.lastName || '';
        this.form.email = this.currentUser.email || '';
        this.form.username = this.currentUser.username || '';

        if (this.currentUser.client) {
          const client = this.currentUser.client;
          this.form.companyName = client.company_name || '';
          this.form.rif = client.rif || '';
          this.form.phone = client.phone || '';
          this.form.address = client.address || '';
          this.form.activity_type = client.activity_type || '';
          this.form.licencia_actividad_economica = client.licencia_actividad_economica || '';
          this.form.taxpayer_type = client.taxpayer_type || 'JURIDICA';
          this.form.es_contribuyente_especial = !!(client.es_contribuyente_especial ?? client.is_special_taxpayer);
          this.form.es_agente_retencion_municipal = !!client.es_agente_retencion_municipal;
          this.form.retains_islr = !!client.retains_islr;

          const rawMunicipio = client.municipio || client.municipio_id || '';
          this.form.municipio = rawMunicipio;
          this.form.estado = client.estado || venezuelaLocationsService.getStateByMunicipality(rawMunicipio) || '';

          if (this.form.estado) {
            this.municipalities = venezuelaLocationsService.getMunicipalities(this.form.estado);
          }
        }
      }
    },

    async loadSealConfig() {
      try {
        const clientId = this.currentUser?.client_id || this.currentUser?.client?.id || null;
        this.sealConfig = await sealService.getSealConfig(clientId);
      } catch (e) {
        console.warn('Error loading seal config:', e);
      }
    },

    irABloque(bloque) {
      if (!bloque) return;
      const refs = { empresa: 'refEmpresa', fiscal: 'refFiscal', sello: 'refSello', cuenta: 'refCuenta' };
      const nombreRef = refs[bloque.clave];
      const el = nombreRef && this.$refs[nombreRef];
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },

    async processFile(file, type) {
      if (!file) return;
      if (type === 'seal') this.uploadingSeal = true;
      if (type === 'signature') this.uploadingSignature = true;

      try {
        const clientId = this.currentUser?.client_id || this.currentUser?.client?.id || null;
        const result = await sealService.uploadSealAsset(file, type, clientId);
        if (result.success) {
          this.sealConfig = result.config;
          this.snackbar = {
            show: true,
            text: `${type === 'seal' ? 'Sello' : 'Firma'} digital guardado(a) correctamente`,
            color: 'success'
          };
        } else {
          throw new Error(result.message || 'Error al subir archivo');
        }
      } catch (error) {
        console.error('Error uploading asset:', error);
        this.snackbar = {
          show: true,
          text: error.message || 'Error al procesar el archivo',
          color: 'error'
        };
      } finally {
        if (type === 'seal') this.uploadingSeal = false;
        if (type === 'signature') this.uploadingSignature = false;
      }
    },

    async handleFileUpload(event, type) {
      const file = event.target.files?.[0];
      await this.processFile(file, type);
      event.target.value = '';
    },

    async handleDrop(event, type) {
      if (type === 'seal') this.arrastrandoSello = false;
      if (type === 'signature') this.arrastrandoFirma = false;
      const file = event.dataTransfer?.files?.[0];
      await this.processFile(file, type);
    },

    async deleteSealAsset(type) {
      try {
        const clientId = this.currentUser?.client_id || this.currentUser?.client?.id || null;
        const result = await sealService.removeSealAsset(type, clientId);
        if (result.success) {
          this.sealConfig = result.config;
          this.snackbar = {
            show: true,
            text: `${type === 'seal' ? 'Sello' : 'Firma'} eliminado(a) correctamente`,
            color: 'info'
          };
        }
      } catch (error) {
        console.error('Error deleting asset:', error);
        this.snackbar = { show: true, text: 'Error al eliminar activo', color: 'error' };
      }
    },

    async updateCompanyData() {
      const form = this.$refs.companyForm;
      if (!form) return;
      const { valid } = await form.validate();
      if (!valid) return;

      this.loading = true;
      try {
        const updates = {
          client: {
            id: this.currentUser.client_id,
            companyName: this.form.companyName,
            phone: this.form.phone,
            licencia_actividad_economica: this.form.licencia_actividad_economica,
            address: this.form.address,
            estado: this.form.estado,
            municipio_id: this.form.municipio
          }
        };

        const result = await userService.updateUserProfile(this.currentUser.id, updates);
        if (result.success) {
          this.snackbar = { show: true, text: 'Datos de empresa actualizados', color: 'success' };
          await this.loadUser(true);
        } else throw result.error;
      } catch (e) {
        console.error('Error al actualizar datos de empresa:', e);
        let userMsg = 'No se pudieron actualizar los datos de la empresa. Por favor intenta de nuevo.';
        if (typeof e === 'string') {
          userMsg = e;
        } else if (e?.message) {
          if (e.message.includes('schema cache') || e.message.includes('column')) {
            userMsg = 'Ocurrió un inconveniente temporal al guardar los datos. Intenta nuevamente.';
          } else if (e.message.includes('network') || e.message.includes('fetch')) {
            userMsg = 'Error de conexión. Por favor verifica tu conexión a internet.';
          } else {
            userMsg = e.message;
          }
        }
        this.snackbar = { show: true, text: userMsg, color: 'error' };
      } finally {
        this.loading = false;
      }
    },

    async updateFiscalProfile() {
      this.loadingFiscal = true;
      try {
        const updates = {
          client: {
            id: this.currentUser.client_id,
            activity_type: this.form.activity_type,
            taxpayer_type: this.form.taxpayer_type,
            es_contribuyente_especial: this.form.es_contribuyente_especial,
            is_special_taxpayer: this.form.es_contribuyente_especial,
            es_agente_retencion_municipal: this.form.es_agente_retencion_municipal,
            retains_islr: this.form.retains_islr
          }
        };

        const result = await userService.updateUserProfile(this.currentUser.id, updates);
        if (result.success) {
          this.snackbar = { show: true, text: 'Perfil fiscal actualizado', color: 'success' };
          await this.loadUser(true);
        } else throw result.error;
      } catch (e) {
        console.error('Error al actualizar perfil fiscal:', e);
        const userMsg = (typeof e === 'string') ? e : (e?.message || 'No se pudo actualizar tu perfil fiscal. Intenta de nuevo.');
        this.snackbar = { show: true, text: userMsg, color: 'error' };
      } finally {
        this.loadingFiscal = false;
      }
    },

    async updateUserData() {
      if (!this.form.firstName || !this.form.lastName) return;
      this.loadingUser = true;

      try {
        const updates = {
          firstName: this.form.firstName,
          lastName: this.form.lastName,
        };

        const result = await userService.updateUserProfile(this.currentUser.id, updates);

        if (result.success) {
          this.snackbar = { show: true, text: 'Datos personales actualizados', color: 'success' };
          await this.loadUser(true);
        } else {
          throw result.error;
        }
      } catch (error) {
        console.error('Error al actualizar datos personales:', error);
        let userMsg = 'No se pudieron actualizar tus datos personales. Por favor intenta de nuevo.';
        if (typeof error === 'string') userMsg = error;
        else if (error?.message) userMsg = error.message;
        this.snackbar = { show: true, text: userMsg, color: 'error' };
      } finally {
        this.loadingUser = false;
      }
    },

    openPasswordModal() {
      this.passwordForm = { current: '', new: '', confirm: '' };
      this.showPasswordModal = true;
    },

    async updatePassword() {
      if (!this.formValid) return;
      this.loadingPassword = true;

      try {
        const result = await userService.changePassword(
          this.currentUser.email,
          this.passwordForm.current,
          this.passwordForm.new
        );

        if (result.success) {
          this.snackbar = { show: true, text: 'Contraseña actualizada correctamente', color: 'success' };
          this.showPasswordModal = false;
          this.passwordForm = { current: '', new: '', confirm: '' };
        } else {
          throw new Error(result.message || 'Error al actualizar contraseña');
        }
      } catch (error) {
        console.error(error);
        this.snackbar = { show: true, text: error.message || 'Error desconocido', color: 'error' };
      } finally {
        this.loadingPassword = false;
      }
    },

    onStateChange() {
      if (this.form.municipio && !venezuelaLocationsService.isValidMunicipality(this.form.estado, this.form.municipio)) {
        this.form.municipio = '';
      }
      this.municipalities = this.form.estado ? venezuelaLocationsService.getMunicipalities(this.form.estado) : [];
    }
  }
}
</script>

<style scoped>
.mi-negocio {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

@media (min-width: 960px) {
  .mi-negocio { padding: 32px 32px 64px; }
}

/* ── Bloques (secciones con guardado propio) ── */
.bloque-negocio {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 20px;
  padding: 22px 24px;
  margin-bottom: 20px;
}

@media (max-width: 599px) {
  .bloque-negocio { padding: 18px; }
}

.bloque-negocio__cabecera {
  margin-bottom: 18px;
}

.bloque-negocio__titulo {
  display: flex;
  align-items: center;
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.bloque-negocio__ayuda {
  margin: 4px 0 0;
  font-size: 0.92rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
  max-width: 68ch;
}

/* ── Preguntas del perfil fiscal guiado ── */
.pregunta-fiscal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 0;
}

.pregunta-fiscal + .pregunta-fiscal {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.pregunta-fiscal__texto {
  font-weight: 600;
  display: flex;
  align-items: center;
  flex: 1 1 260px;
}

.pregunta-fiscal__toggle {
  flex-shrink: 0;
}

@media (max-width: 599px) {
  .pregunta-fiscal__toggle,
  .pregunta-fiscal__toggle--ancho {
    flex: 1 1 100%;
    display: flex;
  }
  .pregunta-fiscal__toggle :deep(.v-btn) {
    flex: 1 1 0;
  }
}

/* ── Sello y firma: zona de arrastrar/soltar ── */
.seal-upload-box {
  background-color: #fcfdfe;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
  cursor: pointer;
  transition: border-color var(--ad-move-rapido, 150ms) ease, box-shadow var(--ad-move-rapido, 150ms) ease;
}

.seal-upload-box:hover,
.seal-upload-box:focus-visible {
  border-color: rgb(var(--v-theme-secondary));
}

.seal-upload-box--arrastrando {
  border-color: rgb(var(--v-theme-primary));
  border-style: dashed;
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.seal-preview-wrap {
  width: 100%;
  height: 120px;
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  overflow: hidden;
}

.seal-img {
  max-width: 90%;
  max-height: 100px;
  object-fit: contain;
}

/* ── Tu cuenta ── */
.cuenta-cabecera {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.cuenta-cabecera__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.cuenta-cabecera__nombre {
  font-weight: 700;
  font-size: 1.05rem;
}

.cuenta-cabecera__email {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.seguridad-caja {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  background: rgba(var(--v-theme-error), 0.04);
  border: 1px solid rgba(var(--v-theme-error), 0.18);
  border-radius: 16px;
  padding: 16px;
}

.seguridad-caja__texto {
  display: flex;
  align-items: flex-start;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

@media (prefers-reduced-motion: reduce) {
  .seal-upload-box { transition: none; }
}

/* Avance + siguiente paso lado a lado en escritorio */
.mi-negocio__panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

@media (min-width: 960px) {
  .mi-negocio__panel { grid-template-columns: 7fr 5fr; align-items: start; }
}

.mi-negocio__logro {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin-bottom: 24px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  background: linear-gradient(0deg, rgba(var(--v-theme-success), 0.06), rgba(var(--v-theme-success), 0.06)), rgb(var(--v-theme-surface));
}

/* Opciones del perfil fiscal: botones separados (antes iban pegados), cada uno con su
   borde y esquina redondeada, y el elegido en granate. Altura cómoda para tocar. */
.pregunta-fiscal__toggle {
  gap: 8px;
  border: 0 !important;
  overflow: visible !important;
  height: auto !important;
  background: transparent !important;
  flex-wrap: wrap;
}

.pregunta-fiscal__toggle :deep(.v-btn) {
  min-height: 44px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2) !important;
  border-radius: 12px !important;
  padding: 0 18px !important;
  text-transform: none;
  letter-spacing: 0;
}

.pregunta-fiscal__toggle :deep(.v-btn.v-btn--active) {
  border-color: rgb(var(--v-theme-primary)) !important;
  font-weight: 700;
}
</style>
