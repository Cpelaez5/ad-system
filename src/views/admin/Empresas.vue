<template>
  <div class="empresas">
    <EncabezadoPagina
      titulo="Empresas"
      subtitulo="Los negocios que usan AD System: su plan, si están al día y qué tan activos están."
    />

    <v-text-field
      v-model="busqueda"
      label="Buscar por nombre o RIF"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      hide-details
      class="mb-3 empresas__buscar"
      data-testid="buscar-empresa"
    />

    <FiltroChips v-model="filtro" :opciones="opciones" etiqueta="Mostrar" class="mb-4" />

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error">
      <template #append>
        <v-btn variant="text" class="text-none" @click="cargar">Reintentar</v-btn>
      </template>
    </v-alert>

    <v-skeleton-loader v-if="cargando" type="list-item-two-line@6" class="rounded-xl" />

    <EstadoVacio
      v-else-if="!error && !visibles.length"
      icono="mdi-domain"
      :titulo="filas.length ? 'Ninguna empresa coincide' : 'Todavía no hay empresas'"
      :mensaje="filas.length ? 'Prueba con otro nombre, otro RIF u otro filtro.' : 'Cuando un negocio se registre, aparecerá aquí.'"
    />

    <SeccionLista v-else-if="!error" :titulo="tituloLista" icono="mdi-domain">
      <!-- Fila propia (no FilaLista): en el teléfono el estado va DEBAJO del nombre, no a su lado. -->
      <button
        v-for="e in visibles"
        :key="e.id"
        type="button"
        class="fila-empresa"
        data-testid="fila-empresa"
        @click="abrir(e)"
      >
        <span class="fila-empresa__icono" :class="{ 'fila-empresa__icono--activa': actividad(e).clave === 'activa' }" aria-hidden="true">
          <v-icon icon="mdi-storefront-outline" size="20" />
        </span>
        <span class="fila-empresa__texto">
          <span class="fila-empresa__nombre">{{ e.nombre || 'Sin nombre' }}</span>
          <span class="fila-empresa__sub">{{ subtitulo(e) }}</span>
          <span class="fila-empresa__pie">
            <v-chip :color="estado(e).color" variant="flat" size="small">{{ estado(e).texto }}</v-chip>
            <span v-if="e.registros_mes" class="fila-empresa__mes">{{ e.registros_mes }} este mes</span>
          </span>
        </span>
        <v-icon icon="mdi-chevron-right" class="fila-empresa__flecha" aria-hidden="true" />
      </button>
    </SeccionLista>

    <!-- Detalle: hoja en el teléfono, diálogo en escritorio -->
    <DialogoAdaptable v-model="detalleAbierto" :titulo="elegida?.nombre || 'Empresa'" icono="mdi-storefront-outline">
      <div v-if="elegida" class="detalle" data-testid="detalle-empresa">
        <div class="detalle__estado">
          <v-chip :color="estado(elegida).color" variant="flat">{{ estado(elegida).texto }}</v-chip>
          <span class="detalle__actividad">{{ actividad(elegida).texto }}</span>
        </div>

        <dl class="detalle__datos">
          <div><dt>RIF</dt><dd>{{ rif(elegida) || 'Sin RIF' }}</dd></div>
          <div><dt>Rubro</dt><dd>{{ elegida.rubro || 'Sin indicar' }}</dd></div>
          <div><dt>Plan</dt><dd>{{ elegida.plan_nombre || 'Sin plan' }}</dd></div>
          <div v-if="elegida.prueba_hasta"><dt>Prueba hasta</dt><dd>{{ fecha(elegida.prueba_hasta) }}</dd></div>
          <div v-if="elegida.proximo_cobro"><dt>Próximo cobro</dt><dd>{{ fecha(elegida.proximo_cobro) }}</dd></div>
          <div><dt>Facturas del plan por pagar</dt><dd>{{ elegida.facturas_pendientes }}</dd></div>
          <div><dt>Registros este mes</dt><dd>{{ elegida.registros_mes }}</dd></div>
          <div><dt>Personas con acceso</dt><dd>{{ elegida.usuarios }}</dd></div>
          <div><dt>Último ingreso</dt><dd>{{ elegida.ultimo_ingreso ? fecha(elegida.ultimo_ingreso) : 'Nunca' }}</dd></div>
          <div><dt>Uso del asistente este mes</dt><dd>{{ usoIa(elegida) }}</dd></div>
          <div><dt>Cliente desde</dt><dd>{{ fecha(elegida.creada_en) }}</dd></div>
        </dl>

        <div class="detalle__contacto">
          <v-btn
            v-if="whatsapp(elegida)"
            :href="whatsapp(elegida)"
            target="_blank"
            rel="noopener"
            color="success"
            variant="flat"
            prepend-icon="mdi-whatsapp"
            class="text-none"
            block
          >Escribirle por WhatsApp</v-btn>
          <v-btn
            v-if="elegida.telefono"
            :href="`tel:${elegida.telefono}`"
            variant="tonal"
            prepend-icon="mdi-phone-outline"
            class="text-none"
            block
          >Llamar · {{ elegida.telefono }}</v-btn>
          <v-btn
            v-if="elegida.correo"
            :href="`mailto:${elegida.correo}`"
            variant="tonal"
            prepend-icon="mdi-email-outline"
            class="text-none detalle__correo"
            block
          >{{ elegida.correo }}</v-btn>
        </div>

        <div class="detalle__ir">
          <v-btn variant="text" color="primary" class="text-none" prepend-icon="mdi-receipt-text-outline" :to="{ name: 'FacturacionSistema' }">Ver pagos del plan</v-btn>
          <v-btn variant="text" color="primary" class="text-none" prepend-icon="mdi-account-group" :to="{ name: 'Usuarios' }">Ver usuarios</v-btn>
        </div>
      </div>
    </DialogoAdaptable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { formatFechaCorta } from '@/utils/fechas'
import { normalizarRif } from '@/utils/rif'
import {
  estadoEmpresa, actividadEmpresa, cumpleFiltro, opcionesConCantidad, buscarEmpresas, enlaceWhatsApp,
} from '@/utils/empresas'

/**
 * Super admin → Empresas (/admin/empresas). Lista de negocios con su estado comercial
 * (prueba, al día, por cobrar), actividad y contacto. Datos de la RPC admin_listar_empresas
 * (solo super_admin, sin embeds). Ver docs/mvp/super-admin-pendientes.md.
 */
const filas = ref([])
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const filtro = ref('todas')
const elegida = ref(null)
const detalleAbierto = ref(false)
const ahora = new Date()

async function cargar() {
  cargando.value = true
  error.value = ''
  const { data, error: err } = await supabase.rpc('admin_listar_empresas')
  if (err) {
    error.value = 'No pudimos cargar las empresas. Revisa tu conexión e intenta de nuevo.'
    filas.value = []
  } else {
    filas.value = data || []
  }
  cargando.value = false
}

onMounted(cargar)

const encontradas = computed(() => buscarEmpresas(filas.value, busqueda.value))
const opciones = computed(() => opcionesConCantidad(encontradas.value, ahora))
const visibles = computed(() => encontradas.value.filter((f) => cumpleFiltro(f, filtro.value, ahora)))
const tituloLista = computed(() => `${visibles.value.length} ${visibles.value.length === 1 ? 'empresa' : 'empresas'}`)

const estado = (e) => estadoEmpresa(e, ahora)
const actividad = (e) => actividadEmpresa(e, ahora)
const fecha = (v) => formatFechaCorta(v)
const whatsapp = (e) => enlaceWhatsApp(e?.telefono)
const rif = (e) => (e?.rif ? normalizarRif(e.rif) || e.rif : '')
const subtitulo = (e) => [rif(e), actividad(e).texto].filter(Boolean).join(' · ')
const usoIa = (e) => {
  const n = Number(e?.creditos_ia_mes) || 0
  if (!n) return 'Sin uso'
  return `${n.toLocaleString('es-VE', { maximumFractionDigits: 1 })} ${n === 1 ? 'crédito' : 'créditos'}`
}

function abrir(e) {
  elegida.value = e
  detalleAbierto.value = true
}
</script>

<style scoped>
.empresas { max-width: 960px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .empresas { padding: 32px 24px 40px; } }
.empresas__buscar { max-width: 480px; }

.fila-empresa {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 14px 16px; text-align: left; background: none; border: 0; cursor: pointer;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: inherit; font: inherit;
}
.fila-empresa:last-child { border-bottom: 0; }
.fila-empresa:hover { background: rgba(var(--v-theme-on-surface), 0.04); }
.fila-empresa:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
.fila-empresa__icono {
  flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.08); color: rgba(var(--v-theme-on-surface), 0.6);
}
.fila-empresa__icono--activa { background: rgba(var(--v-theme-primary), 0.12); color: rgb(var(--v-theme-primary)); }
.fila-empresa__texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.fila-empresa__nombre {
  font-weight: 600; font-size: 1rem; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.fila-empresa__sub { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), 0.7); }
.fila-empresa__pie { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 6px; }
.fila-empresa__mes { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), 0.7); }
.fila-empresa__flecha { flex: none; color: rgba(var(--v-theme-on-surface), 0.4); }

.detalle { display: flex; flex-direction: column; gap: 16px; }
.detalle__estado { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.detalle__actividad { color: rgba(var(--v-theme-on-surface), 0.7); font-size: 0.95rem; }

.detalle__datos { display: grid; grid-template-columns: 1fr; gap: 0; margin: 0; }
.detalle__datos > div {
  display: flex; justify-content: space-between; gap: 16px;
  padding: 10px 0; border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.detalle__datos dt { color: rgba(var(--v-theme-on-surface), 0.7); font-size: 0.95rem; }
.detalle__datos dd { margin: 0; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
@media (min-width: 600px) {
  .detalle__datos { grid-template-columns: 1fr 1fr; column-gap: 24px; }
}

.detalle__contacto { display: flex; flex-direction: column; gap: 8px; }
.detalle__contacto :deep(.v-btn) { min-height: 44px; }
.detalle__correo :deep(.v-btn__content) { overflow: hidden; text-overflow: ellipsis; }
.detalle__ir { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
