<template>
  <div class="clientes">
    <!-- ═════════════ CARGANDO ═════════════ -->
    <template v-if="loading">
      <v-skeleton-loader type="heading, text" class="mb-6 bg-transparent" max-width="420" />
      <v-skeleton-loader type="image" height="110" class="rounded-xl mb-4" />
      <v-skeleton-loader type="list-item-avatar-two-line@6" class="rounded-xl" />
    </template>

    <!-- ═════════════ ERROR ═════════════ -->
    <template v-else-if="loadError">
      <EncabezadoPagina titulo="Mis clientes" subtitulo="A quién le vendes y quién te debe" />
      <EstadoVacio
        icono="mdi-wifi-off"
        titulo="No pudimos cargar tus clientes"
        mensaje="Revisa tu conexión e intenta de nuevo. No se perdió nada."
        texto-accion="Reintentar"
        @accion="loadData"
      />
    </template>

    <!-- ═════════════ CONTENIDO ═════════════ -->
    <template v-else>
      <EncabezadoPagina titulo="Mis clientes" subtitulo="A quién le vendes y quién te debe">
        <v-btn color="primary" size="large" prepend-icon="mdi-plus" class="text-none" data-testid="nuevo-cliente" @click="abrirNuevo">
          Nuevo cliente
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="large" aria-label="Más opciones" />
          </template>
          <v-list density="comfortable" min-width="220">
            <v-list-item prepend-icon="mdi-refresh" title="Actualizar" @click="loadData" />
            <v-list-item prepend-icon="mdi-file-excel-outline" title="Exportar a Excel" :disabled="exportando || !clientes.length" @click="exportarExcel" />
          </v-list>
        </v-menu>
      </EncabezadoPagina>

      <!-- RESUMEN + SIGUIENTE PASO -->
      <div class="clientes__panel">
        <section class="clientes__resumen" aria-label="Resumen de tus clientes">
          <p v-if="clientes.length" class="clientes__frase" data-testid="frase-resumen">
            Tienes {{ clientes.length }} cliente{{ clientes.length === 1 ? '' : 's' }}.
            <template v-if="deudores.length">
              <strong>Te deben {{ dinero(totalPorCobrar) }}</strong> entre {{ deudores.length }} cliente{{ deudores.length === 1 ? '' : 's' }}.
            </template>
            <template v-else>Nadie te debe nada ahora.</template>
          </p>
          <p v-if="sinTasaTotal" class="text-warning" data-testid="sin-tasa">
            {{ textoSinTasa(sinTasaTotal) }} (no entran en los totales).
            <router-link to="/cliente/mi-area#tasa">Revisar mi tasa</router-link>
          </p>
          <v-text-field
            v-model="busqueda"
            placeholder="Buscar por nombre o RIF"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            class="clientes__buscador"
          />
        </section>

        <PanelSiguientePaso
          :listo="!siguiente"
          :titulo="siguiente ? `Cobra a ${siguiente.nombre}` : ''"
          :detalle="siguiente ? detalleSiguiente : ''"
          :texto-boton="siguiente && telefonoValido(siguiente) ? 'Recordarle por WhatsApp' : 'Agregar teléfono'"
          :icono-boton="siguiente && telefonoValido(siguiente) ? 'mdi-whatsapp' : 'mdi-phone-plus-outline'"
          titulo-listo="¡Nadie te debe!"
          detalle-listo="Cuando le vendas a crédito, aquí verás a quién recordarle el pago."
          @accion="accionSiguiente"
        />
      </div>

      <!-- FILTROS -->
      <FiltroChips v-model="filtro" :opciones="opcionesFiltro" etiqueta="Filtrar clientes" class="mb-4" />

      <!-- ESTADO VACÍO -->
      <EstadoVacio
        v-if="filtrados.length === 0"
        :icono="hayFiltros ? 'mdi-filter-remove-outline' : 'mdi-account-group-outline'"
        :titulo="hayFiltros ? 'No hay resultados con estos filtros' : 'Todavía no tienes clientes'"
        :mensaje="hayFiltros
          ? 'Prueba con otra búsqueda o quita algún filtro.'
          : 'Se agregan solos cuando registras una venta con el nombre de tu cliente. También puedes agregarlos tú.'"
        :texto-accion="hayFiltros ? 'Limpiar filtros' : 'Agregar mi primer cliente'"
        @accion="hayFiltros ? limpiarFiltros() : abrirNuevo()"
      />

      <!-- LISTA -->
      <template v-else>
        <SeccionLista :meta="`${filtrados.length} cliente${filtrados.length === 1 ? '' : 's'}`">
          <div
            v-for="c in visibles"
            :key="c.id"
            class="fila-cliente"
            role="button"
            tabindex="0"
            :aria-label="`Ver a ${c.nombre}`"
            @click="abrirDetalle(c)"
            @keydown.enter.self="abrirDetalle(c)"
          >
            <span class="fila-cliente__icono" aria-hidden="true">{{ iniciales(c.nombre) }}</span>

            <div class="fila-cliente__texto">
              <div class="fila-cliente__nombre">{{ c.nombre }}</div>
              <div class="fila-cliente__rif">
                <span class="font-mono">{{ c.rif || 'Sin RIF' }}</span>
              </div>
              <div v-if="c.totales.porCobrar > 0" class="fila-cliente__chips">
                <v-chip size="small" variant="tonal" color="error">Te debe {{ dinero(c.totales.porCobrar) }}</v-chip>
              </div>
            </div>

            <div class="fila-cliente__derecha">
              <template v-if="c.totales.comprado90 > 0">
                <div class="fila-cliente__valor">{{ dinero(c.totales.comprado90) }}</div>
                <div class="fila-cliente__valor-secundario">comprado en 90 días</div>
              </template>
              <div v-else class="fila-cliente__valor-secundario">Sin compras en 90 días</div>
            </div>

            <div class="fila-cliente__acciones" @click.stop>
              <v-btn
                v-if="c.totales.porCobrar > 0"
                variant="tonal"
                color="primary"
                :prepend-icon="telefonoValido(c) ? 'mdi-whatsapp' : 'mdi-phone-plus-outline'"
                class="text-none fila-cliente__accion"
                @click="cobrar(c)"
              >
                {{ telefonoValido(c) ? 'Cobrar' : 'Agregar teléfono' }}
              </v-btn>
              <v-btn
                v-else
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-eye-outline"
                class="text-none fila-cliente__accion"
                @click="abrirDetalle(c)"
              >
                Ver
              </v-btn>
              <v-menu location="bottom end">
                <template #activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" aria-label="Más opciones" />
                </template>
                <v-list density="comfortable">
                  <v-list-item prepend-icon="mdi-pencil-outline" title="Editar" @click="abrirEditar(c)" />
                  <v-list-item v-if="telefonoValido(c)" prepend-icon="mdi-phone-outline" title="Llamar" :href="enlaceLlamada(c.telefono)" />
                  <v-list-item v-if="telefonoValido(c)" prepend-icon="mdi-whatsapp" title="WhatsApp" :href="enlaceWhatsApp(c.telefono)" target="_blank" rel="noopener" />
                  <v-list-item prepend-icon="mdi-delete-outline" base-color="error" title="Mandar a la papelera" @click="pedirPapelera(c)" />
                </v-list>
              </v-menu>
            </div>
          </div>
        </SeccionLista>

        <div v-if="filtrados.length > visibles.length" class="d-flex justify-center mt-4">
          <v-btn variant="tonal" color="secondary" size="large" class="text-none" @click="mostrar += 20">
            Ver más clientes
          </v-btn>
        </div>
      </template>
    </template>

    <!-- ═════════════ DETALLE ═════════════ -->
    <DialogoAdaptable v-model="detalleAbierto" :titulo="seleccionado?.nombre || 'Cliente'" icono="mdi-account-outline" max-width="640">
      <template v-if="cargandoDetalle">
        <v-skeleton-loader type="text, text, list-item-two-line@3" class="bg-transparent" />
      </template>
      <template v-else-if="detalle">
        <dl class="datos">
          <div><dt>RIF</dt><dd class="font-mono">{{ detalle.cliente.rif || 'Sin RIF' }}</dd></div>
          <div><dt>Teléfono</dt><dd>{{ detalle.cliente.telefono || 'Sin teléfono' }}</dd></div>
          <div v-if="detalle.cliente.correo"><dt>Correo</dt><dd>{{ detalle.cliente.correo }}</dd></div>
          <div v-if="detalle.cliente.direccion"><dt>Dirección</dt><dd>{{ detalle.cliente.direccion }}</dd></div>
        </dl>
        <v-chip v-if="detalle.cliente.es_contribuyente_especial" size="small" variant="tonal" color="secondary" class="mb-3">
          Te retiene IVA: pídele el comprobante
        </v-chip>

        <dl class="cifras" data-testid="cifras-cliente">
          <div><dt>Comprado este año</dt><dd>{{ dinero(detalle.totales.compradoAnio) }}</dd></div>
          <div><dt>Por cobrar</dt><dd :class="{ 'text-error': detalle.totales.porCobrar > 0 }">{{ dinero(detalle.totales.porCobrar) }}</dd></div>
          <div><dt>Última compra</dt><dd>{{ detalle.totales.ultimaCompra ? fecha(detalle.totales.ultimaCompra) : 'Aún no compra' }}</dd></div>
        </dl>

        <div v-if="detalle.totales.porCobrar > 0" class="mb-4">
          <v-btn color="primary" variant="tonal" class="text-none" :prepend-icon="telefonoValido(detalle.cliente) ? 'mdi-whatsapp' : 'mdi-phone-plus-outline'" @click="cobrar(detalle.cliente, detalle.totales)">
            {{ telefonoValido(detalle.cliente) ? 'Recordarle por WhatsApp' : 'Agregar teléfono' }}
          </v-btn>
        </div>

        <SeccionLista titulo="Sus ventas" :meta="`${detalle.ventas.length}`">
          <p v-if="!detalle.ventas.length" class="pa-4 mb-0 text-medium-emphasis">
            Todavía no le has vendido. Toca «Registrar venta a este cliente».
          </p>
          <router-link
            v-for="v in detalle.ventas"
            :key="v.id"
            :to="{ path: '/cliente/facturacion', query: { ver: v.id } }"
            class="fila-venta"
            @click="detalleAbierto = false"
          >
            <div class="fila-venta__texto">
              <div class="fila-venta__titulo">Venta {{ v.numero || 's/n' }}</div>
              <div class="fila-venta__sub">{{ fecha(v.fecha) }}</div>
            </div>
            <v-chip size="small" variant="tonal" :color="colorEstado(v.estado)">{{ nombreEstado(v.estado) }}</v-chip>
            <div class="fila-venta__monto">{{ dinero(v.monto, v.moneda) }}</div>
            <v-icon icon="mdi-chevron-right" size="20" aria-hidden="true" />
          </router-link>
        </SeccionLista>
      </template>

      <template #acciones>
        <v-btn variant="text" class="text-none" @click="detalleAbierto = false">Cerrar</v-btn>
        <v-btn v-if="detalle" variant="text" class="text-none" prepend-icon="mdi-pencil-outline" @click="abrirEditar(detalle.cliente)">Editar</v-btn>
        <v-btn v-if="detalle" color="primary" variant="flat" class="text-none" prepend-icon="mdi-cash-plus" data-testid="registrar-venta-cliente" @click="registrarVenta(detalle.cliente)">
          Registrar venta a este cliente
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- ═════════════ FORMULARIO ═════════════ -->
    <DialogoAdaptable
      v-model="formAbierto"
      :titulo="editandoId ? 'Editar cliente' : 'Nuevo cliente'"
      icono="mdi-account-plus-outline"
      max-width="560"
      persistent
      :cargando="guardando"
    >
      <v-form ref="formulario" @submit.prevent="guardar">
        <LlenarConDocumento v-if="!editandoId" :formulario="form" :mapear="aCliente" :forzar="['tipo_persona']" class="mb-4" />
        <v-btn-toggle v-model="form.tipo_persona" mandatory color="primary" variant="outlined" divided class="mb-4 w-100" aria-label="Tipo de cliente">
          <v-btn value="natural" class="text-none flex-grow-1" prepend-icon="mdi-account-outline">Persona</v-btn>
          <v-btn value="juridica" class="text-none flex-grow-1" prepend-icon="mdi-domain">Empresa</v-btn>
        </v-btn-toggle>
        <v-text-field
          v-model="form.nombre"
          :label="form.tipo_persona === 'juridica' ? 'Nombre de la empresa' : 'Nombre y apellido'"
          variant="outlined" density="comfortable" class="mb-2" autofocus
          :rules="[v => !!(v && v.trim()) || 'Escribe el nombre']"
        />
        <v-text-field
          v-model="form.rif"
          label="RIF o cédula (opcional)"
          placeholder="J-12345678-9"
          variant="outlined" density="comfortable" class="mb-2"
          :hint="avisoRif" persistent-hint
        />
        <v-text-field v-model="form.telefono" label="Teléfono (opcional)" placeholder="0414-1234567" type="tel" inputmode="tel" variant="outlined" density="comfortable" class="mb-2" hide-details="auto" />
        <v-text-field v-model="form.correo" label="Correo (opcional)" type="email" variant="outlined" density="comfortable" class="mb-2" hide-details="auto" />
        <v-text-field v-model="form.direccion" label="Dirección (opcional)" variant="outlined" density="comfortable" class="mb-2" hide-details="auto" />
        <v-switch v-model="form.es_contribuyente_especial" color="primary" hide-details label="Este cliente me retiene IVA" density="comfortable" />
        <v-textarea v-model="form.notas" label="Notas (opcional)" rows="2" auto-grow variant="outlined" density="comfortable" hide-details class="mt-2" />
      </v-form>
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="guardando" data-testid="cancelar-cliente" @click="formAbierto = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" class="text-none" :loading="guardando" @click="guardar">Guardar</v-btn>
      </template>
    </DialogoAdaptable>

    <!-- ═════════════ PAPELERA ═════════════ -->
    <DialogoAdaptable v-model="papeleraAbierta" titulo="¿Mandar a la papelera?" icono="mdi-alert-circle-outline" max-width="460" persistent :cargando="eliminando">
      <p class="mb-2">
        <strong>{{ aEliminar?.nombre }}</strong> dejará de aparecer en tu lista. Sus ventas se conservan tal como están.
      </p>
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="eliminando" @click="papeleraAbierta = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" class="text-none" :loading="eliminando" @click="ejecutarPapelera">Mandar a la papelera</v-btn>
      </template>
    </DialogoAdaptable>
  </div>
</template>

<script>
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import LlenarConDocumento from '@/components/ui/LlenarConDocumento.vue'
import { aCliente } from '@/services/documentoIaService.js'
import clientesNegocioService, { esFrecuente, sinDatosFiscales, diasDesde } from '@/services/clientesNegocioService.js'
import { tasasVigentes } from '@/services/tasaService.js'
import { textoSinTasa } from '@/utils/monedas.js'
import { normalizarRif } from '@/utils/rif.js'
import { formatMoney } from '@/utils/formatMoney.js'
import { formatFechaCorta } from '@/utils/fechas.js'
import { normalizarTelefonoVE, enlaceWhatsApp, enlaceLlamada, mensajeCobroWhatsApp } from '@/utils/telefono.js'

const FORM_VACIO = () => ({
  tipo_persona: 'natural', nombre: '', rif: '', telefono: '', correo: '', direccion: '',
  es_contribuyente_especial: false, notas: ''
})

export default {
  name: 'ClientesView',
  components: { EncabezadoPagina, EstadoVacio, DialogoAdaptable, PanelSiguientePaso, FiltroChips, SeccionLista, LlenarConDocumento },
  data() {
    return {
      loading: true,
      loadError: false,
      exportando: false,
      clientes: [],
      tasa: 0,
      tasas: {},
      busqueda: '',
      filtro: 'TODOS',
      mostrar: 20,

      detalleAbierto: false,
      cargandoDetalle: false,
      seleccionado: null,
      detalle: null,

      formAbierto: false,
      guardando: false,
      editandoId: null,
      form: FORM_VACIO(),

      papeleraAbierta: false,
      eliminando: false,
      aEliminar: null
    }
  },
  computed: {
    sinTasaTotal() { return this.clientes.reduce((a, c) => a + (c.totales.sinTasa || 0), 0) },
    deudores() { return this.clientes.filter((c) => c.totales.porCobrar > 0) },
    totalPorCobrar() { return this.deudores.reduce((a, c) => a + c.totales.porCobrar, 0) },
    // El que lleva más tiempo debiendo es a quien conviene cobrarle primero.
    siguiente() {
      return [...this.deudores].sort((a, b) => (a.totales.deudaDesde || '').localeCompare(b.totales.deudaDesde || ''))[0] || null
    },
    detalleSiguiente() {
      const c = this.siguiente
      if (!c) return ''
      const dias = diasDesde(c.totales.deudaDesde)
      const desde = dias > 0 ? ` desde hace ${dias} día${dias === 1 ? '' : 's'}` : ' desde hoy'
      return `${c.nombre} te debe ${this.dinero(c.totales.porCobrar)}${desde}.`
    },
    opcionesFiltro() {
      const n = (f) => this.clientes.filter((c) => this.cumple(c, f)).length
      return [
        { valor: 'TODOS', texto: 'Todos', cantidad: this.clientes.length },
        { valor: 'DEBEN', texto: 'Me deben', cantidad: n('DEBEN'), deshabilitado: n('DEBEN') === 0 },
        { valor: 'FRECUENTES', texto: 'Frecuentes', cantidad: n('FRECUENTES'), deshabilitado: n('FRECUENTES') === 0 },
        { valor: 'SIN_FISCAL', texto: 'Sin datos fiscales', cantidad: n('SIN_FISCAL'), deshabilitado: n('SIN_FISCAL') === 0 }
      ]
    },
    hayFiltros() { return !!(this.busqueda && this.busqueda.trim()) || this.filtro !== 'TODOS' },
    filtrados() {
      const t = (this.busqueda || '').trim().toLowerCase()
      const soloRif = t.replace(/[^a-z0-9]/g, '')
      return this.clientes
        .filter((c) => this.cumple(c, this.filtro))
        .filter((c) => !t
          || c.nombre.toLowerCase().includes(t)
          || (soloRif.length >= 3 && String(c.rif || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(soloRif)))
    },
    visibles() { return this.filtrados.slice(0, this.mostrar) },
    avisoRif() {
      return this.form.rif && !normalizarRif(this.form.rif) ? 'Revisa el RIF. Ejemplo: J-12345678-9' : ''
    }
  },
  watch: {
    busqueda() { this.mostrar = 20 },
    filtro() { this.mostrar = 20 }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    enlaceWhatsApp,
    enlaceLlamada,
    dinero(monto, moneda = 'USD') { return formatMoney(monto || 0, moneda) },
    fecha(v) { return formatFechaCorta(v) },
    telefonoValido(c) { return !!normalizarTelefonoVE(c?.telefono) },
    iniciales(nombre) {
      const p = String(nombre || '?').trim().split(/\s+/)
      return ((p[0]?.[0] || '?') + (p.length > 1 ? p[1][0] : '')).toUpperCase()
    },
    cumple(c, f) {
      if (f === 'DEBEN') return c.totales.porCobrar > 0
      if (f === 'FRECUENTES') return esFrecuente(c.totales)
      if (f === 'SIN_FISCAL') return sinDatosFiscales(c)
      return true
    },
    nombreEstado(s) {
      return { PAGADA: 'Pagada', 'CRÉDITO': 'A crédito', VENCIDA: 'Vencida', ANULADA: 'Anulada', BORRADOR: 'Borrador' }[s] || s || ''
    },
    colorEstado(s) {
      return { PAGADA: 'success', 'CRÉDITO': 'warning', VENCIDA: 'error' }[s] || 'secondary'
    },
    limpiarFiltros() { this.busqueda = ''; this.filtro = 'TODOS' },

    async cargarTasa() {
      try {
        const v = await tasasVigentes()
        this.tasas = v.tasas || {}
        this.tasa = Number(v.tasas?.USD) || 0
      } catch { this.tasas = {}; this.tasa = 0 }
    },
    textoSinTasa,
    async loadData() {
      this.loading = true
      this.loadError = false
      try {
        if (!this.tasa) await this.cargarTasa()
        this.clientes = await clientesNegocioService.listar({ tasas: this.tasas })
      } catch (e) {
        console.error('Error cargando clientes:', e)
        this.loadError = true
      } finally {
        this.loading = false
      }
    },

    // ── Cobrar (solo abre WhatsApp; no envía nada) ──
    cobrar(c, totales = null) {
      const t = totales || c.totales
      if (!this.telefonoValido(c)) { this.abrirEditar(c); return }
      const texto = mensajeCobroWhatsApp({ nombre: c.nombre, monto: this.dinero(t?.porCobrar) })
      window.open(enlaceWhatsApp(c.telefono, texto), '_blank', 'noopener')
    },
    accionSiguiente() {
      if (this.siguiente) this.cobrar(this.siguiente)
    },

    // ── Detalle ──
    async abrirDetalle(c) {
      this.seleccionado = c
      this.detalle = null
      this.detalleAbierto = true
      this.cargandoDetalle = true
      try {
        this.detalle = await clientesNegocioService.obtener(c.id, { tasas: this.tasas })
        if (!this.detalle) this.detalleAbierto = false
      } catch (e) {
        console.error('Error cargando el cliente:', e)
        this.$root?.showSnackbar?.('No pudimos abrir al cliente. Intenta de nuevo.', 'error')
        this.detalleAbierto = false
      } finally {
        this.cargandoDetalle = false
      }
    },
    registrarVenta(c) {
      this.detalleAbierto = false
      this.$router.push({ path: '/cliente/facturacion', query: { cliente: c.id } })
    },

    aCliente,
    // ── Crear / editar ──
    abrirNuevo() {
      this.editandoId = null
      this.form = FORM_VACIO()
      this.formAbierto = true
    },
    abrirEditar(c) {
      this.detalleAbierto = false
      this.editandoId = c.id
      this.form = {
        tipo_persona: c.tipo_persona || 'natural', nombre: c.nombre || '', rif: c.rif || '',
        telefono: c.telefono || '', correo: c.correo || '', direccion: c.direccion || '',
        es_contribuyente_especial: !!c.es_contribuyente_especial, notas: c.notas || ''
      }
      this.formAbierto = true
    },
    async guardar() {
      const { valid } = (await this.$refs.formulario?.validate()) || { valid: true }
      if (!valid) return
      this.guardando = true
      try {
        const res = this.editandoId
          ? await clientesNegocioService.actualizar(this.editandoId, this.form)
          : await clientesNegocioService.crear(this.form)
        if (res.success) {
          this.formAbierto = false
          this.$root?.showSnackbar?.('Cliente guardado', 'success')
          await this.loadData()
        } else {
          this.$root?.showSnackbar?.(res.error || 'No se pudo guardar el cliente', 'error')
        }
      } finally {
        this.guardando = false
      }
    },

    // ── Papelera ──
    pedirPapelera(c) { this.aEliminar = c; this.papeleraAbierta = true },
    async ejecutarPapelera() {
      if (!this.aEliminar) return
      this.eliminando = true
      try {
        const res = await clientesNegocioService.papelera(this.aEliminar.id)
        if (res.success) {
          this.papeleraAbierta = false
          this.$root?.showSnackbar?.('Cliente enviado a la papelera', 'success')
          await this.loadData()
        } else {
          this.$root?.showSnackbar?.(res.error || 'No se pudo mandar a la papelera', 'error')
        }
      } finally {
        this.eliminando = false
      }
    },

    // ── Exportar ──
    async exportarExcel() {
      this.exportando = true
      try {
        const ExcelJS = await import('exceljs')
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('Mis clientes')
        ws.columns = [
          { header: 'Nombre', key: 'nombre', width: 34 },
          { header: 'RIF', key: 'rif', width: 18 },
          { header: 'Teléfono', key: 'telefono', width: 18 },
          { header: 'Correo', key: 'correo', width: 28 },
          { header: 'Comprado 90 días (USD)', key: 'c90', width: 24 },
          { header: 'Comprado este año (USD)', key: 'anio', width: 24 },
          { header: 'Te debe (USD)', key: 'debe', width: 16 }
        ]
        ws.getRow(1).font = { bold: true }
        this.filtrados.forEach((c) => ws.addRow({
          nombre: c.nombre, rif: c.rif || '', telefono: c.telefono || '', correo: c.correo || '',
          c90: Number(c.totales.comprado90.toFixed(2)), anio: Number(c.totales.compradoAnio.toFixed(2)),
          debe: Number(c.totales.porCobrar.toFixed(2))
        }))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Mis_clientes_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error('Error exportando clientes:', e)
        this.$root?.showSnackbar?.('No se pudo exportar la lista', 'error')
      } finally {
        this.exportando = false
      }
    }
  }
}
</script>

<style scoped>
.clientes {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}
@media (min-width: 960px) {
  .clientes { padding: 32px 32px 64px; }
}

/* ── Resumen + siguiente paso ── */
.clientes__panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 8px 0 24px;
}
@media (min-width: 960px) {
  .clientes__panel { grid-template-columns: 7fr 5fr; }
}
.clientes__resumen {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 20px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
}
@media (max-width: 599px) {
  .clientes__resumen { padding: 18px; }
}
.clientes__frase {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
}
.clientes__frase strong { font-weight: 700; }
.clientes__buscador { max-width: 420px; flex: 0 0 auto; }

/* ── Fila de cliente ── */
.fila-cliente {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  min-height: 72px;
  cursor: pointer;
  transition: background-color var(--ad-move-rapido) var(--ad-move-curva-entrada);
}
.fila-cliente:hover { background: rgba(var(--v-theme-on-surface), 0.035); }
.fila-cliente:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
.fila-cliente__icono {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 700;
  font-size: 0.95rem;
  background: rgba(var(--v-theme-secondary), 0.1);
  color: rgb(var(--v-theme-secondary));
}
.fila-cliente__texto { flex: 1 1 auto; min-width: 0; }
.fila-cliente__nombre {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fila-cliente__rif {
  margin-top: 2px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.fila-cliente__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.fila-cliente__derecha { flex: 0 0 auto; text-align: right; }
.fila-cliente__valor { font-size: 0.9375rem; font-weight: 700; white-space: nowrap; }
.fila-cliente__valor-secundario { font-size: 0.8125rem; color: rgba(var(--v-theme-on-surface), 0.65); white-space: nowrap; }
.fila-cliente__acciones { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.fila-cliente__accion { min-width: 96px; }
.font-mono { font-family: monospace; }

@media (max-width: 599px) {
  .fila-cliente { flex-wrap: wrap; row-gap: 10px; }
  .fila-cliente__texto { flex: 1 1 calc(100% - 58px); }
  .fila-cliente__derecha { flex: 1 1 100%; padding-left: 58px; text-align: left; }
  .fila-cliente__acciones { flex: 1 1 100%; padding-left: 58px; }
  .fila-cliente__acciones > .v-btn:first-child { flex: 1 1 auto; }
}

/* ── Detalle ── */
.datos { margin: 0 0 12px; display: grid; gap: 8px; }
.datos > div { display: flex; gap: 12px; }
.datos dt { flex: 0 0 96px; color: rgba(var(--v-theme-on-surface), 0.65); font-size: 0.9375rem; }
.datos dd { margin: 0; font-size: 1rem; font-weight: 500; min-width: 0; overflow-wrap: anywhere; }
.cifras {
  margin: 0 0 16px;
  padding: 14px 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.cifras dt { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), 0.65); }
.cifras dd { margin: 2px 0 0; font-size: 1.125rem; font-weight: 700; }
@media (max-width: 599px) {
  .cifras { grid-template-columns: 1fr; gap: 8px; }
  .cifras > div { display: flex; justify-content: space-between; align-items: baseline; }
}
.fila-venta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-height: 60px;
  color: inherit;
  text-decoration: none;
}
.fila-venta:hover { background: rgba(var(--v-theme-on-surface), 0.035); }
.fila-venta:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
.fila-venta__texto { flex: 1 1 auto; min-width: 0; }
.fila-venta__titulo { font-weight: 600; }
.fila-venta__sub { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), 0.65); }
.fila-venta__monto { font-weight: 700; white-space: nowrap; }
.fila-venta .v-chip { flex-shrink: 0; }

@media (prefers-reduced-motion: reduce) {
  .fila-cliente { transition: none; }
}
</style>
