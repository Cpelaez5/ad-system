<template>
  <v-container fluid class="cliente-inicio pa-4 pa-md-6" style="max-width: 720px;">

    <!-- ═══════════════════════════════════════════════ -->
    <!-- SKELETON LOADING                                -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-if="loading">
      <v-skeleton-loader type="heading" width="260" class="mb-2" />
      <v-skeleton-loader type="text" width="320" class="mb-6" />
      <v-skeleton-loader type="button" height="72" class="mb-3 rounded-xl" />
      <v-skeleton-loader type="button" height="72" class="mb-3 rounded-xl" />
      <v-skeleton-loader type="button" height="72" class="mb-6 rounded-xl" />
      <v-skeleton-loader type="heading" width="220" class="mb-2" />
      <v-skeleton-loader type="list-item-two-line" class="rounded-xl" />
    </template>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- ERROR                                           -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else-if="error">
      <AvisoAmable
        tipo="error"
        titulo="No pudimos cargar tu inicio"
        :mensaje="error"
        texto-accion="Reintentar"
        @accion="cargarDatos"
      />
    </template>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- CONTENIDO PRINCIPAL                             -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else>

      <!-- ─── Saludo + frase del mes ─── -->
      <div class="mb-6">
        <h1 class="inicio-saludo mb-2">¡Hola, {{ nombreUsuario }}!</h1>
        <p class="inicio-frase-mes" :aria-label="fraseDelMes">
          <template v-if="totalVendidoUSD === 0 && totalGastadoUSD === 0">Este mes todavía no registras nada. Empieza tocando "Gasté o compré algo".</template>
          <template v-else>En {{ nombreMesActual }} vendiste
            <AnimatedNumber :value="totalVendidoUSD" :formatter="formatearUSD" :duration="400" />
            y gastaste
            <AnimatedNumber :value="totalGastadoUSD" :formatter="formatearUSD" :duration="400" />
            . Te quedan
            <AnimatedNumber :value="diferenciaUSD" :formatter="formatearUSD" :duration="400" />.</template>
        </p>
        <p v-if="mostrarEquivalenteBs" class="inicio-frase-bs text-medium-emphasis">
          ≈ {{ bsVendido }} vendidos · {{ bsGastado }} gastados · {{ bsDiferencia }} de diferencia
        </p>
      </div>

      <!-- ─── Aviso de éxito tras guardar un registro ─── -->
      <AvisoAmable
        v-if="avisoExito"
        tipo="info"
        icono="mdi-check-circle"
        :mensaje="avisoExito.mensaje"
        texto-accion="Registrar otro"
        cerrable
        class="mb-4 aviso-exito-animado"
        @accion="registrarOtro"
        @cerrar="avisoExito = null"
      />

      <!-- ─── Tres acciones grandes ─── -->
      <div class="mb-6 inicio-acciones">
        <TarjetaAccion
          icono="mdi-cart-outline"
          titulo="Vendí algo"
          subtitulo="Registra una venta a tu cliente"
          color="primary"
          class="mb-3"
          @click="abrirRegistro('VENTA')"
        />
        <TarjetaAccion
          icono="mdi-receipt-text-outline"
          titulo="Gasté o compré algo"
          subtitulo="Registra una compra o un gasto"
          color="secondary"
          class="mb-3"
          @click="abrirRegistro('COMPRA')"
        />
        <TarjetaAccion
          icono="mdi-chart-line"
          titulo="¿Cómo voy?"
          subtitulo="Mira tus números completos"
          color="success"
          :to="'/cliente/dashboard'"
        />
      </div>

      <!-- ─── Lo que tienes pendiente ─── -->
      <div>
        <h2 class="inicio-subtitulo mb-3">Lo que tienes pendiente</h2>

        <EstadoVacio
          v-if="pendientes.length === 0"
          icono="mdi-thumb-up-outline"
          titulo="Todo al día"
          mensaje="No tienes documentos ni pagos pendientes por ahora."
        />

        <v-list v-else lines="two" class="pendientes-lista rounded-xl" bg-color="surface">
          <v-list-item
            v-for="item in pendientes"
            :key="item.id"
          >
            <template #prepend>
              <v-icon :color="item.color" icon="mdi-circle" size="12" />
            </template>
            <v-list-item-title class="font-weight-medium">{{ item.texto }}</v-list-item-title>
            <template #append>
              <v-btn
                size="small"
                variant="tonal"
                :color="item.color"
                @click="$router.push(item.accionRuta)"
              >
                {{ item.accionTexto }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <!-- ─── Diálogo: Vendí algo / Gasté o compré algo ─── -->
      <v-dialog
        v-model="dialogRegistroAbierto"
        max-width="1100px"
        scrollable
        :fullscreen="$vuetify.display.smAndDown"
        @update:model-value="onDialogModelChange"
      >
        <SimpleInvoiceForm
          v-if="dialogRegistroAbierto"
          ref="formRegistro"
          :flow="flowRegistro"
          simple
          @submit="handleSubmitRegistro"
          @cancel="cerrarRegistro"
        />
      </v-dialog>

    </template>
  </v-container>
</template>

<script>
// ═══════════════════════════════════════════════════════════
// Inicio del cliente (/cliente/inicio) — Fase 2, ver
// docs/mvp/diseno/fase2-spec.md §2.
//
// Muestra: saludo, una frase con lo vendido/gastado del mes actual
// (datos reales, reutilizando invoiceService igual que Dashboard.vue),
// tres accesos grandes y hasta 3 pendientes (documentos fiscales por
// vencer/vencidos + factura de suscripción pendiente).
// ═══════════════════════════════════════════════════════════

import userService from '@/services/userService'
import { hoyISO, parseFechaLocal } from '@/utils/fechas'
import invoiceService from '@/services/invoiceService'
import fiscalService from '@/services/fiscalService'
import billingService from '@/services/billingService'
import bcvService from '@/services/bcvService'
import { guardarRegistro } from '@/services/registroService'
import { formatMoney } from '@/utils/formatMoney'
import { useNotificacionStore } from '@/store/notificacionStore'

import TarjetaAccion from '@/components/ui/TarjetaAccion.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue'

/** Días enteros desde hoy hasta la fecha (local); negativo si ya pasó. */
function diasHasta(fecha) {
  const objetivo = parseFechaLocal(fecha)
  if (!objetivo) return null
  const hoy = parseFechaLocal(hoyISO())
  return Math.round((new Date(objetivo.getFullYear(), objetivo.getMonth(), objetivo.getDate()) - hoy) / 86400000)
}

/** "vence hoy", "vence mañana", "vence en 5 días", "venció ayer", "venció hace 66 días". */
function textoVencimiento(dias) {
  if (dias === 0) return 'vence hoy'
  if (dias === 1) return 'vence mañana'
  if (dias > 1) return `vence en ${dias} días`
  if (dias === -1) return 'venció ayer'
  return `venció hace ${Math.abs(dias)} días`
}

export default {
  name: 'ClienteInicio',

  components: {
    TarjetaAccion,
    EstadoVacio,
    AvisoAmable,
    AnimatedNumber,
    SimpleInvoiceForm,
  },

  data() {
    return {
      loading: true,
      error: null,

      usuario: null,
      clientId: null,

      ventasMes: [],
      comprasMes: [],
      tasaBCV: null,

      pendientes: [],

      dialogRegistroAbierto: false,
      flowRegistro: 'VENTA',
      avisoExito: null,
    }
  },

  computed: {
    notificacionStore() {
      return useNotificacionStore()
    },

    nombreUsuario() {
      if (!this.usuario) return ''
      return this.usuario.firstName || this.usuario.email?.split('@')[0] || ''
    },

    nombreMesActual() {
      const nombre = new Date().toLocaleDateString('es-ES', { month: 'long' })
      return nombre.charAt(0).toUpperCase() + nombre.slice(1)
    },

    totalVendidoUSD() {
      return this.sumarMontosUSD(this.ventasMes)
    },

    totalGastadoUSD() {
      return this.sumarMontosUSD(this.comprasMes)
    },

    diferenciaUSD() {
      return this.totalVendidoUSD - this.totalGastadoUSD
    },

    factorConversion() {
      return this.tasaBCV?.dollar || 0
    },

    mostrarEquivalenteBs() {
      return this.factorConversion > 0 && (this.totalVendidoUSD > 0 || this.totalGastadoUSD > 0)
    },

    bsVendido() {
      return formatMoney(this.totalVendidoUSD * this.factorConversion, 'VES', { abreviar: true })
    },

    bsGastado() {
      return formatMoney(this.totalGastadoUSD * this.factorConversion, 'VES', { abreviar: true })
    },

    bsDiferencia() {
      return formatMoney(this.diferenciaUSD * this.factorConversion, 'VES', { abreviar: true })
    },

    fraseDelMes() {
      if (this.totalVendidoUSD === 0 && this.totalGastadoUSD === 0) {
        return 'Este mes todavía no registras nada. Empieza tocando "Gasté o compré algo".'
      }
      const vendido = formatMoney(this.totalVendidoUSD, 'USD')
      const gastado = formatMoney(this.totalGastadoUSD, 'USD')
      const diferencia = formatMoney(this.diferenciaUSD, 'USD')
      return `En ${this.nombreMesActual} vendiste ${vendido} y gastaste ${gastado}. Te quedan ${diferencia}.`
    },

    /** Lee el query param ?registrar=venta|compra que usa la barra inferior móvil. */
    queryRegistrar() {
      return this.$route?.query?.registrar || null
    },
  },

  watch: {
    queryRegistrar(nuevo) {
      this.aplicarQueryRegistrar(nuevo)
    },
  },

  methods: {
    /** Formateador para <AnimatedNumber> en la frase del mes (misma forma que formatMoney). */
    formatearUSD(numero) {
      return formatMoney(numero, 'USD')
    },

    // ═══════════════════════════════════════════
    // CARGA DE DATOS
    // ═══════════════════════════════════════════

    async cargarDatos() {
      this.loading = true
      this.error = null
      try {
        const currentUser = await userService.getCurrentUser()
        if (!currentUser || !currentUser.client_id) {
          this.error = 'No pudimos identificar tu negocio. Vuelve a iniciar sesión.'
          return
        }
        this.usuario = currentUser
        this.clientId = currentUser.client_id

        const [ventasRes, comprasRes, fiscalRes, billingRes, bcvRes] = await Promise.allSettled([
          invoiceService.getInvoices({ flow: 'VENTA', clientId: currentUser.client_id }),
          invoiceService.getInvoices({ flow: 'COMPRA', clientId: currentUser.client_id }),
          fiscalService.getFiscalDocs({ trashed: false }),
          billingService.getInvoices(currentUser.client_id),
          bcvService.getCurrentRate(),
        ])

        const todasVentas = ventasRes.status === 'fulfilled' ? (ventasRes.value || []) : []
        const todasCompras = comprasRes.status === 'fulfilled' ? (comprasRes.value || []) : []
        const docsFiscales = fiscalRes.status === 'fulfilled' ? (fiscalRes.value || []) : []
        const facturasSistema = (billingRes.status === 'fulfilled' && billingRes.value?.success)
          ? (billingRes.value.data || [])
          : []

        if (bcvRes.status === 'fulfilled' && bcvRes.value?.success) {
          this.tasaBCV = bcvRes.value.data
        }

        const { inicio, fin } = this.rangoMesActual()
        this.ventasMes = this.filtrarPorPeriodo(todasVentas, inicio, fin)
        this.comprasMes = this.filtrarPorPeriodo(todasCompras, inicio, fin)

        this.pendientes = this.construirPendientes(docsFiscales, facturasSistema)
      } catch (err) {
        console.error('❌ [Inicio] Error al cargar datos:', err)
        this.error = 'No pudimos cargar tu inicio. Intenta de nuevo en un momento.'
      } finally {
        this.loading = false
      }
    },

    /** Rango de fechas del mes calendario actual. */
    rangoMesActual() {
      const ahora = new Date()
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)
      return { inicio, fin }
    },

    /** Filtra un array de facturas por rango de fechas (misma regla que Dashboard.vue). */
    filtrarPorPeriodo(facturas, inicio, fin) {
      if (!facturas || !inicio || !fin) return []
      return facturas.filter(inv => {
        // Fecha local: new Date('YYYY-MM-DD') movía las facturas del día 1 al mes anterior
        const fecha = parseFechaLocal(inv.issueDate || inv.createdAt)
        return !!fecha && fecha >= inicio && fecha <= fin
      })
    },

    /** Suma montos estandarizando a USD (misma regla que Dashboard.vue → sumarMontos). */
    sumarMontosUSD(facturas) {
      const bcvRate = this.tasaBCV?.dollar || 1
      const bcvEur = this.tasaBCV?.euro || 1

      return (facturas || []).reduce((sum, inv) => {
        const amount = parseFloat(inv.financial?.totalSales) || 0
        const currency = inv.financial?.currency || 'VES'

        let amountUSD = amount
        if (currency === 'VES') {
          amountUSD = bcvRate > 0 ? amount / bcvRate : amount
        } else if (currency === 'EUR') {
          amountUSD = (bcvEur > 0 && bcvRate > 0) ? (amount * bcvEur) / bcvRate : amount
        }

        return sum + amountUSD
      }, 0)
    },

    /** Construye hasta 3 pendientes: documentos fiscales por vencer/vencidos + plan de suscripción. */
    construirPendientes(docsFiscales, facturasSistema) {
      const items = []

      // Documentos fiscales por vencer (≤30 días) o vencidos, misma regla que fiscalService/Dashboard.
      ;(docsFiscales || []).forEach(doc => {
        if (!doc.expiration_date || doc.status !== 'VIGENTE') return
        const diffDays = diasHasta(doc.expiration_date)
        if (diffDays === null || diffDays > 30) return
        const nombre = doc.name || 'documento'
        items.push({
          id: 'doc-' + doc.id,
          texto: `Tu ${nombre} ${textoVencimiento(diffDays)}`,
          color: diffDays < 0 ? 'error' : 'warning',
          accionTexto: 'Ver',
          accionRuta: '/cliente/fiscal-360',
          prioridad: diffDays < 0 ? 0 : 1,
          dias: diffDays,
        })
      })

      // Factura de suscripción pendiente o vencida.
      const facturaPendiente = (facturasSistema || []).find(f => f.status === 'pending' || f.status === 'overdue')
      if (facturaPendiente) {
        const vencida = facturaPendiente.status === 'overdue'
        const diffDays = facturaPendiente.due_date ? diasHasta(facturaPendiente.due_date) : null
        items.push({
          id: 'plan-' + facturaPendiente.id,
          texto: vencida
            ? 'Tu factura del plan está vencida'
            : (diffDays !== null ? `Tu plan ${textoVencimiento(diffDays)}` : 'Tienes una factura del plan pendiente'),
          color: vencida || (diffDays !== null && diffDays < 0) ? 'error' : 'warning',
          accionTexto: 'Pagar',
          accionRuta: '/cliente/facturacion-suscripcion',
          prioridad: vencida ? 0 : 1,
          dias: diffDays ?? 0,
        })
      }

      return items
        .sort((a, b) => (a.prioridad - b.prioridad) || (a.dias - b.dias))
        .slice(0, 3)
    },

    // ═══════════════════════════════════════════
    // DIÁLOGO DE REGISTRO (Vendí algo / Gasté o compré algo)
    // ═══════════════════════════════════════════

    abrirRegistro(flow) {
      this.flowRegistro = flow
      this.dialogRegistroAbierto = true
    },

    cerrarRegistro() {
      this.dialogRegistroAbierto = false
      this.limpiarQueryRegistrar()
    },

    onDialogModelChange(valor) {
      if (!valor) {
        this.limpiarQueryRegistrar()
      }
    },

    limpiarQueryRegistrar() {
      if (this.$route?.query?.registrar) {
        this.$router.replace({ query: {} })
      }
    },

    /** Abre el diálogo de registro según ?registrar=venta|compra (barra inferior móvil). */
    aplicarQueryRegistrar(valor) {
      if (valor === 'venta') {
        this.abrirRegistro('VENTA')
      } else if (valor === 'compra') {
        this.abrirRegistro('COMPRA')
      }
    },

    async handleSubmitRegistro(formData) {
      const saveResult = await guardarRegistro(formData)

      if (saveResult.success) {
        if (this.$refs.formRegistro) {
          this.$refs.formRegistro.onSaveSuccess()
        }

        if (saveResult.isCompra) {
          window.dispatchEvent(new CustomEvent('ad-proveedor-changed'))
        }

        const esVenta = this.flowRegistro === 'VENTA'
        const mensaje = esVenta ? '¡Listo! Guardamos tu venta.' : '¡Listo! Guardamos tu gasto.'
        this.notificacionStore.mostrar(mensaje, 'success')
        this.avisoExito = { mensaje, flow: this.flowRegistro }

        this.cerrarRegistro()
        await this.cargarDatos()
      } else {
        if (this.$refs.formRegistro) {
          this.$refs.formRegistro.onSaveFailed(saveResult.message)
        }
      }
    },

    registrarOtro() {
      const flow = this.avisoExito?.flow || 'VENTA'
      this.avisoExito = null
      this.abrirRegistro(flow)
    },
  },

  async mounted() {
    this.aplicarQueryRegistrar(this.queryRegistrar)
    await this.cargarDatos()
  },
}
</script>

<style scoped>
.cliente-inicio {
  min-height: 100vh;
}

.inicio-saludo {
  font-size: 1.75rem;
  font-weight: 600;
}

.inicio-frase-mes {
  font-size: 1.0625rem;
  line-height: 1.5;
}

.inicio-frase-bs {
  font-size: 0.8125rem;
  margin-top: 4px;
}

/* Entrada escalonada de las 3 tarjetas de acción: corta y calmada (no es
   el sistema de animación global de animations.css — es específica de
   esta lista de 3 tarjetas). */
.inicio-acciones > * {
  opacity: 0;
  animation: inicio-tarjeta-entrada 320ms cubic-bezier(0, 0, 0.2, 1) forwards;
}
.inicio-acciones > *:nth-child(1) { animation-delay: 0ms; }
.inicio-acciones > *:nth-child(2) { animation-delay: 90ms; }
.inicio-acciones > *:nth-child(3) { animation-delay: 180ms; }

@keyframes inicio-tarjeta-entrada {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Check animado al guardar: el ícono de éxito aparece con un pequeño "pop". */
.aviso-exito-animado :deep(.v-alert__prepend .v-icon) {
  animation: inicio-check-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes inicio-check-pop {
  0% { opacity: 0; transform: scale(0.4); }
  60% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .inicio-acciones > * {
    animation: none;
    opacity: 1;
  }
  .aviso-exito-animado :deep(.v-alert__prepend .v-icon) {
    animation: none;
  }
}

.inicio-subtitulo {
  font-size: 1.125rem;
  font-weight: 600;
}

.pendientes-lista {
  border: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
