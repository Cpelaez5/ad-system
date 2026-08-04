<template>
  <v-container fluid class="checkout-page pa-0" style="background-color: var(--background, #efefef); min-height: 100vh;">
    
    <!-- Minimal Header -->
    <div class="d-flex align-center justify-space-between px-6 px-md-12 py-6 mb-4">
      <img src="/ADSystem/logo.png" alt="AD System" style="height: 48px; width: auto;" />
      <v-btn variant="text" prepend-icon="mdi-arrow-left" color="secondary" class="text-none font-weight-bold" to="/cliente/facturacion-suscripcion" rounded="pill">
        Cancelar Pago
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex flex-column align-center justify-center" style="height: 60vh;">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="text-h6 mt-4 text-secondary font-weight-medium">Preparando tu checkout...</p>
    </div>

    <!-- Success State -->
    <div v-else-if="paymentSuccessful" class="d-flex flex-column align-center justify-center text-center px-4" style="height: 80vh;">
      <v-avatar color="success" size="100" class="mb-6 elevation-3" style="animation: bounceIn 0.8s ease;">
        <v-icon size="60" color="white">mdi-check-bold</v-icon>
      </v-avatar>
      <h2 class="text-h4 font-weight-bold mb-4 text-secondary">¡Pago Enviado Exitosamente!</h2>
      <p class="text-body-1 text-medium-emphasis max-w-sm mb-6" style="max-width: 500px;">
        Tu pago ha sido registrado correctamente. El equipo de <strong class="text-secondary">AD System</strong> lo revisará y aprobará en breve.
      </p>
      
      <v-card variant="flat" color="blue-lighten-5" class="pa-4 mb-8" style="max-width: 500px; width: 100%; border-radius: 12px;">
        <div class="d-flex align-center">
          <v-icon color="info" size="32" class="mr-4">mdi-information</v-icon>
          <div class="text-left text-body-2 text-info-darken-2">
            Te notificaremos por correo electrónico una vez que tu pago sea verificado y tu plan sea activado.
          </div>
        </div>
      </v-card>

      <v-btn color="primary" variant="flat" to="/cliente/facturacion-suscripcion" size="x-large" rounded="pill" class="text-none px-8 font-weight-bold elevation-2">
        Volver a Mi Suscripción
      </v-btn>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="d-flex flex-column align-center justify-center text-center px-4" style="height: 60vh;">
      <v-avatar color="error" variant="tonal" size="80" class="mb-4">
        <v-icon size="40">mdi-alert-circle-outline</v-icon>
      </v-avatar>
      <h2 class="text-h5 font-weight-bold mb-2 text-secondary">Error al cargar el checkout</h2>
      <p class="text-body-1 text-medium-emphasis mb-6 max-w-sm">{{ error }}</p>
      <v-btn color="primary" variant="flat" to="/cliente/facturacion-suscripcion" size="large" rounded="pill" class="text-none">Volver a Facturación</v-btn>
    </div>

    <!-- Checkout Content -->
    <v-row v-else class="ma-0 max-w-1200 mx-auto px-4 px-md-8" justify="center">
      <!-- Columna Izquierda: Resumen del Pedido (Mobile: Arriba) -->
      <v-col cols="12" md="5" lg="4" class="pa-4 pa-md-6 order-1 order-md-2" style="background-color: #f8f9fa; border-radius: 20px;">
        <div class="summary-sticky">
        <h2 class="text-h6 font-weight-bold mb-4 text-secondary">Resumen de Pago</h2>
        
        <v-card variant="flat" class="bg-transparent mb-6">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-caption text-uppercase font-weight-bold text-primary mb-1">Plan a pagar</div>
              <div class="text-h6 font-weight-bold">{{ invoice?.subscription?.plan?.name || 'Suscripción AD System' }}</div>
              <div class="text-body-2 text-medium-emphasis">Factura: {{ invoice?.invoice_number }}</div>
            </div>
            <v-avatar color="primary" variant="tonal" rounded="lg" size="48">
              <v-icon size="24">mdi-rocket-launch</v-icon>
            </v-avatar>
          </div>
          
          <v-divider class="my-4"></v-divider>
          
          <div class="d-flex justify-space-between mb-2">
            <span class="text-body-2 text-medium-emphasis">Subtotal</span>
            <span class="font-weight-medium">${{ formatMoney(invoice?.amount) }}</span>
          </div>
          
          <div v-if="selectedMethodIgtf" class="d-flex justify-space-between mb-2 text-warning">
            <span class="text-body-2">IGTF (3%)</span>
            <span class="font-weight-medium">+${{ formatMoney(igtfAmount) }}</span>
          </div>
          
          <div v-if="useBalance && balance.saldoAFavor > 0" class="d-flex justify-space-between mb-2 text-success">
            <span class="text-body-2">Saldo a favor aplicado</span>
            <span class="font-weight-medium">-${{ formatMoney(balanceUsedAmount) }}</span>
          </div>
          
          <v-divider class="my-4"></v-divider>
          
          <div class="d-flex justify-space-between align-end mb-2">
            <span class="text-subtitle-1 font-weight-bold">Total a pagar</span>
            <div class="text-right">
              <div class="text-h5 font-weight-bold text-primary">${{ formatMoney(finalAmountUsd) }} {{ invoice?.currency || 'USD' }}</div>
            </div>
          </div>

          <!-- Monto en Bolívares con tasa BCV -->
          <div v-if="bcvRate && finalAmountUsd > 0" class="mt-4 pa-3 rounded-lg" style="background: #e8f5e9;">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-body-2 font-weight-bold" style="color: #2e7d32;">Equivalente en Bolívares</span>
              <span class="text-h6 font-weight-bold" style="color: #1b5e20;">Bs. {{ formatMoney(finalAmountUsd * bcvRate.dollar) }}</span>
            </div>
            <div class="text-caption" style="color: #4a7c59;">
              Tasa BCV del día: <strong>Bs. {{ Number(bcvRate.dollar).toFixed(4) }} / USD</strong>
            </div>
          </div>
        </v-card>

        <!-- Switch Saldo a Favor -->
        <v-card v-if="balance.saldoAFavor > 0 && selectedMethodType !== 'balance'" variant="outlined" color="success" class="pa-3 mb-6 bg-white" rounded="lg">
          <v-switch
            v-model="useBalance"
            color="success"
            density="compact"
            hide-details
            class="mt-0"
          >
            <template v-slot:label>
              <span class="text-body-2 font-weight-bold ml-2 text-success">
                Usar saldo disponible (${{ formatMoney(balance.saldoAFavor) }})
              </span>
            </template>
          </v-switch>
        </v-card>
        
        <v-alert variant="tonal" color="info" density="compact" class="text-caption mb-4">
          <v-icon start size="16">mdi-shield-check</v-icon>
          Pago seguro. Los datos son procesados y validados por nuestro equipo.
        </v-alert>

        <!-- WhatsApp Contact for All Plans -->
        <v-card variant="outlined" color="success" class="pa-4 bg-white" rounded="lg" style="border-width: 2px;">
          <div class="d-flex align-start">
            <v-avatar color="success" variant="tonal" size="40" class="mr-3">
              <v-icon size="24" color="success">mdi-whatsapp</v-icon>
            </v-avatar>
            <div>
              <div class="text-body-2 font-weight-bold text-success mb-1">Atención Personalizada</div>
              <div class="text-caption text-medium-emphasis mb-3">
                Nuestro equipo de ventas está disponible para asistirte con tu compra.
              </div>
              <v-btn color="#25D366" variant="flat" size="small" class="text-none text-white font-weight-bold w-100" @click="contactarVentasWhatsapp">
                Contactar Ventas
              </v-btn>
            </div>
          </div>
        </v-card>

        </div><!-- fin summary-sticky -->
      </v-col>

      <!-- Columna Derecha: Métodos de Pago (Mobile: Abajo) -->
      <v-col cols="12" md="7" lg="8" class="pa-4 pa-md-8 order-2 order-md-1 bg-white" style="border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.04);">
        
        <h1 class="text-h4 font-weight-black text-secondary mb-2">Completar Pago</h1>
        <p class="text-body-1 text-medium-emphasis mb-8">Selecciona el método de pago que prefieras y reporta tu transacción.</p>

        <!-- Paso 1: Selección de Método -->
        <div class="mb-10">
          <h3 class="text-h6 font-weight-bold mb-4 d-flex align-center text-secondary">
            <v-avatar color="primary" size="28" class="text-body-2 text-white mr-3 font-weight-bold">1</v-avatar>
            Elige un Método de Pago
          </h3>
          <v-row dense>
            <v-col cols="12" sm="6" md="4" v-for="method in availableMethods" :key="method.id">
              <v-card 
                variant="outlined" 
                class="payment-method-card h-100 cursor-pointer transition-swing"
                :class="{ 'border-primary bg-primary-lighten-5': paymentFormData.payment_method_id === method.id }"
                :style="paymentFormData.payment_method_id === method.id ? 'border-width: 2px;' : ''"
                @click="selectMethod(method)"
              >
                <v-card-text class="pa-4 d-flex flex-column align-center justify-center text-center">
                  <v-icon :color="methodColor(method.type)" size="32" class="mb-2">{{ methodIcon(method.type) }}</v-icon>
                  <div class="font-weight-bold text-body-2">{{ method.name }}</div>
                  <v-chip v-if="method.charge_igtf" size="x-small" color="warning" class="mt-2" variant="flat">+3% IGTF</v-chip>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Si hay método seleccionado y no es balance (que se paga directo) -->
        <v-expand-transition>
          <div v-if="selectedMethod && selectedMethodType !== 'balance'">
            
            <!-- Datos para pagar -->
            <v-alert v-if="selectedMethodDescription" variant="tonal" color="primary" density="compact" class="mb-6 text-body-2">
              <v-icon start size="16">mdi-information-outline</v-icon>
              {{ selectedMethodDescription }}
            </v-alert>

            <v-card v-if="selectedMethodDetails && Object.keys(selectedMethodDetails).length" variant="outlined" class="pa-4 mb-6 bg-grey-lighten-4" rounded="lg">
              <p class="text-caption text-uppercase font-weight-bold mb-3 text-secondary">Datos para realizar el pago</p>
              <v-row dense>
                <v-col cols="12" sm="6" v-for="(val, key) in selectedMethodDetails" :key="key">
                  <div class="d-flex flex-column mb-2">
                    <span class="text-caption text-medium-emphasis">{{ detailLabel(key) }}</span>
                    <span class="text-body-2 font-weight-bold">{{ val }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-card>

            <!-- Ayuda de WhatsApp para el método de pago -->
            <v-slide-y-transition>
              <div v-if="selectedMethod?.support_phone" class="text-caption text-center mb-6 mt-n2">
                <v-icon size="16" color="success" class="mr-1 mb-1">mdi-whatsapp</v-icon>
                <span class="text-medium-emphasis">¿Tienes problemas con este método de pago?</span>
                <a 
                  :href="`https://wa.me/58${(selectedMethod.support_phone_prefix || '').replace(/^0/, '')}${(selectedMethod.support_phone || '').replace(/\D/g, '')}`" 
                  target="_blank" 
                  class="text-success text-decoration-underline font-weight-bold ml-1"
                >
                  Contáctanos aquí
                </a>
              </div>
            </v-slide-y-transition>

            <!-- Paso 2: Comprobante y Datos -->
            <div class="mb-6">
              <h3 class="text-h6 font-weight-bold mb-4 d-flex align-center text-secondary">
                <v-avatar color="primary" size="28" class="text-body-2 text-white mr-3 font-weight-bold">2</v-avatar>
                Datos de la Transacción
              </h3>
              
              <v-form ref="paymentForm" v-model="formValid">
                
                <!-- OCR Upload Zone -->
                <v-card
                  variant="outlined"
                  rounded="lg"
                  class="proof-upload-zone mb-6"
                  :class="{ 'border-primary': proofFile, 'bg-grey-lighten-4': !proofFile }"
                  @click="$refs.proofFileInput?.click()"
                  style="cursor: pointer; border-style: dashed; border-width: 2px;"
                >
                  <div v-if="ocrProcessing" class="text-center pa-6">
                    <v-progress-circular indeterminate color="primary" size="40" width="3" class="mb-3"></v-progress-circular>
                    <div class="text-subtitle-2 text-primary font-weight-bold">
                      <v-icon start size="18">mdi-robot-outline</v-icon>
                      Analizando comprobante con IA...
                    </div>
                  </div>

                  <div v-else-if="proofFile" class="text-center pa-6">
                    <v-icon :icon="proofFile.type?.startsWith('image/') ? 'mdi-image' : 'mdi-file-pdf-box'" size="48" color="primary" class="mb-3"></v-icon>
                    <div class="text-subtitle-1 font-weight-bold">{{ proofFile.name }}</div>
                    <v-img v-if="proofPreviewUrl" :src="proofPreviewUrl" max-height="200" contain class="rounded-lg mt-4 mx-auto border" style="max-width: 100%;"></v-img>
                    <div class="mt-4">
                      <v-btn variant="tonal" color="primary" size="small" class="text-none mr-2" @click.stop="$refs.proofFileInput?.click()">Cambiar</v-btn>
                      <v-btn variant="tonal" color="error" size="small" class="text-none" @click.stop="removeProofFile">Quitar</v-btn>
                    </div>
                  </div>

                  <div v-else class="text-center pa-8">
                    <v-icon icon="mdi-cloud-upload-outline" size="48" color="grey-darken-1" class="mb-3"></v-icon>
                    <div class="text-h6 font-weight-bold mb-1 text-secondary">Sube tu comprobante de pago</div>
                    <div class="text-body-2 text-medium-emphasis mb-4">La Inteligencia Artificial extraerá los datos automáticamente</div>
                    <v-btn color="primary" variant="tonal" class="text-none pointer-events-none">Seleccionar Archivo</v-btn>
                  </div>

                  <input ref="proofFileInput" type="file" accept="image/*,.pdf" style="display: none" @change="onProofInputChange" />
                </v-card>

                <!-- OCR Alert -->
                <v-fade-transition>
                  <v-alert v-if="ocrCompleted" variant="tonal" color="success" density="compact" class="mb-6">
                    <v-icon start size="18">mdi-robot-outline</v-icon>
                    ¡Datos extraídos! Por favor verifica que sean correctos.
                  </v-alert>
                </v-fade-transition>

                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field 
                      v-model="paymentFormData.reference" 
                      label="Número de Referencia"
                      variant="outlined" 
                      density="comfortable" 
                      prepend-inner-icon="mdi-pound"
                      :rules="[v => !!v || 'Requerido']" 
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field 
                      v-if="selectedMethodType === 'mobile_payment'"
                      v-model="paymentFormData.amountBsFormatted" 
                      label="Monto Reportado (Bs.)" 
                      variant="outlined" 
                      density="comfortable" 
                      type="text"
                      prepend-inner-icon="mdi-cash"
                      :rules="[v => parseBsAmount(v) > 0 || 'Debe ser mayor a 0']" 
                      :hint="`Ingresa el monto exacto en Bs. que transferiste (incluye decimales). Equivale a $${formatMoney(montoReportadoEnUsd)} USD`"
                      persistent-hint
                      @input="handleBsInput"
                      @focus="handleBsInput"
                    ></v-text-field>
                    <v-text-field 
                      v-else
                      v-model.number="paymentFormData.amount" 
                      label="Monto Reportado (USD)" 
                      variant="outlined" 
                      density="comfortable" 
                      type="number" 
                      step="0.01" 
                      prepend-inner-icon="mdi-currency-usd"
                      :rules="[v => v > 0 || 'Debe ser mayor a 0']" 
                      hint="Ingresa el monto exacto que pagaste, con decimales incluidos"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                </v-row>

                <!-- Alerta de pago en Bs para Pago Móvil -->
                <v-alert v-if="selectedMethodType === 'mobile_payment' && bcvRate" variant="tonal" color="success" density="compact" class="mb-4 text-body-2">
                  <v-icon start size="18">mdi-cash-multiple</v-icon>
                  <strong>Debes transferir Bs. {{ formatMoney(finalAmountUsd * bcvRate.dollar) }}</strong>
                  <span class="text-medium-emphasis ml-1">(Tasa BCV: Bs. {{ Number(bcvRate.dollar).toFixed(4) }} / USD)</span>
                </v-alert>

                <!-- Campos Dinámicos -->
                <v-row v-if="selectedMethodType === 'mobile_payment'">
                  <v-col cols="12" md="4">
                    <v-text-field v-model="paymentFormData.sender_details.sender_phone" label="Teléfono Emisor" variant="outlined" density="comfortable" :rules="[v => !!v || 'Requerido']"></v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="paymentFormData.sender_details.sender_document" label="Cédula Emisor" variant="outlined" density="comfortable" :rules="[v => !!v || 'Requerido']"></v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="paymentFormData.sender_details.sender_bank" label="Banco Emisor" variant="outlined" density="comfortable" :rules="[v => !!v || 'Requerido']"></v-text-field>
                  </v-col>
                </v-row>

                <v-row v-if="selectedMethodType === 'zelle'">
                  <v-col cols="12" md="6">
                    <v-text-field v-model="paymentFormData.sender_details.sender_email" label="Correo Zelle Emisor" variant="outlined" density="comfortable" type="email" :rules="[v => !!v || 'Requerido']"></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="paymentFormData.sender_details.sender_name" label="Nombre Titular Zelle" variant="outlined" density="comfortable" :rules="[v => !!v || 'Requerido']"></v-text-field>
                  </v-col>
                </v-row>

                <v-row v-if="selectedMethodType === 'binance'">
                  <v-col cols="12" md="6">
                    <v-text-field v-model="paymentFormData.sender_details.sender_email" label="Correo Binance" variant="outlined" density="comfortable" type="email" :rules="[v => !!v || 'Requerido']"></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="paymentFormData.sender_details.sender_binance_id" label="Binance ID / Pay ID" variant="outlined" density="comfortable" :rules="[v => !!v || 'Requerido']"></v-text-field>
                  </v-col>
                </v-row>
              </v-form>
            </div>
          </div>
        </v-expand-transition>
        
        <!-- Caso: Todo se paga con saldo a favor -->
        <div v-if="selectedMethodType === 'balance'" class="mb-6 text-center pa-6">
          <v-icon size="64" color="success" class="mb-4">mdi-wallet-outline</v-icon>
          <h3 class="text-h5 font-weight-bold mb-2">Pago con Saldo a Favor</h3>
          <p class="text-body-1 text-medium-emphasis">El total de la factura (${{ formatMoney(invoice?.amount) }}) será descontado automáticamente de tu saldo a favor.</p>
        </div>

        <v-divider class="mb-6"></v-divider>

        <!-- Acciones -->
        <div class="d-flex flex-column align-end mt-6">
          <div class="d-flex flex-column flex-sm-row justify-end gap-3 w-100 mb-2">
              <v-btn variant="tonal" color="grey-darken-2" size="large" class="text-none font-weight-bold px-8" to="/cliente/facturacion-suscripcion">
                Cancelar
              </v-btn>
              <v-btn 
                color="primary" 
                variant="flat" 
                size="large" 
                class="text-none font-weight-bold px-8" 
                :loading="submitting"
                :disabled="!isReadyToSubmit"
                @click="submitPayment"
              >
                <v-icon start>mdi-check-decagram</v-icon>
                Confirmar y Pagar
              </v-btn>
            </div>
            <div class="text-caption text-medium-emphasis text-right w-100">
              Al hacer clic en "Confirmar y Pagar", aceptas todos los 
              <a href="#" @click.prevent class="text-primary text-decoration-none font-weight-bold">términos y condiciones</a>.
            </div>
          </div>
      </v-col>
    </v-row>
    
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="4000">
      {{ snackbar.text }}
      <template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template>
    </v-snackbar>
  </v-container>
</template>

<script>
import billingService from '@/services/billingService';
import paymentOcrService from '@/services/paymentOcrService';
import userService from '@/services/userService';
import bcvService from '@/services/bcvService';
import { supabase } from '@/lib/supabaseClient';

export default {
  name: 'Checkout',
  data() {
    return {
      loading: true,
      paymentSuccessful: false,
      error: null,
      invoice: null,
      currentUser: null,
      apiMethods: [],
      balance: { saldoAFavor: 0 },
      bcvRate: null,
      
      // Form State
      useBalance: false,
      paymentFormData: {
        payment_method_id: null,
        reference: '',
        amount: 0,
        amountBsFormatted: '',
        sender_details: {}
      },
      proofFile: null,
      proofPreviewUrl: null,
      ocrProcessing: false,
      ocrCompleted: false,
      formValid: false,
      submitting: false,
      
      snackbar: { show: false, text: '', color: 'success' }
    };
  },
  computed: {
    availableMethods() {
      const methods = [...this.apiMethods];
      // Si el saldo a favor es mayor o igual al monto total, permitir pagar full con saldo
      if (this.balance?.saldoAFavor >= this.invoice?.amount) {
        if (!methods.find(m => m.id === 'balance_method')) {
          methods.unshift({
            id: 'balance_method',
            name: 'Saldo a Favor',
            type: 'balance',
            description: `Utiliza tu saldo disponible ($${this.formatMoney(this.balance.saldoAFavor)})`,
            is_enabled: true,
            charge_igtf: false,
            require_proof: false,
            details: {}
          });
        }
      }
      return methods;
    },
    selectedMethod() {
      return this.availableMethods.find(m => m.id === this.paymentFormData.payment_method_id);
    },
    selectedMethodType() { return this.selectedMethod?.type || null; },
    selectedMethodDescription() { return this.selectedMethod?.description || null; },
    selectedMethodDetails() { return this.selectedMethod?.details || {}; },
    selectedMethodIgtf() { return this.selectedMethod?.charge_igtf || false; },
    selectedMethodRequireProof() { return this.selectedMethod?.require_proof || false; },
    
    igtfAmount() {
      if (!this.selectedMethodIgtf || !this.invoice) return 0;
      return parseFloat(this.invoice.amount) * 0.03;
    },
    totalWithIgtf() {
      return parseFloat(this.invoice?.amount || 0) + this.igtfAmount;
    },
    balanceUsedAmount() {
      if (!this.useBalance || this.selectedMethodType === 'balance') return 0;
      return Math.min(this.balance.saldoAFavor, this.totalWithIgtf);
    },
    finalAmountUsd() {
      if (this.selectedMethodType === 'balance') return 0;
      return Math.max(0, this.totalWithIgtf - this.balanceUsedAmount);
    },
    // Computed: convierte monto reportado en Bs a USD cuando el método es Pago Móvil
    montoReportadoEnUsd() {
      if (this.selectedMethodType !== 'mobile_payment' || !this.bcvRate?.dollar) return 0;
      const bsVal = this.parseBsAmount(this.paymentFormData.amountBsFormatted);
      if (!bsVal) return 0;
      return bsVal / this.bcvRate.dollar;
    },
    isReadyToSubmit() {
      if (!this.selectedMethod) return false;
      if (this.selectedMethodType === 'balance') return true; // Listo para cobrar todo del saldo
      
      const hasRef = !!this.paymentFormData.reference?.trim();
      const hasAmount = this.paymentFormData.amount > 0;
      if (!hasRef || !hasAmount || !this.formValid) return false;
      
      if (this.selectedMethodRequireProof && !this.proofFile) return false;
      return true;
    }
  },
  watch: {
    finalAmountUsd: {
      handler(val) {
        // No sobreescribir si el método es Pago Móvil (el monto está en Bs)
        if (this.selectedMethodType === 'mobile_payment') return;
        if (this.paymentFormData.amount === 0 || !this.paymentFormData.amount || this.paymentFormData.amount === this.totalWithIgtf) {
           this.paymentFormData.amount = parseFloat(val.toFixed(2));
        }
      },
      immediate: true
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    contactarVentasWhatsapp() {
      const periodStr = this.billingPeriod === 'annual' ? 'Anual' : 'Mensual';
      const name = this.invoice?.subscription?.plan?.name || this.selectedPlan?.name || 'Suscripción';
      const price = this.invoice?.amount || '0.00';
      const msg = `Hola, necesito ayuda con la compra del plan ${periodStr} ${name} de $${price}.`;
      const phone = '584140945444';
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    },
    async loadData() {
      this.loading = true;
      this.error = null;
      try {
        const invoiceId = this.$route.query.invoice_id;
        const planId = this.$route.query.plan_id;
        const period = this.$route.query.period || 'monthly';
        this.billingPeriod = period;

        if (!invoiceId && !planId) throw new Error("ID de factura o plan no proporcionado en la URL.");

        this.currentUser = await userService.getCurrentUser();
        if (!this.currentUser?.client_id) throw new Error("No se pudo identificar al cliente.");

        // Modo Factura Existente
        if (invoiceId) {
          this.checkoutMode = 'invoice';
          const invRes = await billingService.getInvoiceById(invoiceId);
          if (!invRes.success || !invRes.data) throw new Error("Factura no encontrada.");
          if (invRes.data.client_id !== this.currentUser.client_id) throw new Error("No tienes permiso para ver esta factura.");
          if (invRes.data.status === 'paid') throw new Error("Esta factura ya fue pagada.");
          this.invoice = invRes.data;
        } 
        // Modo Nueva Suscripción
        else if (planId) {
          this.checkoutMode = 'plan';
          const { default: plansService } = await import('@/services/plansService');
          const plansRes = await plansService.getPlans();
          if (!plansRes.success) throw new Error("Error cargando planes.");
          const plan = plansRes.data.find(p => p.id === planId);
          if (!plan) throw new Error("Plan no encontrado.");
          
          this.selectedPlan = plan;
          const amount = period === 'annual' ? plan.price_annual : plan.price_monthly;
          
          // Crear un "mock" de factura para que la UI funcione igual
          this.invoice = {
             amount: amount,
             currency: 'USD',
             subscription: { plan: { name: plan.name } },
             invoice_number: 'Nueva Suscripción'
          };
        }

        // Cargar otros datos
        const [methodsRes, balanceRes, bcvRes] = await Promise.all([
          billingService.getPaymentMethods(),
          billingService.getBalance(this.currentUser.client_id),
          bcvService.getCurrentRate()
        ]);

        if (methodsRes.success) this.apiMethods = methodsRes.data.filter(m => m.is_enabled);
        if (balanceRes.success) this.balance = balanceRes.data;
        if (bcvRes?.success) this.bcvRate = bcvRes.data;
        
        // Auto-seleccionar si solo hay saldo a favor que cubre todo
        if (this.balance.saldoAFavor >= this.invoice.amount && this.availableMethods.find(m => m.id === 'balance_method')) {
            this.selectMethod(this.availableMethods.find(m => m.id === 'balance_method'));
        }

      } catch (err) {
        console.error(err);
        this.error = err.message || "Ocurrió un error inesperado al cargar el checkout.";
      } finally {
        this.loading = false;
      }
    },
    
    selectMethod(method) {
      this.paymentFormData.payment_method_id = method.id;
      this.paymentFormData.sender_details = {}; // reset
      if (method.type !== 'balance') {
        // Si es Pago Móvil, pre-llenar con el monto en Bs; si no, en USD
        if (method.type === 'mobile_payment' && this.bcvRate?.dollar) {
          const bsValue = this.finalAmountUsd * this.bcvRate.dollar;
          this.paymentFormData.amountBsFormatted = this.formatBsValue(bsValue);
        } else {
          this.paymentFormData.amount = parseFloat(this.finalAmountUsd.toFixed(2));
        }
      }
    },

    onProofInputChange(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.proofFile = file;
      if (this.proofPreviewUrl) URL.revokeObjectURL(this.proofPreviewUrl);
      if (file.type?.startsWith('image/')) {
        this.proofPreviewUrl = URL.createObjectURL(file);
      } else {
        this.proofPreviewUrl = null;
      }
      this.processProofOcr(file);
    },

    removeProofFile() {
      this.proofFile = null;
      if (this.proofPreviewUrl) { URL.revokeObjectURL(this.proofPreviewUrl); this.proofPreviewUrl = null; }
      this.ocrCompleted = false;
      if (this.$refs.proofFileInput) this.$refs.proofFileInput.value = '';
    },

    async processProofOcr(file) {
      this.ocrProcessing = true;
      this.ocrCompleted = false;
      try {
        const ocrData = await paymentOcrService.extractPaymentData(file, this.selectedMethodType);
        if (ocrData && ocrData.confidence >= 0.3) {
          if (ocrData.reference && !this.paymentFormData.reference) this.paymentFormData.reference = ocrData.reference;

          if (this.selectedMethodType === 'mobile_payment' && ocrData.sender) {
            if (ocrData.sender.phone) this.paymentFormData.sender_details.sender_phone = ocrData.sender.phone;
            if (ocrData.sender.document) this.paymentFormData.sender_details.sender_document = ocrData.sender.document;
            if (ocrData.sender.bank) this.paymentFormData.sender_details.sender_bank = ocrData.sender.bank;
          } else if (this.selectedMethodType === 'zelle' && ocrData.sender) {
             if (ocrData.sender.email) this.paymentFormData.sender_details.sender_email = ocrData.sender.email;
             if (ocrData.sender.name) this.paymentFormData.sender_details.sender_name = ocrData.sender.name;
             if (ocrData.amount) this.paymentFormData.amount = ocrData.amount;
          } else if (this.selectedMethodType === 'binance' && ocrData.sender) {
             if (ocrData.sender.email) this.paymentFormData.sender_details.sender_email = ocrData.sender.email;
             if (ocrData.sender.binance_id) this.paymentFormData.sender_details.sender_binance_id = ocrData.sender.binance_id;
             if (ocrData.amount) this.paymentFormData.amount = ocrData.amount;
          }
          // Para Pago Móvil, cargar el monto en Bs si se encontró
          if (this.selectedMethodType === 'mobile_payment' && ocrData.amount) {
             this.paymentFormData.amountBsFormatted = this.formatBsValue(ocrData.amount);
          }
          this.ocrCompleted = true;
        }
      } catch (error) {
        console.error('OCR Error:', error);
      } finally {
        this.ocrProcessing = false;
      }
    },

    async _processNewSubscriptionInvoice() {
        // 1. Crear Invoice pendiente vía RPC
        const invRes = await billingService.createPendingSubscriptionInvoice({
           client_id: this.currentUser.client_id,
           amount: this.invoice.amount,
           notes: `Suscripción a plan ${this.selectedPlan.name} (${this.billingPeriod}) - PENDIENTE DE APROBACIÓN`
        });
        
        if (!invRes.success) throw new Error("No se pudo generar la factura de la solicitud de suscripción: " + (invRes.error?.message || ""));
        return invRes.data; // Retorna la factura real creada
    },

    async submitPayment() {
      this.submitting = true;
      try {
        let activeInvoice = this.invoice;
        
        // Si estamos comprando un plan nuevo, primero creamos la suscripción y su factura
        if (this.checkoutMode === 'plan') {
           activeInvoice = await this._processNewSubscriptionInvoice();
        }

        let result;

        if (this.selectedMethodType === 'balance') {
           // Pago total con saldo
           result = await billingService.payWithBalance({
              invoice_id: activeInvoice.id,
              client_id: this.currentUser.client_id,
              amount: parseFloat(activeInvoice.amount)
           });
        } else {
           // Pago regular / mixto
           const finalSenderDetails = { ...this.paymentFormData.sender_details };
           if (this.useBalance && this.balanceUsedAmount > 0) {
              finalSenderDetails.related_balance_payment = this.balanceUsedAmount;
              
              // Cobrar el saldo usado directamente primero
              const balResult = await billingService.payWithBalance({
                  invoice_id: activeInvoice.id,
                  client_id: this.currentUser.client_id,
                  amount: this.balanceUsedAmount
              });
              if (!balResult.success) throw balResult.error;
           }

           // Contexto del plan
           const planName = this.invoice?.subscription?.plan?.name || this.selectedPlan?.name || 'Suscripción';
           finalSenderDetails.plan_name = planName;
           finalSenderDetails.billing_period = this.billingPeriod === 'annual' ? 'Anual' : 'Mensual';
           finalSenderDetails.plan_price_usd = this.invoice?.amount;

           // Si es Pago Móvil, guardar monto en Bs y la tasa para trazabilidad
           let reportedAmount = parseFloat(this.paymentFormData.amount);
           if (this.selectedMethodType === 'mobile_payment' && this.bcvRate?.dollar) {
             const bsVal = this.parseBsAmount(this.paymentFormData.amountBsFormatted);
             finalSenderDetails.reported_amount_bs = bsVal;
             finalSenderDetails.bcv_rate_used = this.bcvRate.dollar;
             // Convertir a USD para el sistema
             reportedAmount = parseFloat((bsVal / this.bcvRate.dollar).toFixed(2));
           }

           result = await billingService.submitPaymentReport({
              invoice_id: activeInvoice.id,
              client_id: this.currentUser.client_id,
              payment_method_id: this.paymentFormData.payment_method_id,
              payment_method_type: this.selectedMethodType,
              reference: this.paymentFormData.reference.trim(),
              amount: reportedAmount,
              sender_details: finalSenderDetails
           }, this.proofFile);
        }

        if (result.success) {
          this.paymentSuccessful = true;
          // Despachar evento para que la app principal recargue el estado del usuario/plan en background
          window.dispatchEvent(new CustomEvent('userUpdated'));
          
          // 1. Invocar notificación fire-and-forget al super admin
          supabase.functions.invoke('send-invoice-email', {
            body: {
              mode: 'payment_report',
              report_id: result.data.id,
              client_name: this.currentUser?.company_name || this.currentUser?.email || 'Cliente',
              plan_name: finalSenderDetails.plan_name,
              billing_period: finalSenderDetails.billing_period,
              amount_usd: reportedAmount,
              amount_bs: finalSenderDetails.reported_amount_bs || null,
              bcv_rate: finalSenderDetails.bcv_rate_used || null,
              payment_method: this.selectedMethod?.name || this.selectedMethodType,
              reference: this.paymentFormData.reference.trim()
            }
          }).catch(err => console.warn('Error notify super_admin:', err));

          // 2. Invocar notificación fire-and-forget al cliente de confirmación de recepción
          supabase.functions.invoke('send-invoice-email', {
            body: {
              mode: 'payment_received',
              to: this.currentUser.email,
              client_name: this.currentUser?.company_name || this.currentUser?.email || 'Cliente',
              plan_name: finalSenderDetails.plan_name,
              amount_usd: reportedAmount,
              amount_bs: finalSenderDetails.reported_amount_bs || null,
              payment_method: this.selectedMethod?.name || this.selectedMethodType,
              reference: this.paymentFormData.reference.trim()
            }
          }).catch(err => console.warn('Error notify client payment received:', err));

        } else {
          throw result.error;
        }
      } catch (error) {
        console.error('Error submitting payment:', error);
        this.showSnackbar(error.message || 'Error al procesar el pago. Por favor intenta de nuevo.', 'error');
      } finally {
        this.submitting = false;
      }
    },

    formatMoney(val) {
      if (!val) return '0.00';
      return parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    
    // Helpers para Bs
    handleBsInput(evt) {
      // Extraemos solo los dígitos
      const digits = evt.target.value.replace(/\D/g, '');
      if (!digits) {
        this.paymentFormData.amountBsFormatted = '';
        return;
      }
      
      // Tratamos los dígitos como enteros que representan centavos
      const val = parseInt(digits, 10) / 100;
      
      // Formateamos inmediatamente
      this.paymentFormData.amountBsFormatted = parseFloat(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    parseBsAmount(str) {
      if (!str) return 0;
      // Remueve puntos (separadores de miles) y cambia la coma decimal por un punto decimal
      const cleanStr = str.toString().replace(/\./g, '').replace(',', '.');
      const val = parseFloat(cleanStr);
      return isNaN(val) ? 0 : val;
    },
    formatBsValue(val) {
      if (!val) return '0,00';
      // Formato venezolano (es-VE) da 73.480,69
      return parseFloat(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    methodColor(type) {
      const colors = { mobile_payment: 'info', bank_transfer: 'primary', zelle: 'purple', binance: 'warning', balance: 'success' };
      return colors[type] || 'grey';
    },
    methodIcon(type) {
      const icons = { mobile_payment: 'mdi-cellphone', bank_transfer: 'mdi-bank', zelle: 'mdi-alpha-z-box', binance: 'mdi-bitcoin', balance: 'mdi-wallet-outline' };
      return icons[type] || 'mdi-credit-card';
    },
    detailLabel(key) {
      const labels = { phone: 'Teléfono', document: 'Documento', bank: 'Banco', account_number: 'Nº Cuenta', beneficiary_name: 'Beneficiario', beneficiary_document: 'Documento', email: 'Email', full_name: 'Nombre' };
      return labels[key] || key;
    },
    showSnackbar(text, color) {
      this.snackbar = { show: true, text, color };
    }
  }
}
</script>

<style scoped>
.checkout-page {
  font-family: 'Inter', 'Open Sans', sans-serif;
}
.max-w-1200 {
  max-width: 1200px;
}
/* Columna de resumen sticky en desktop */
.summary-sticky {
  position: sticky;
  top: 24px;
}
.payment-method-card {
  transition: all 0.2s ease;
  border-width: 1px;
}
.payment-method-card:hover {
  transform: translateY(-2px);
  border-color: var(--v-primary-base) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.bg-primary-lighten-5 {
  background-color: #f0f7ff !important;
}
.proof-upload-zone {
  transition: all 0.3s ease;
}
.proof-upload-zone:hover {
  background-color: #f5f5f5 !important;
}
</style>
