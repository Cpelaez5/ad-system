<template>
  <div class="facturas-lista">
    <v-text-field
      v-model="texto"
      variant="outlined" density="comfortable" rounded="lg"
      placeholder="Buscar por número, empresa o RIF"
      prepend-inner-icon="mdi-magnify" clearable hide-details
      aria-label="Buscar facturas" class="mb-3" data-testid="facturas-buscar"
    />
    <FiltroChips v-model="estado" :opciones="opciones" etiqueta="Filtrar facturas por estado" class="mb-4" />

    <div v-if="cargando" class="py-8"><v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" /></div>

    <EstadoVacio
      v-else-if="!filtradas.length"
      icono="mdi-receipt-text-outline"
      :titulo="facturas.length ? 'No hay facturas con ese filtro' : 'Aún no has emitido facturas'"
      :mensaje="facturas.length ? 'Prueba con otro estado o borra la búsqueda.' : 'Emite la primera factura de suscripción para un negocio.'"
      :texto-accion="facturas.length ? '' : 'Emitir factura'"
      @accion="$emit('emitir')"
    />

    <SeccionLista v-else :meta="`${filtradas.length} ${filtradas.length === 1 ? 'factura' : 'facturas'}`">
      <FilaLista
        v-for="f in visibles" :key="f.id"
        :titulo="f.client?.company_name || 'Sin empresa'"
        :subtitulo="subtitulo(f)"
        :valor="formatMoney(f.amount, f.currency || 'USD')"
        :estado="estadoFactura(f.status).texto"
        :color-estado="estadoFactura(f.status).color"
        :icono="estadoFactura(f.status).icono"
        :color-icono="estadoFactura(f.status).color"
        data-testid="factura-fila"
      >
        <template v-if="f.status === 'pending'" #acciones>
          <v-btn
            variant="outlined" color="error" class="text-none" prepend-icon="mdi-cancel"
            data-testid="factura-anular" @click="$emit('anular', f)"
          >Anular</v-btn>
        </template>
      </FilaLista>
      <div v-if="filtradas.length > limite" class="facturas-lista__mas">
        <v-btn variant="text" class="text-none" data-testid="facturas-ver-mas" @click="limite += 20">Ver más facturas</v-btn>
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
import { filtrarFacturas, contarPorEstado, estadoFactura, fechaCorta } from '@/utils/facturacionSistema'

const props = defineProps({
  facturas: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  /** Estado con el que se abre el filtro ('all', 'overdue'…). */
  estadoInicial: { type: String, default: 'all' },
})
defineEmits(['emitir', 'anular'])

const texto = ref('')
const estado = ref(props.estadoInicial)
const limite = ref(20)
watch(() => props.estadoInicial, (v) => { estado.value = v })
watch([texto, estado], () => { limite.value = 20 })

const conteos = computed(() => contarPorEstado(props.facturas))
const opciones = computed(() => [
  { valor: 'all', texto: 'Todas', cantidad: conteos.value.all },
  { valor: 'pending', texto: 'Pendientes', cantidad: conteos.value.pending || 0 },
  { valor: 'paid', texto: 'Pagadas', cantidad: conteos.value.paid || 0 },
  { valor: 'overdue', texto: 'Vencidas', cantidad: conteos.value.overdue || 0 },
  { valor: 'canceled', texto: 'Anuladas', cantidad: conteos.value.canceled || 0 },
])

const filtradas = computed(() => filtrarFacturas(props.facturas, { texto: texto.value, estado: estado.value }))
const visibles = computed(() => filtradas.value.slice(0, limite.value))

const subtitulo = (f) => {
  const partes = [f.invoice_number, f.client?.rif].filter(Boolean)
  if (f.period_start || f.period_end) partes.push(`${fechaCorta(f.period_start)} al ${fechaCorta(f.period_end)}`)
  if (f.client?.balance > 0) partes.push(`Saldo a favor ${formatMoney(f.client.balance)}`)
  return partes.join(' · ')
}
</script>

<style scoped>
.facturas-lista__mas { display: flex; justify-content: center; padding: 8px; }
</style>
