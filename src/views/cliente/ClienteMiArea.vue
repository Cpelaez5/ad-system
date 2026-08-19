<template>
  <v-container fluid class="pa-4 pa-md-6">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">Mi Perfil</h1>
      <p class="text-body-1 text-medium-emphasis">Administra tu información personal y los datos de tu empresa</p>
    </div>

    <v-row>
      <!-- Columna Izquierda: Datos Empresa -->
      <v-col cols="12" md="8">
        <v-card class="mb-6" elevation="0" border rounded="lg">
          <v-card-item class="px-6 pt-6">
            <template v-slot:prepend>
              <v-avatar color="primary" variant="tonal" rounded="lg">
                <v-icon color="primary">mdi-domain</v-icon>
              </v-avatar>
            </template>
            <v-card-title class="text-h6 font-weight-bold">Datos de la Empresa</v-card-title>
            <v-card-subtitle>Información fiscal y comercial de tu organización</v-card-subtitle>
          </v-card-item>
          
          <v-card-text class="px-6 pb-6 pt-4">
            <v-form ref="companyForm" @submit.prevent="updateCompanyData">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.companyName"
                    label="Razón Social / Nombre"
                    variant="outlined"
                    color="primary"
                    prepend-inner-icon="mdi-domain"
                    :rules="[v => !!v || 'Requerido']"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.rif"
                    label="RIF / Identificación"
                    variant="outlined"
                    color="primary"
                    prepend-inner-icon="mdi-card-account-details"
                    readonly
                    bg-color="grey-lighten-4"
                    hint="Contacta a soporte para cambiar el RIF"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.phone"
                    label="Teléfono"
                    variant="outlined"
                    color="primary"
                    prepend-inner-icon="mdi-phone"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.activity_type"
                    label="Tipo de Actividad"
                    :items="activityTypes"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    color="primary"
                    prepend-inner-icon="mdi-briefcase"
                  ></v-select>
                </v-col>

                <v-col cols="12">
                  <v-textarea
                    v-model="form.address"
                    label="Dirección Fiscal"
                    variant="outlined"
                    color="primary"
                    prepend-inner-icon="mdi-map-marker"
                    rows="3"
                    auto-grow
                  ></v-textarea>
                </v-col>
              </v-row>
              
              <div class="d-flex justify-end mt-4">
                <v-btn 
                  color="primary" 
                  type="submit" 
                  size="large"
                  :loading="loading"
                  prepend-icon="mdi-content-save"
                  elevation="2"
                >
                  Guardar Cambios Empresa
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Sello y Firma Digital de la Empresa -->
        <v-card class="mb-6 seal-card" elevation="0" border rounded="lg">
          <v-card-item class="px-6 pt-6">
            <template v-slot:prepend>
              <v-avatar color="secondary" variant="tonal" rounded="lg">
                <v-icon color="secondary">mdi-stamper</v-icon>
              </v-avatar>
            </template>
            <v-card-title class="text-h6 font-weight-bold" style="color: #1F355C;">
              Sello y Firma Digital
            </v-card-title>
            <v-card-subtitle>
              Configura el sello húmedo y/o firma autorizada que se estamparán automáticamente en tus Comprobantes de Retención y documentos fiscales.
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="px-6 pb-6 pt-2">
            <v-alert
              color="info"
              variant="tonal"
              density="compact"
              icon="mdi-lightbulb-on-outline"
              class="mb-4 text-caption rounded-lg"
            >
              <strong>Tip fiscal:</strong> Puedes cargar tu sello húmedo, firma o ambos. Se recomienda formato <strong>PNG con fondo transparente</strong> o imagen nítida en JPG/WebP/PDF.
            </v-alert>

            <v-row>
              <!-- 1. Sello Húmedo de la Empresa -->
              <v-col cols="12" sm="6">
                <div class="seal-upload-box pa-4 rounded-xl border d-flex flex-column align-center text-center h-100">
                  <div class="d-flex align-center justify-space-between w-100 mb-2">
                    <span class="text-subtitle-2 font-weight-bold text-secondary">
                      <v-icon size="18" class="mr-1" color="secondary">mdi-stamper</v-icon>
                      Sello de la Empresa
                    </span>
                    <v-chip v-if="sealConfig.sealUrl" size="x-small" color="success" variant="flat">
                      Activo
                    </v-chip>
                  </div>

                  <!-- Preview Sello -->
                  <div class="seal-preview-wrap my-3 d-flex align-center justify-center rounded-lg">
                    <img
                      v-if="sealConfig.sealUrl"
                      :src="sealConfig.sealUrl"
                      alt="Sello Empresa"
                      class="seal-img"
                    />
                    <div v-else class="text-center pa-4 text-grey-darken-1">
                      <v-icon size="36" color="grey-lighten-1" class="mb-1">mdi-image-outline</v-icon>
                      <p class="text-caption ma-0">Sin sello cargado</p>
                    </div>
                  </div>

                  <!-- Acciones Sello -->
                  <input
                    type="file"
                    ref="sealFileInput"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                    class="d-none"
                    @change="handleFileUpload($event, 'seal')"
                  />

                  <div class="d-flex ga-2 w-100 mt-auto pt-2">
                    <v-btn
                      variant="tonal"
                      color="secondary"
                      size="small"
                      block
                      prepend-icon="mdi-upload"
                      :loading="uploadingSeal"
                      @click="$refs.sealFileInput.click()"
                    >
                      {{ sealConfig.sealUrl ? 'Cambiar Sello' : 'Cargar Sello' }}
                    </v-btn>
                    <v-btn
                      v-if="sealConfig.sealUrl"
                      variant="text"
                      color="error"
                      icon="mdi-delete-outline"
                      size="small"
                      @click="deleteSealAsset('seal')"
                    />
                  </div>
                </div>
              </v-col>

              <!-- 2. Firma del Representante Legal -->
              <v-col cols="12" sm="6">
                <div class="seal-upload-box pa-4 rounded-xl border d-flex flex-column align-center text-center h-100">
                  <div class="d-flex align-center justify-space-between w-100 mb-2">
                    <span class="text-subtitle-2 font-weight-bold text-secondary">
                      <v-icon size="18" class="mr-1" color="secondary">mdi-draw-pen</v-icon>
                      Firma Autorizada
                    </span>
                    <v-chip v-if="sealConfig.signatureUrl" size="x-small" color="success" variant="flat">
                      Activa
                    </v-chip>
                  </div>

                  <!-- Preview Firma -->
                  <div class="seal-preview-wrap my-3 d-flex align-center justify-center rounded-lg">
                    <img
                      v-if="sealConfig.signatureUrl"
                      :src="sealConfig.signatureUrl"
                      alt="Firma Autorizada"
                      class="seal-img"
                    />
                    <div v-else class="text-center pa-4 text-grey-darken-1">
                      <v-icon size="36" color="grey-lighten-1" class="mb-1">mdi-draw</v-icon>
                      <p class="text-caption ma-0">Sin firma cargada</p>
                    </div>
                  </div>

                  <!-- Acciones Firma -->
                  <input
                    type="file"
                    ref="signatureFileInput"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                    class="d-none"
                    @change="handleFileUpload($event, 'signature')"
                  />

                  <div class="d-flex ga-2 w-100 mt-auto pt-2">
                    <v-btn
                      variant="tonal"
                      color="secondary"
                      size="small"
                      block
                      prepend-icon="mdi-upload"
                      :loading="uploadingSignature"
                      @click="$refs.signatureFileInput.click()"
                    >
                      {{ sealConfig.signatureUrl ? 'Cambiar Firma' : 'Cargar Firma' }}
                    </v-btn>
                    <v-btn
                      v-if="sealConfig.signatureUrl"
                      variant="text"
                      color="error"
                      icon="mdi-delete-outline"
                      size="small"
                      @click="deleteSealAsset('signature')"
                    />
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Columna Derecha: Datos Usuario y Seguridad -->
      <v-col cols="12" md="4">
        <!-- Perfil Usuario -->
        <v-card class="mb-6" elevation="0" border rounded="lg">
          <div class="d-flex flex-column align-center pt-8 pb-4">
            <v-avatar size="100" color="primary" class="mb-4 text-h3 font-weight-bold elevation-4">
              {{ userInitials }}
            </v-avatar>
            <h3 class="text-h6 font-weight-bold">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</h3>
            <p class="text-body-2 text-medium-emphasis">{{ currentUser?.email }}</p>
            <v-chip 
              color="success" 
              size="small" 
              variant="flat" 
              class="mt-2 font-weight-bold"
            >
              {{ currentUser?.role?.toUpperCase() }}
            </v-chip>
          </div>

          <v-divider></v-divider>

          <v-card-text class="px-6">
            <h4 class="text-subtitle-1 font-weight-bold mb-4">Mis Datos Personales</h4>
            <v-form @submit.prevent="updateUserData">
              <v-text-field
                v-model="form.firstName"
                label="Nombre"
                variant="outlined"
                density="comfortable"
                class="mb-2"
              ></v-text-field>
              <v-text-field
                v-model="form.lastName"
                label="Apellido"
                variant="outlined"
                density="comfortable"
                class="mb-4"
              ></v-text-field>
              
              <v-btn 
                block 
                variant="tonal" 
                color="primary" 
                type="submit" 
                :loading="loadingUser"
              >
                Actualizar Mis Datos
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Seguridad -->
        <v-card elevation="0" border rounded="lg">
          <v-card-item>
            <template v-slot:prepend>
              <v-icon color="error">mdi-shield-lock-outline</v-icon>
            </template>
            <v-card-title class="text-subtitle-1 font-weight-bold">Seguridad</v-card-title>
          </v-card-item>
          
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-4">
              Te recomendamos usar una contraseña segura.
            </p>
            
            <v-btn 
              block 
              color="error" 
              variant="flat" 
              prepend-icon="mdi-lock-reset"
              @click="openPasswordModal"
            >
              Cambiar Contraseña
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal de Cambio de Contraseña -->
    <v-dialog v-model="showPasswordModal" max-width="500px" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold pa-4">
          Cambiar Contraseña
          <v-btn icon="mdi-close" variant="text" size="small" class="float-right" @click="showPasswordModal = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-4">
          <v-alert
            color="info"
            variant="tonal"
            icon="mdi-shield-check"
            class="mb-4 text-caption"
            border="start"
          >
            Por tu seguridad, necesitamos verificar tu contraseña actual antes de realizar el cambio.
          </v-alert>

          <v-form @submit.prevent="updatePassword" ref="passwordForm">
            <v-text-field
              v-model="passwordForm.current"
              label="Contraseña Actual"
              type="password"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              prepend-inner-icon="mdi-lock"
              :rules="[v => !!v || 'Requerido']"
            ></v-text-field>

            <v-divider class="my-4"></v-divider>

            <v-text-field
              v-model="passwordForm.new"
              label="Nueva Contraseña"
              type="password"
              variant="outlined"
              density="comfortable"
              class="mb-2"
              prepend-inner-icon="mdi-lock-plus"
              :rules="[v => !!v || 'Requerido', v => v.length >= 6 || 'Mínimo 6 caracteres']"
            ></v-text-field>

            <v-text-field
              v-model="passwordForm.confirm"
              label="Repetir Nueva Contraseña"
              type="password"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              prepend-inner-icon="mdi-lock-check"
              :error-messages="passwordError"
              :rules="[v => !!v || 'Requerido']"
            ></v-text-field>

            <div class="d-flex justify-end gap-2">
              <v-btn 
                variant="text" 
                color="grey-darken-1" 
                @click="showPasswordModal = false"
                class="mr-2"
              >
                Cancelar
              </v-btn>
              <v-btn 
                color="primary" 
                type="submit" 
                :loading="loadingPassword"
                :disabled="!formValid"
              >
                Actualizar Contraseña
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar 
      v-model="snackbar.show" 
      :color="snackbar.color" 
      location="top right"
      timeout="3000"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import userService from '@/services/userService';
import sealService from '@/services/seal-service';

export default {
  name: 'PerfilCliente',
  data() {
    return {
      currentUser: null,
      loading: false,
      loadingUser: false,
      loadingPassword: false,
      showPasswordModal: false,
      uploadingSeal: false,
      uploadingSignature: false,
      sealConfig: {
        sealUrl: null,
        signatureUrl: null,
        combinedUrl: null
      },
      form: {
        firstName: '', lastName: '', email: '', username: '',
        companyName: '', rif: '', phone: '', address: '', activity_type: ''
      },
      passwordForm: { current: '', new: '', confirm: '' },
      activityTypes: [
        { title: 'Bienes / Comercio', value: 'goods' },
        { title: 'Servicios', value: 'services' },
        { title: 'Manufactura', value: 'manufacturing' }
      ],
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
    }
  },
  async mounted() {
    await this.loadUser();
    await this.loadSealConfig();
  },
  methods: {
    async loadUser(force = false) {
      this.currentUser = await userService.getCurrentUser(force);
      if (this.currentUser) {
        // Load basic data
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

    async handleFileUpload(event, type) {
      const file = event.target.files?.[0];
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
        // Reset input value to allow re-uploading same file
        event.target.value = '';
      }
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
            activity_type: this.form.activity_type,
            address: this.form.address
          }
        };

        const result = await userService.updateUserProfile(this.currentUser.id, updates);
        if (result.success) {
          this.snackbar = { show: true, text: 'Datos de empresa actualizados', color: 'success' };
          await this.loadUser(true);
        } else throw result.error;
      } catch (e) {
        this.snackbar = { show: true, text: 'Error: ' + (e.message || 'Desconocido'), color: 'error' };
      } finally {
        this.loading = false;
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
        console.error(error);
        this.snackbar = { show: true, text: 'Error: ' + (error.message || 'Desconocido'), color: 'error' };
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
    }
  }
}
</script>

<style scoped>
.seal-card {
  transition: all 0.3s ease;
}

.seal-upload-box {
  background-color: #fcfdfe;
  border-color: #e2e8f0 !important;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.seal-upload-box:hover {
  border-color: #1F355C !important;
  box-shadow: 0 4px 12px rgba(31, 53, 92, 0.06);
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
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
}
</style>
