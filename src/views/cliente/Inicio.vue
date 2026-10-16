<template>
  <div class="cliente-inicio">

    <!-- ═════════════ CARGANDO ═════════════ -->
    <template v-if="loading">
      <v-skeleton-loader type="heading, text" max-width="420" class="mb-6 bg-transparent" />
      <div class="inicio-rejilla">
        <div>
          <v-skeleton-loader type="image" height="150" class="rounded-xl mb-4" />
          <v-skeleton-loader type="image" height="96" class="rounded-xl" />
        </div>
        <v-skeleton-loader type="list-item-avatar-two-line@5" class="rounded-xl" />
      </div>
    </template>

    <!-- ═════════════ ERROR ═════════════ -->
    <template v-else-if="error">
      <AvisoAmable
        tipo="error"
        titulo="No pudimos cargar tu inicio"
        :mensaje="error"
        texto-accion="Reintentar"
        @accion="cargarDatos"
      />
    </template>

    <!-- ═════════════ CONTENIDO ═════════════ -->
    <template v-else>
      <!-- Saludo + frase del mes -->
      <header class="inicio-cabecera">
        <h1 class="inicio-saludo">¡Hola, {{ nombreUsuario }}!</h1>
        <p class="inicio-frase-mes" :aria-label="fraseDelMes">
          <template v-if="totalVendidoUSD === 0 && totalGastadoUSD === 0">Este mes todavía no registras nada. Empieza tocando «Gasté o compré algo».</template>
          <template v-else>En {{ nombreMesActual }} vendiste
            <AnimatedNumber :value="totalVendidoUSD" :formatter="formatearUSD" :duration="400" />
            y gastaste
            <AnimatedNumber :value="totalGastadoUSD" :formatter="formatearUSD" :duration="400" />.
            Te quedan
            <AnimatedNumber :value="diferenciaUSD" :formatter="formatearUSD" :duration="400" />.</template>
        </p>
        <p v-if="mostrarEquivalenteBs" class="inicio-frase-bs text-medium-emphasis">
          ≈ {{ bsVendido }} vendidos · {{ bsGastado }} gastados · {{ bsDiferencia }} de diferencia
        </p>
        <p v-if="avisoSinTasa" class="inicio-frase-bs text-warning" data-test="sin-tasa">
          {{ avisoSinTasa }} este mes (no entran en estas cifras).
          <router-link to="/cliente/mi-area#tasa">Revisar mi tasa</router-link>
        </p>
      </header>

      <!-- Aviso de éxito tras guardar un registro -->
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

      <div class="inicio-rejilla">
        <!-- Columna principal -->
        <div class="inicio-principal">
          <PanelSiguientePaso
            :listo="!pasoGlobal"
            :titulo="pasoGlobal?.titulo || ''"
            :detalle="pasoGlobal?.detalle || ''"
            :texto-boton="pasoGlobal?.boton || ''"
            :icono-boton="pasoGlobal?.icono || ''"
            titulo-listo="¡Todo en orden por hoy!"
            detalle-listo="Tus papeles, tu plan y tus datos están al día. Registra tus ventas y gastos y nosotros nos ocupamos del resto."
            class="mb-5"
            @accion="ejecutarPasoGlobal"
          />

          <h2 class="inicio-subtitulo">¿Qué quieres hacer?</h2>
          <div class="inicio-acciones">
            <TarjetaAccion
              icono="mdi-cart-outline"
              titulo="Vendí algo"
              subtitulo="Registra una venta a tu cliente"
              color="primary"
              @click="abrirRegistro('VENTA')"
            />
            <TarjetaAccion
              icono="mdi-receipt-text-outline"
              titulo="Gasté o compré algo"
              subtitulo="Tómale una foto a la factura"
              color="secondary"
              @click="abrirRegistro('COMPRA')"
            />
            <TarjetaAccion
              icono="mdi-chart-line"
              titulo="¿Cómo voy?"
              subtitulo="Tus números del mes, en claro"
              color="success"
              :to="'/cliente/dashboard'"
            />
          </div>

          <!-- Lo que tienes pendiente -->
          <SeccionLista
            v-if="pendientes.length"
            titulo="Lo que tienes pendiente"
            icono="mdi-bell-outline"
            class="mt-6"
          >
            <div v-for="item in pendientes" :key="item.id" class="inicio-pendiente">
              <span class="inicio-pendiente__icono" :class="`inicio-pendiente__icono--${item.color}`" aria-hidden="true">
                <v-icon :icon="item.color === 'error' ? 'mdi-alert-circle-outline' : 'mdi-clock-outline'" size="20" />
              </span>
              <span class="inicio-pendiente__texto">{{ item.texto }}</span>
              <v-btn variant="tonal" class="text-none" @click="$router.push(item.accionRuta)">{{ item.accionTexto }}</v-btn>
            </div>
          </SeccionLista>
        </div>

        <!-- Columna lateral: primeros pasos -->
        <aside class="inicio-lateral">
          <ListaPasos
            v-if="!primerosPasosCompletos"
            titulo="Primeros pasos"
            :pasos="primerosPasos"
            @ir="irAPaso"
          />
          <template v-else>
            <div class="inicio-logro">
              <v-icon icon="mdi-trophy-outline" size="28" color="success" />
              <div class="inicio-logro__titulo">¡Ya conoces AD System!</div>
            </div>

            <SeccionLista
              v-if="sugerencias.length"
              titulo="Sugerencias para ti"
              icono="mdi-lightbulb-on-outline"
              class="mt-5"
            >
              <TransitionGroup name="sugerencia" tag="div">
                <div v-for="sug in sugerencias" :key="sug.clave" class="inicio-sugerencia">
                  <span class="inicio-sugerencia__icono" aria-hidden="true"><v-icon :icon="sug.icono" size="20" /></span>
                  <div class="inicio-sugerencia__texto">
                    <div class="inicio-sugerencia__titulo">{{ sug.titulo }}</div>
                    <div class="inicio-sugerencia__detalle">{{ sug.detalle }}</div>
                    <div class="inicio-sugerencia__acciones">
                      <v-btn variant="tonal" color="primary" size="small" class="text-none" @click="ejecutarSugerencia(sug)">
                        {{ sug.textoBoton }}
                      </v-btn>
                      <v-btn variant="text" size="small" class="text-none text-medium-emphasis" @click="ocultarSugerencia(sug)">
                        Ahora no
                      </v-btn>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
            </SeccionLista>
          </template>
        </aside>
      </div>

      <!-- Diálogo: Vendí algo / Gasté o compré algo -->
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
  </div>
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
import { tasasVigentes } from '@/services/tasaService'
import { sumarFacturasEn, textoSinTasa } from '@/utils/monedas'
import { guardarRegistro } from '@/services/registroService'
import { formatMoney } from '@/utils/formatMoney'
import { useNotificacionStore } from '@/store/notificacionStore'

import TarjetaAccion from '@/components/ui/TarjetaAccion.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import ListaPasos from '@/components/ui/ListaPasos.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import sealService from '@/services/seal-service'
import { sugerenciasInicio } from '@/utils/sugerenciasInicio'
import { cargarMes as cargarMesSeniat } from '@/services/seniatService.js'
import { periodoPorDefecto } from '@/utils/seniat/periodos.js'
import { pendienteParaInicio } from '@/utils/seniat/tarjetas.js'

// Marca de "ya visitó ¿Cómo voy?" (la pone Dashboard.vue al abrirse).
export const CLAVE_VISTO_COMO_VOY = 'ad_visto_como_voy'
// Sugerencias ocultas con "Ahora no": { clave: 'YYYY-MM-DD' }; vuelven a los 7 días.
const CLAVE_SUGERENCIAS_OCULTAS = 'ad_sugerencias_ocultas'
const DIAS_OCULTA = 7

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
    AvisoAmable,
    PanelSiguientePaso,
    ListaPasos,
    SeccionLista,
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
      seniatPendiente: null,
      comprasMes: [],
      tasasHoy: {},

      pendientes: [],

      // Señales reales para "Primeros pasos" (nunca se marcan a mano)
      hayVentas: false,
      hayCompras: false,
      tieneRif: false,
      tieneSelloOFirma: false,
      vioComoVoy: false,

      // Para "Sugerencias para ti"
      todasVentas: [],
      papelesSubidos: 0,
      sugerenciasOcultas: {},

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
      return this.tasasHoy?.USD || 0
    },

    /** Facturas del mes que no entran en las cifras por no tener ninguna tasa. */
    avisoSinTasa() {
      const n = sumarFacturasEn(this.ventasMes, 'USD', this.tasasHoy).sinTasa
        + sumarFacturasEn(this.comprasMes, 'USD', this.tasasHoy).sinTasa
      return textoSinTasa(n)
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

    /** Datos mínimos del negocio para que los comprobantes y retenciones salgan bien. */
    perfilCompleto() {
      const c = this.usuario?.client || {}
      return !!(c.activity_type && c.licencia_actividad_economica && (c.estado || c.municipio_id) && c.municipio_id)
    },

    primerosPasos() {
      return [
        { clave: 'perfil', titulo: 'Completa los datos de tu negocio', detalle: 'Actividad, licencia y municipio: con eso calculamos bien tus retenciones.', textoBoton: 'Completar', icono: 'mdi-store-outline', hecho: this.perfilCompleto },
        { clave: 'gasto', titulo: 'Registra tu primer gasto', detalle: 'Tómale una foto a una factura y la leemos por ti.', textoBoton: 'Registrar', icono: 'mdi-camera-outline', hecho: this.hayCompras },
        { clave: 'venta', titulo: 'Registra tu primera venta', detalle: 'Así sabrás cuánto te queda cada mes.', textoBoton: 'Registrar', icono: 'mdi-cart-outline', hecho: this.hayVentas },
        { clave: 'rif', titulo: 'Sube tu RIF', detalle: 'Te avisamos antes de que venza.', textoBoton: 'Subir', icono: 'mdi-card-account-details-outline', hecho: this.tieneRif },
        { clave: 'sello', titulo: 'Agrega tu sello y firma', detalle: 'Salen solos en tus comprobantes de retención.', textoBoton: 'Agregar', icono: 'mdi-stamper', hecho: this.tieneSelloOFirma },
        { clave: 'comovoy', titulo: 'Mira «¿Cómo voy?»', detalle: 'Tus ventas y gastos del mes, sin jerga contable.', textoBoton: 'Ver', icono: 'mdi-chart-line', hecho: this.vioComoVoy },
      ]
    },

    sugerencias() {
      const hoy = parseFechaLocal(hoyISO())
      const descartadas = Object.entries(this.sugerenciasOcultas)
        .filter(([, fecha]) => {
          const desde = parseFechaLocal(fecha)
          return desde && (hoy - desde) / 86400000 < DIAS_OCULTA
        })
        .map(([clave]) => clave)
      return sugerenciasInicio({
        ventasMes: this.ventasMes,
        comprasMes: this.comprasMes,
        todasVentas: this.todasVentas,
        papelesSubidos: this.papelesSubidos,
        diaDelMes: hoy.getDate(),
        seniatPendiente: this.seniatPendiente,
        aUSD: (inv) => this.sumarMontosUSD([inv]),
        descartadas,
      })
    },

    primerosPasosCompletos() {
      return this.primerosPasos.every((p) => p.hecho)
    },

    /**
     * La UNA cosa más importante ahora, en todo el sistema: plan vencido →
     * papel vencido o por vencer → datos del negocio incompletos → primer
     * registro. Null = todo en orden.
     */
    pasoGlobal() {
      const plan = this.pendientes.find((p) => p.id.startsWith('plan-'))
      if (plan && plan.color === 'error') {
        return { titulo: 'Paga tu plan para seguir usando AD System', detalle: `${plan.texto}. Reporta tu pago en un minuto y lo revisamos.`, boton: 'Pagar ahora', icono: 'mdi-credit-card-outline', ruta: plan.accionRuta }
      }
      const papel = this.pendientes.find((p) => p.id.startsWith('doc-'))
      if (papel) {
        return { titulo: `Atiende tu papel: ${papel.nombre}`, detalle: `${papel.texto}. Renovarlo a tiempo te evita multas.`, boton: 'Ver mis papeles', icono: 'mdi-file-document-alert-outline', ruta: papel.accionRuta }
      }
      if (plan) {
        return { titulo: 'Tu plan está por vencer', detalle: `${plan.texto}. Paga a tiempo para no perder acceso.`, boton: 'Pagar', icono: 'mdi-credit-card-outline', ruta: plan.accionRuta }
      }
      if (!this.perfilCompleto) {
        return { titulo: 'Completa los datos de tu negocio', detalle: 'Te toma 2 minutos y nos permite calcular bien tus retenciones y comprobantes.', boton: 'Completar ahora', icono: 'mdi-store-outline', ruta: '/cliente/mi-area' }
      }
      if (!this.hayCompras && !this.hayVentas) {
        return { titulo: 'Registra tu primer gasto con una foto', detalle: 'Tómale una foto a cualquier factura: leemos el monto, la fecha y el proveedor por ti.', boton: 'Registrar gasto', icono: 'mdi-camera-outline', registrar: 'COMPRA' }
      }
      return null
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

    /** Barato y sin bloquear: 3 consultas del mes que toca declarar; si falla, no se muestra nada. */
    async cargarSeniatPendiente() {
      try {
        const periodo = periodoPorDefecto()
        const datos = await cargarMesSeniat(periodo)
        if (!datos.cliente) return
        this.seniatPendiente = pendienteParaInicio({ ...datos, periodo })
      } catch (e) {
        console.warn('SENIAT del mes (Inicio):', e?.message || e)
      }
    },

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

        const [ventasRes, comprasRes, fiscalRes, billingRes, bcvRes, selloRes] = await Promise.allSettled([
          invoiceService.getInvoices({ flow: 'VENTA', clientId: currentUser.client_id }),
          invoiceService.getInvoices({ flow: 'COMPRA', clientId: currentUser.client_id }),
          fiscalService.getFiscalDocs({ trashed: false }),
          billingService.getInvoices(currentUser.client_id),
          tasasVigentes(),
          sealService.getSealConfig(currentUser.client_id),
        ])

        const todasVentas = ventasRes.status === 'fulfilled' ? (ventasRes.value || []) : []
        const todasCompras = comprasRes.status === 'fulfilled' ? (comprasRes.value || []) : []
        const docsFiscales = fiscalRes.status === 'fulfilled' ? (fiscalRes.value || []) : []
        const facturasSistema = (billingRes.status === 'fulfilled' && billingRes.value?.success)
          ? (billingRes.value.data || [])
          : []

        if (bcvRes.status === 'fulfilled' && bcvRes.value?.tasas) {
          this.tasasHoy = bcvRes.value.tasas
        }

        const { inicio, fin } = this.rangoMesActual()
        this.ventasMes = this.filtrarPorPeriodo(todasVentas, inicio, fin)
        this.comprasMes = this.filtrarPorPeriodo(todasCompras, inicio, fin)

        this.pendientes = this.construirPendientes(docsFiscales, facturasSistema)

        this.todasVentas = todasVentas
        this.papelesSubidos = docsFiscales.length
        try { this.sugerenciasOcultas = JSON.parse(localStorage.getItem(CLAVE_SUGERENCIAS_OCULTAS) || '{}') || {} } catch { this.sugerenciasOcultas = {} }
        this.hayVentas = todasVentas.length > 0
        this.hayCompras = todasCompras.length > 0
        this.tieneRif = docsFiscales.some((d) => d.doc_type === 'RIF' || (!d.doc_type && /\bRIF\b/i.test(d.name || '') && !/socios/i.test(d.name || '')))
        const sello = selloRes.status === 'fulfilled' ? selloRes.value : null
        this.tieneSelloOFirma = !!(sello?.sealUrl || sello?.signatureUrl)
        try { this.vioComoVoy = localStorage.getItem(CLAVE_VISTO_COMO_VOY) === '1' } catch { this.vioComoVoy = false }
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

    /** Suma montos en USD con la tasa de cada factura (y la vigente si le falta); sin tasa, no suma. */
    sumarMontosUSD(facturas) {
      return sumarFacturasEn(facturas, 'USD', this.tasasHoy).total
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
          nombre,
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

    ejecutarPasoGlobal() {
      const paso = this.pasoGlobal
      if (!paso) return
      if (paso.registrar) this.abrirRegistro(paso.registrar)
      else if (paso.ruta) this.$router.push(paso.ruta)
    },

    ejecutarSugerencia(sug) {
      if (sug.accion?.evento === 'registrar-venta') return this.abrirRegistro('VENTA')
      if (sug.accion?.evento === 'abrir-asistente') return window.dispatchEvent(new CustomEvent('ad-open-support-chat'))
      if (sug.accion?.ruta) this.$router.push(sug.accion.ruta)
    },

    ocultarSugerencia(sug) {
      this.sugerenciasOcultas = { ...this.sugerenciasOcultas, [sug.clave]: hoyISO() }
      try { localStorage.setItem(CLAVE_SUGERENCIAS_OCULTAS, JSON.stringify(this.sugerenciasOcultas)) } catch { /* sin almacenamiento: solo por esta visita */ }
    },

    irAPaso(paso) {
      const rutas = { perfil: '/cliente/mi-area', rif: '/cliente/fiscal-360', sello: '/cliente/mi-area', comovoy: '/cliente/dashboard' }
      if (paso.clave === 'gasto') return this.abrirRegistro('COMPRA')
      if (paso.clave === 'venta') return this.abrirRegistro('VENTA')
      if (rutas[paso.clave]) this.$router.push(rutas[paso.clave])
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
    this.cargarSeniatPendiente()
  },
}
</script>

<style scoped>
.cliente-inicio {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

@media (min-width: 960px) {
  .cliente-inicio { padding: 32px 32px 64px; }
}

.inicio-cabecera {
  margin-bottom: 20px;
}

.inicio-saludo {
  font-size: 1.9rem;
  font-weight: 700;
  margin: 0 0 6px;
  color: rgb(var(--v-theme-on-surface));
}

.inicio-frase-mes {
  font-size: 1.06rem;
  line-height: 1.5;
  margin: 0;
  max-width: 62ch;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.inicio-frase-bs {
  font-size: 0.85rem;
  margin: 4px 0 0;
}

/* Escritorio: columna principal + lateral con "Primeros pasos" */
.inicio-rejilla {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
}

@media (min-width: 1100px) {
  .inicio-rejilla { grid-template-columns: minmax(0, 1fr) 380px; gap: 28px; }
}

.inicio-subtitulo {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 10px;
  color: rgb(var(--v-theme-on-surface));
}

/* Tres acciones: apiladas en el teléfono, en fila en pantallas anchas */
.inicio-acciones {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

/* En fila solo en pantallas medianas: con la columna de "Primeros pasos" al lado
   (≥1100px) no caben tres tarjetas con texto legible, así que vuelven a apilarse. */
@media (min-width: 760px) and (max-width: 1099px) {
  .inicio-acciones { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.inicio-acciones > * {
  opacity: 0;
  animation: inicio-tarjeta-entrada 320ms var(--ad-move-curva-entrada) forwards;
}
.inicio-acciones > *:nth-child(2) { animation-delay: 70ms; }
.inicio-acciones > *:nth-child(3) { animation-delay: 140ms; }

@keyframes inicio-tarjeta-entrada {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Pendientes */
.inicio-pendiente {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.inicio-pendiente__icono {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.inicio-pendiente__icono--error { background: rgba(var(--v-theme-error), 0.1); color: rgb(var(--v-theme-error)); }
.inicio-pendiente__icono--warning { background: rgba(224, 161, 0, 0.14); color: #8a5f00; }

.inicio-pendiente__texto {
  flex: 1 1 auto;
  font-weight: 600;
  min-width: 0;
}

/* Logro al completar los primeros pasos (compacto: el espacio es para las sugerencias) */
.inicio-logro {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 18px;
  border-radius: 20px;
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  background: linear-gradient(0deg, rgba(var(--v-theme-success), 0.06), rgba(var(--v-theme-success), 0.06)), rgb(var(--v-theme-surface));
}

.inicio-logro__titulo {
  font-weight: 700;
  font-size: 1.05rem;
}

/* Sugerencias para ti */
.inicio-sugerencia {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
}

.inicio-sugerencia + .inicio-sugerencia {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.inicio-sugerencia__icono {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}

.inicio-sugerencia__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.inicio-sugerencia__titulo {
  font-weight: 700;
  line-height: 1.3;
}

.inicio-sugerencia__detalle {
  margin-top: 3px;
  font-size: 0.9rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.inicio-sugerencia__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

/* Al ocultar una sugerencia, se va con un fundido breve */
.sugerencia-leave-active {
  transition: opacity var(--ad-move-normal) var(--ad-move-curva-entrada), transform var(--ad-move-normal) var(--ad-move-curva-entrada);
}
.sugerencia-leave-to {
  opacity: 0;
  transform: translateX(12px);
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

@media (max-width: 599px) {
  .inicio-pendiente { flex-wrap: wrap; }
  .inicio-pendiente .v-btn { flex: 1 1 100%; margin-left: 54px; }
}

@media (prefers-reduced-motion: reduce) {
  .sugerencia-leave-active { transition: none; }
  .inicio-acciones > * { animation: none; opacity: 1; }
  .aviso-exito-animado :deep(.v-alert__prepend .v-icon) { animation: none; }
}
</style>
