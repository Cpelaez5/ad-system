<template>
  <div class="inicio-sa">
    <EncabezadoPagina titulo="Dashboard" subtitulo="Cómo va AD System hoy y qué te toca revisar." />

    <p v-if="!cargando" class="inicio-sa__frase" data-testid="frase">{{ frase }}</p>
    <v-skeleton-loader v-else type="text" class="mb-4" />

    <PanelSiguientePaso
      class="mb-6"
      :cargando="cargando"
      :listo="!cargando && !siguiente"
      :titulo="siguiente ? siguiente.titulo : ''"
      :detalle="siguiente ? siguiente.detalle : ''"
      :texto-boton="siguiente ? siguiente.boton : 'Abrir'"
      titulo-listo="Todo en orden"
      detalle-listo="No hay pagos por aprobar, ni pruebas por vencer, ni errores de IA, tasas o catálogo pendientes."
      @accion="ir(siguiente.to)"
    />

    <AvisoAmable v-if="error" tipo="advertencia" class="mb-4" :mensaje="error" texto-accion="Reintentar" data-testid="error" @accion="cargar" />

    <SeccionLista titulo="Las cifras" icono="mdi-chart-box-outline" class="mb-6">
      <CifrasEnLinea :cifras="cifras" :cargando="cargando" data-testid="cifras" />
    </SeccionLista>

    <SeccionLista titulo="Mes a mes" icono="mdi-chart-bar" class="mb-6">
      <div class="grafico">
        <FiltroChips v-model="serieElegida" :opciones="opcionesSerie" etiqueta="Qué mostrar en el gráfico" class="mb-3" />
        <GraficoBarras
          :labels="series.etiquetas"
          :series="[{ nombre: serieElegida === 'ingresos' ? 'Ingresos' : 'Empresas nuevas', datos: serieElegida === 'ingresos' ? series.ingresos : series.altas, color: colorSerie }]"
          :formato="serieElegida === 'ingresos' ? 'moneda' : 'entero'"
          :altura="220"
        />
      </div>
    </SeccionLista>

    <SeccionLista titulo="Ir a" icono="mdi-compass-outline">
      <FilaLista
        v-for="a in accesos" :key="a.clave"
        :titulo="a.titulo" :subtitulo="a.texto" :icono="a.icono" color-icono="secondary" clicable
        :data-testid="`acceso-${a.clave}`"
        @click="ir(a.to)"
      >
        <template #acciones><v-icon icon="mdi-chevron-right" aria-hidden="true" /></template>
      </FilaLista>
    </SeccionLista>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import FilaLista from '@/components/ui/FilaLista.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import CifrasEnLinea from '@/components/ui/CifrasEnLinea.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import GraficoBarras from '@/components/ui/GraficoBarras.vue'
import { cargarInicio } from '@/services/inicioSuperAdminService'
import { contarEmpresas, seriesPorMes, usuariosNuevos30Dias, siguientePasoSuperAdmin, fraseResumen, claveMes } from '@/utils/inicioSuperAdmin'
import { formatMoney } from '@/utils/formatMoney'

const router = useRouter()
const tema = useTheme()

const cargando = ref(true)
const error = ref('')
const datos = ref({ usuarios: [], facturasPagadas: [], pagosPendientes: 0, porVerificar: 0, erroresIa: 0, diasSinTasa: 0 })
const serieElegida = ref('ingresos')

async function cargar() {
  cargando.value = true
  const r = await cargarInicio()
  datos.value = r.data
  error.value = r.error || ''
  cargando.value = false
}
onMounted(cargar)

const ir = (to) => router.push(to)

const empresas = computed(() => contarEmpresas(datos.value.usuarios))
const series = computed(() => seriesPorMes(datos.value))
const ingresosMes = computed(() => {
  const hoy = claveMes(new Date())
  return datos.value.facturasPagadas
    .filter((f) => claveMes(f.paid_at) === hoy && (f.currency || 'USD') === 'USD')
    .reduce((s, f) => s + (Number(f.amount) || 0), 0)
})

const frase = computed(() => fraseResumen(empresas.value, ingresosMes.value, (n) => formatMoney(n)))

const siguiente = computed(() => siguientePasoSuperAdmin({
  pagosPendientes: datos.value.pagosPendientes,
  vencenSemana: empresas.value.vencenSemana,
  erroresIa: datos.value.erroresIa,
  diasSinTasa: datos.value.diasSinTasa,
  porVerificar: datos.value.porVerificar,
}))

const cifras = computed(() => [
  { clave: 'activas', valor: empresas.value.activas, texto: 'empresas activas' },
  { clave: 'prueba', valor: empresas.value.prueba, texto: 'en prueba' },
  { clave: 'vencidas', valor: empresas.value.vencidas, texto: 'vencidas', alerta: empresas.value.vencidas > 0 },
  { clave: 'ingresos', valor: formatMoney(ingresosMes.value), texto: 'ingresos del mes' },
  { clave: 'pagos', valor: datos.value.pagosPendientes, texto: 'pagos por aprobar', alerta: datos.value.pagosPendientes > 0 },
  { clave: 'nuevos', valor: usuariosNuevos30Dias(datos.value.usuarios), texto: 'empresas nuevas en 30 días' },
])

const opcionesSerie = computed(() => [
  { valor: 'ingresos', texto: 'Ingresos' },
  { valor: 'altas', texto: 'Empresas nuevas' },
])
// Color del tema (granate en claro, su versión legible en oscuro).
const colorSerie = computed(() => tema.current.value.colors.primary)

const accesos = [
  { clave: 'operacion', titulo: 'Operación', texto: 'Catálogo, uso de IA y tasas', icono: 'mdi-tools', to: { name: 'AdminOperacion' } },
  { clave: 'facturacion', titulo: 'Facturación', texto: 'Facturas, pagos y métodos de cobro', icono: 'mdi-receipt-text-outline', to: { name: 'FacturacionSistema' } },
  { clave: 'usuarios', titulo: 'Usuarios', texto: 'Cuentas y planes de cada empresa', icono: 'mdi-account-group', to: { name: 'Usuarios' } },
  { clave: 'ia', titulo: 'Configuración IA', texto: 'Proveedores y modelos de la IA', icono: 'mdi-robot-outline', to: { name: 'AiSettings' } },
]
</script>

<style scoped>
.inicio-sa { max-width: 960px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .inicio-sa { padding: 32px 24px 40px; } }
.inicio-sa__frase { font-size: 1.125rem; line-height: 1.5; margin: 0 0 20px; color: rgba(var(--v-theme-on-surface), 0.87); }

.grafico { padding: 16px; }
</style>
