<template>
  <div class="seniat">
    <EncabezadoPagina titulo="SENIAT del mes" subtitulo="Los archivos que pide el portal del SENIAT, revisados.">
      <v-btn variant="text" size="large" class="text-none" prepend-icon="mdi-book-open-page-variant-outline" to="/ayuda/seniat-retenciones">
        Guía
      </v-btn>
    </EncabezadoPagina>

    <FiltroChips v-model="periodo" :opciones="opcionesMes" etiqueta="Elegir mes" class="seniat__meses" />

    <!-- CARGANDO -->
    <template v-if="cargando">
      <v-skeleton-loader type="article" class="rounded-xl mb-4 bg-transparent" />
      <v-skeleton-loader type="article" class="rounded-xl bg-transparent" />
    </template>

    <!-- ERROR -->
    <AvisoAmable
      v-else-if="error"
      tipo="error"
      :mensaje="error"
      texto-accion="Reintentar"
      @accion="cargar"
    />

    <!-- CONTENIDO -->
    <template v-else>
      <AvisoAmable
        v-if="datos.cliente && !datos.cliente.es_contribuyente_especial"
        tipo="info"
        class="mb-4"
        data-testid="nota-no-especial"
        mensaje="Solo los contribuyentes especiales retienen IVA. ¿Lo eres? Cámbialo en Mi negocio."
        texto-accion="Ir a Mi negocio"
        @accion="$router.push({ name: 'ClienteMiArea' })"
      />

      <div class="seniat__rejilla">
        <TarjetaObligacion
          v-for="t in tarjetas"
          :key="t.clave"
          :clave="t.clave"
          :titulo="t.titulo"
          :subtitulo="t.subtitulo"
          :resumen="resumenDe(t)"
          :estado="t.estado"
          :problemas="t.problemas.length"
          :accion-principal="accionPrincipal(t)"
          :secundarias="secundariasDe(t)"
          :cargando="ocupado === t.clave"
          @principal="alPrincipal(t)"
          @secundaria="(c) => alSecundaria(t, c)"
        />

        <TarjetaObligacion
          v-for="l in tarjetasLibros"
          :key="l.clave"
          :clave="l.clave"
          :titulo="l.titulo"
          :subtitulo="l.subtitulo"
          :resumen="l.resumen"
          :estado="l.estado"
          :accion-principal="l.lineas ? { texto: 'Descargar libro (Excel)', icono: 'mdi-file-excel-outline' } : null"
          :cargando="ocupado === l.clave"
          @principal="descargarLibro(l)"
        />
      </div>
    </template>

    <RevisionProblemas
      v-model="revisionAbierta"
      :titulo="tarjetaRevision ? `Revisión · ${tarjetaRevision.titulo}` : 'Revisión'"
      :problemas="tarjetaRevision ? tarjetaRevision.problemas : []"
      :normalizaciones="tarjetaRevision ? tarjetaRevision.normalizaciones : []"
      :texto-excluidas="tarjetaRevision ? textoExcluidas(tarjetaRevision.excluidas) : ''"
      @descargar-igual="descargarIgual"
    />

    <HojaComoSubirlo
      v-model="hojaAbierta"
      :tipo="tarjetaHoja ? tarjetaHoja.tipo : 'IVA'"
      :puede-declarar="tarjetaHoja ? tarjetaHoja.estado !== 'declarada' : true"
      :planilla-inicial="tarjetaHoja?.declaracion?.numero_planilla || ''"
      :cargando="ocupado === 'declarar'"
      @declarar="declarar"
    />
  </div>
</template>

<script>
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import TarjetaObligacion from '@/components/seniat/TarjetaObligacion.vue'
import RevisionProblemas from '@/components/seniat/RevisionProblemas.vue'
import HojaComoSubirlo from '@/components/seniat/HojaComoSubirlo.vue'
import {
  resolverNegocio, cargarMes, cargarDeclaraciones, guardarDeclaracion, cargarFacturasParaLibros, exportarLibro, totalRegistro, mensajeParaContador,
} from '@/services/seniatService.js'
import { periodoPorDefecto, periodosRecientes, nombrePeriodo } from '@/utils/seniat/periodos.js'
import { armarTarjetas, buscarDeclaracion } from '@/utils/seniat/tarjetas.js'
import { textoExcluidas } from '@/utils/seniat/validacionRetenciones.js'
import { estadoTarjeta } from '@/utils/seniat/estadoTarjeta.js'
import { registrosDelLibro } from '@/utils/seniat/libros.js'
import { construirTxtIva, nombreArchivoTxtIva } from '@/utils/seniat/txtIva.js'
import { construirXmlIslr, nombreArchivoXmlIslr } from '@/utils/seniat/xmlIslr.js'
import { archivoDeTexto, descargarArchivo, puedeCompartir, compartirArchivo, copiarTexto } from '@/utils/seniat/descarga.js'
import { formatMoney } from '@/utils/formatMoney.js'

/**
 * SeniatDelMes — una lista de tareas por período: qué toca entregar, si está bien y si ya se hizo.
 * Spec: docs/mvp/diseno/seniat-del-mes.md. La lógica vive en src/utils/seniat (pura y con pruebas).
 */
export default {
  name: 'SeniatDelMes',
  components: { EncabezadoPagina, FiltroChips, AvisoAmable, TarjetaObligacion, RevisionProblemas, HojaComoSubirlo },

  data() {
    return {
      periodo: periodoPorDefecto(),
      cargando: true,
      error: '',
      datos: { clientId: null, organizationId: null, cliente: null, retenciones: [], declaraciones: [] },
      facturas: [],
      ocupado: '',
      claveRevision: '',
      revisionAbierta: false,
      claveHoja: '',
      hojaAbierta: false,
    }
  },

  computed: {
    opcionesMes() {
      const anioActual = new Date().getFullYear()
      return periodosRecientes(new Date(), 6).map((p) => ({
        valor: p,
        texto: Number(p.slice(0, 4)) === anioActual ? nombrePeriodo(p, { corto: true }) : nombrePeriodo(p),
      }))
    },

    tarjetas() {
      if (!this.datos.cliente) return []
      return armarTarjetas({
        cliente: this.datos.cliente,
        retenciones: this.datos.retenciones,
        declaraciones: this.datos.declaraciones,
        periodo: this.periodo,
      })
    },

    tarjetasLibros() {
      return [
        { flow: 'COMPRA', tipo: 'LIBRO_COMPRAS', clave: 'libro-compras', titulo: 'Libro de compras' },
        { flow: 'VENTA', tipo: 'LIBRO_VENTAS', clave: 'libro-ventas', titulo: 'Libro de ventas' },
      ].map((l) => {
        const registros = registrosDelLibro(this.facturas, l.flow, this.periodo)
        const total = Math.round(registros.reduce((t, r) => t + totalRegistro(r), 0) * 100) / 100
        const declaracion = buscarDeclaracion(this.datos.declaraciones, l.tipo, this.periodo, null)
        return {
          ...l,
          subtitulo: nombrePeriodo(this.periodo),
          lineas: registros.length,
          total,
          resumen: registros.length ? `${registros.length} ${registros.length === 1 ? 'factura' : 'facturas'} · ${formatMoney(total, 'VES')}` : '',
          estado: estadoTarjeta({ lineas: registros.length, montoTotal: total, declaracion }),
        }
      })
    },

    tarjetaRevision() {
      return this.tarjetas.find((t) => t.clave === this.claveRevision) || null
    },
    tarjetaHoja() {
      return this.tarjetas.find((t) => t.clave === this.claveHoja) || null
    },
  },

  watch: {
    periodo() {
      this.cargar()
    },
  },

  mounted() {
    this.cargar()
    this.cargarLibros()
  },

  methods: {
    textoExcluidas,

    avisar(mensaje, color = 'info') {
      this.$root?.showSnackbar?.(mensaje, color)
    },

    async cargar() {
      this.cargando = true
      this.error = ''
      try {
        this.datos = await cargarMes(this.periodo)
        if (!this.datos.cliente) this.error = 'No pudimos identificar tu negocio. Vuelve a iniciar sesión.'
      } catch (e) {
        console.error('SENIAT del mes:', e)
        this.error = 'No pudimos cargar tus retenciones. Revisa tu conexión e inténtalo otra vez.'
      } finally {
        this.cargando = false
      }
    },

    /** Facturas para los libros: una sola vez, sin frenar las tarjetas de retenciones. */
    async cargarLibros() {
      try {
        const { clientId } = await resolverNegocio()
        if (clientId) this.facturas = await cargarFacturasParaLibros(clientId)
      } catch (e) {
        console.warn('SENIAT del mes (libros):', e?.message || e)
      }
    },

    async recargarDeclaraciones() {
      try {
        this.datos = { ...this.datos, declaraciones: await cargarDeclaraciones({ clientId: this.datos.clientId, periodo: this.periodo }) }
      } catch (e) {
        console.warn(e)
      }
    },

    resumenDe(t) {
      if (!t.lineas) return ''
      const cosa = t.tipo === 'IVA' ? (t.lineas === 1 ? 'comprobante' : 'comprobantes') : (t.lineas === 1 ? 'retención' : 'retenciones')
      return `${t.lineas} ${cosa} · ${formatMoney(t.montoTotal, 'VES')}`
    },

    textoArchivo(t) {
      return t.tipo === 'IVA' ? 'TXT' : 'XML'
    },

    /** Siempre el siguiente paso; nada si ya está declarada o no hay nada. */
    accionPrincipal(t) {
      switch (t.estado) {
        case 'faltan_datos': return { texto: 'Revisar y arreglar', icono: 'mdi-clipboard-check-outline' }
        case 'lista':
        case 'cambios': return { texto: `Descargar archivo ${this.textoArchivo(t)}`, icono: 'mdi-download' }
        case 'descargada': return { texto: 'Ya lo subí', icono: 'mdi-check-decagram' }
        default: return null
      }
    },

    secundariasDe(t) {
      switch (t.estado) {
        case 'lista':
        case 'cambios':
          return [
            { clave: 'contador', texto: 'Enviar a mi contador' },
            { clave: 'como', texto: '¿Cómo lo subo?' },
            { clave: 'declarada', texto: 'Ya lo declaré' },
          ]
        case 'descargada':
          return [
            { clave: 'descargar', texto: 'Descargar de nuevo' },
            { clave: 'contador', texto: 'Enviar a mi contador' },
            { clave: 'como', texto: '¿Cómo lo subo?' },
          ]
        case 'declarada':
          return [
            { clave: 'descargar', texto: 'Descargar de nuevo' },
            { clave: 'contador', texto: 'Enviar a mi contador' },
          ]
        default:
          return []
      }
    },

    alPrincipal(t) {
      if (t.estado === 'faltan_datos') return this.abrirRevision(t)
      if (t.estado === 'descargada') return this.abrirHoja(t)
      return this.descargar(t)
    },

    alSecundaria(t, clave) {
      if (clave === 'contador') return this.enviarAlContador(t)
      if (clave === 'como' || clave === 'declarada') return this.abrirHoja(t)
      if (clave === 'descargar') return this.descargar(t, { forzar: true, sinHoja: true })
      return undefined
    },

    abrirRevision(t) {
      this.claveRevision = t.clave
      this.revisionAbierta = true
    },
    abrirHoja(t) {
      this.claveHoja = t.clave
      this.hojaAbierta = true
    },

    /** Genera el archivo de una tarjeta con las retenciones que entran en ese período. */
    generarArchivo(t) {
      const cliente = this.datos.cliente
      if (t.tipo === 'IVA') {
        return archivoDeTexto({
          nombre: nombreArchivoTxtIva(cliente.rif, this.periodo, t.quincena),
          texto: construirTxtIva({ cliente, retenciones: t.incluidas }),
        })
      }
      return archivoDeTexto({
        nombre: nombreArchivoXmlIslr(cliente.rif, this.periodo),
        texto: construirXmlIslr({ cliente, periodo: this.periodo, retenciones: t.incluidas }),
        latin1: true,
      })
    },

    /** Anota en declaraciones_seniat. Un fallo aquí no debe perder el archivo que ya se bajó. */
    async registrar(t, estado, numeroPlanilla = null) {
      try {
        await guardarDeclaracion({
          clientId: this.datos.clientId,
          organizationId: this.datos.organizationId,
          tipo: t.tipo,
          periodo: this.periodo,
          quincena: t.quincena ?? null,
          estado,
          lineas: t.lineas,
          montoTotal: t.montoTotal,
          numeroPlanilla,
        })
        await this.recargarDeclaraciones()
      } catch (e) {
        console.warn('No se pudo guardar el estado:', e)
        this.avisar('El archivo se descargó, pero no pudimos guardar el estado.', 'warning')
      }
    },

    async descargar(t, { forzar = false, sinHoja = false } = {}) {
      if (t.problemas.length && !forzar) {
        this.abrirRevision(t)
        return
      }
      this.ocupado = t.clave
      try {
        descargarArchivo(this.generarArchivo(t))
        // Si ya estaba declarada y nada cambió, descargar otra vez no la "desdeclara".
        if (t.estado !== 'declarada') await this.registrar(t, 'descargada')
        if (!sinHoja) this.abrirHoja(t)
      } catch (e) {
        console.error(e)
        this.avisar('No pudimos preparar el archivo. Inténtalo otra vez.', 'error')
      } finally {
        this.ocupado = ''
      }
    },

    async descargarIgual() {
      const t = this.tarjetaRevision
      this.revisionAbierta = false
      if (t) await this.descargar(t, { forzar: true })
    },

    async enviarAlContador(t) {
      if (t.problemas.length) {
        this.abrirRevision(t)
        return
      }
      this.ocupado = t.clave
      try {
        const archivo = this.generarArchivo(t)
        const texto = mensajeParaContador({ tipo: t.tipo, periodo: this.periodo, quincena: t.quincena, cliente: this.datos.cliente, nombreArchivo: archivo.nombre })
        if (puedeCompartir(archivo)) {
          const enviado = await compartirArchivo(archivo, { titulo: `${t.titulo} · ${nombrePeriodo(this.periodo)}`, texto })
          if (enviado && t.estado !== 'declarada') await this.registrar(t, 'descargada')
        } else {
          descargarArchivo(archivo)
          const copiado = await copiarTexto(texto)
          if (t.estado !== 'declarada') await this.registrar(t, 'descargada')
          this.avisar(copiado ? 'Bajamos el archivo y copiamos un mensaje para que lo pegues.' : 'Bajamos el archivo. Adjúntalo en tu mensaje.', 'success')
        }
      } catch (e) {
        console.error(e)
        this.avisar('No pudimos enviar el archivo. Inténtalo otra vez.', 'error')
      } finally {
        this.ocupado = ''
      }
    },

    async declarar(numeroPlanilla) {
      const t = this.tarjetaHoja
      if (!t) return
      this.ocupado = 'declarar'
      try {
        await guardarDeclaracion({
          clientId: this.datos.clientId,
          organizationId: this.datos.organizationId,
          tipo: t.tipo,
          periodo: this.periodo,
          quincena: t.quincena ?? null,
          estado: 'declarada',
          lineas: t.lineas,
          montoTotal: t.montoTotal,
          numeroPlanilla,
        })
        await this.recargarDeclaraciones()
        this.hojaAbierta = false
        this.avisar('Listo, la marcamos como declarada.', 'success')
      } catch (e) {
        console.error(e)
        this.avisar('No pudimos guardar que ya lo subiste. Inténtalo otra vez.', 'error')
      } finally {
        this.ocupado = ''
      }
    },

    async descargarLibro(l) {
      this.ocupado = l.clave
      try {
        const n = await exportarLibro({ facturas: this.facturas, flow: l.flow, periodo: this.periodo, cliente: this.datos.cliente })
        if (!n) {
          this.avisar('No hay facturas fiscales en este mes.', 'warning')
          return
        }
        await guardarDeclaracion({
          clientId: this.datos.clientId,
          organizationId: this.datos.organizationId,
          tipo: l.tipo,
          periodo: this.periodo,
          quincena: null,
          estado: 'descargada',
          lineas: l.lineas,
          montoTotal: l.total,
        }).then(() => this.recargarDeclaraciones()).catch((e) => console.warn(e))
      } catch (e) {
        console.error(e)
        this.avisar('No pudimos preparar el libro. Inténtalo otra vez.', 'error')
      } finally {
        this.ocupado = ''
      }
    },
  },
}
</script>

<style scoped>
.seniat {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}
@media (min-width: 960px) {
  .seniat { padding: 32px 32px 64px; }
}
.seniat__meses { margin: 4px 0 20px; }
.seniat__rejilla {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 960px) {
  .seniat__rejilla { grid-template-columns: 1fr 1fr; }
}
</style>
