<template>
  <div class="pagos-lista">
    <FiltroChips v-model="estado" :opciones="opciones" etiqueta="Filtrar pagos por estado" class="mb-4" />

    <div v-if="cargando" class="py-8"><v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" /></div>

    <EstadoVacio
      v-else-if="!filtrados.length"
      icono="mdi-clipboard-check-outline"
      :titulo="reportes.length ? 'No hay pagos con ese filtro' : 'Aún no han reportado pagos'"
      :mensaje="reportes.length ? 'Prueba con otro estado.' : 'Cuando un negocio reporte un pago, aparecerá aquí para que lo apruebes.'"
    />

    <SeccionLista v-else :meta="`${filtrados.length} ${filtrados.length === 1 ? 'pago' : 'pagos'}`">
      <FilaLista
        v-for="r in visibles" :key="r.id"
        :titulo="r.invoice?.client?.company_name || 'Sin empresa'"
        :subtitulo="subtitulo(r)"
        :valor="formatMoney(r.amount)"
        :valor-secundario="`Factura ${formatMoney(r.invoice?.amount || 0)}`"
        :estado="estadoReporte(r.status).texto"
        :color-estado="estadoReporte(r.status).color"
        :icono="tipoMetodo(r.payment_method?.type).icono"
        :color-icono="estadoReporte(r.status).color"
        clicable
        data-testid="pago-fila"
        @click="$emit('ver', r)"
      >
        <template #acciones>
          <div class="pagos-lista__acciones">
            <v-btn
              v-if="r.status === 'pending_review'"
              color="primary" variant="flat" class="text-none font-weight-bold" prepend-icon="mdi-check"
              data-testid="pago-aprobar" @click="$emit('aprobar', r)"
            >Aprobar</v-btn>
            <v-btn variant="outlined" class="text-none" prepend-icon="mdi-eye-outline" data-testid="pago-ver" @click="$emit('ver', r)">Ver</v-btn>
            <v-menu v-if="r.status === 'pending_review'">
              <template #activator="{ props: menu }">
                <v-btn v-bind="menu" icon="mdi-dots-vertical" variant="text" aria-label="Más acciones" data-testid="pago-mas" />
              </template>
              <v-list>
                <v-list-item prepend-icon="mdi-close-circle-outline" title="Rechazar pago" data-testid="pago-rechazar" @click="$emit('rechazar', r)" />
              </v-list>
            </v-menu>
          </div>
        </template>
      </FilaLista>
      <div v-if="filtrados.length > limite" class="pagos-lista__mas">
        <v-btn variant="text" class="text-none" @click="limite += 20">Ver más pagos</v-btn>
      </div>
    </SeccionLista>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import FilaLista from '@/components/ui/FilaLista.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import { formatMoney } from '@/utils/formatMoney'
import { filtrarReportes, contarPorEstado, estadoReporte, tipoMetodo, fechaCorta } from '@/utils/facturacionSistema'

const props = defineProps({
  reportes: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  estadoInicial: { type: String, default: 'all' },
})
defineEmits(['ver', 'aprobar', 'rechazar'])

const estado = ref(props.estadoInicial)
const limite = ref(20)
watch(() => props.estadoInicial, (v) => { estado.value = v })
watch(estado, () => { limite.value = 20 })

const conteos = computed(() => contarPorEstado(props.reportes))
const opciones = computed(() => [
  { valor: 'all', texto: 'Todos', cantidad: conteos.value.all },
  { valor: 'pending_review', texto: 'Por revisar', cantidad: conteos.value.pending_review || 0 },
  { valor: 'approved', texto: 'Aprobados', cantidad: conteos.value.approved || 0 },
  { valor: 'rejected', texto: 'Rechazados', cantidad: conteos.value.rejected || 0 },
])
const filtrados = computed(() => filtrarReportes(props.reportes, estado.value))
const visibles = computed(() => filtrados.value.slice(0, limite.value))

const subtitulo = (r) => [
  r.invoice?.invoice_number,
  r.payment_method?.name,
  r.reference ? `Ref. ${r.reference}` : '',
  fechaCorta(r.created_at),
].filter(Boolean).join(' · ')
</script>

<style scoped>
.pagos-lista__acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pagos-lista__mas { display: flex; justify-content: center; padding: 8px; }
</style>
