<template>
  <div class="operacion">
    <EncabezadoPagina titulo="Operación" subtitulo="Lo que el equipo de AD System tiene que revisar hoy." />

    <PanelSiguientePaso
      v-if="!cargando"
      class="mb-6"
      :listo="!siguiente"
      :titulo="siguiente ? siguiente.titulo : ''"
      :detalle="siguiente ? siguiente.detalle : ''"
      :texto-boton="siguiente ? siguiente.boton : 'Abrir'"
      titulo-listo="Todo en orden"
      detalle-listo="No hay nada por verificar, ni errores de IA esta semana, ni días sin tasa."
      @accion="$router.push(siguiente.to)"
    />

    <div class="operacion__tarjetas" data-testid="tarjetas">
      <router-link v-for="t in tarjetas" :key="t.clave" :to="t.to" class="tarjeta" :data-testid="`tarjeta-${t.clave}`">
        <v-icon :icon="t.icono" size="28" :color="t.alerta ? 'warning' : 'secondary'" class="mb-2" aria-hidden="true" />
        <div class="tarjeta__titulo">{{ t.titulo }}</div>
        <div v-if="cargando" class="tarjeta__cifra text-medium-emphasis">…</div>
        <div v-else class="tarjeta__cifra" :class="{ 'tarjeta__cifra--alerta': t.alerta }">{{ t.cifra }}</div>
        <div class="tarjeta__detalle">{{ t.detalle }}</div>
        <span class="tarjeta__ir">Abrir <v-icon icon="mdi-arrow-right" size="16" aria-hidden="true" /></span>
      </router-link>
    </div>

    <v-alert v-if="error" type="warning" variant="tonal" class="mt-4" :text="error" />

    <SeccionLista titulo="Lo que sigue pendiente" icono="mdi-clipboard-list-outline" ayuda="Tareas del equipo que todavía no tienen herramienta en el panel. La lista completa está en docs/mvp/super-admin-pendientes.md." class="mt-8">
      <div v-for="p in pendientes" :key="p.titulo" class="pendiente">
        <div class="font-weight-bold">{{ p.titulo }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ p.texto }}</div>
      </div>
    </SeccionLista>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import { contarPorVerificar, contarErroresIa7Dias, filasTasas } from '@/services/superAdminService'
import { contarSinResponder } from '@/services/soporteService'
import { construirTablaTasas, huecosDeTasas, textoFaltan } from '@/utils/tasasAdmin'

const cargando = ref(true)
const error = ref('')
const porVerificar = ref({ proveedores: 0, productos: 0 })
const erroresIa = ref(0)
const diasSinTasa = ref(0)
const sinResponder = ref(0)

onMounted(async () => {
  const [a, b, c, d] = await Promise.all([contarPorVerificar(), contarErroresIa7Dias(), filasTasas(), contarSinResponder()])
  porVerificar.value = a.data
  erroresIa.value = b.data
  diasSinTasa.value = huecosDeTasas(construirTablaTasas(c.data)).length
  sinResponder.value = d.data
  error.value = [a.error, b.error, c.error, d.error].filter(Boolean).join(' ')
  cargando.value = false
})

const totalVerificar = computed(() => porVerificar.value.proveedores + porVerificar.value.productos)

const tarjetas = computed(() => [
  {
    clave: 'soporte', to: '/admin/soporte', icono: 'mdi-lifebuoy',
    titulo: 'Soporte', cifra: sinResponder.value, alerta: sinResponder.value > 0,
    detalle: sinResponder.value === 1 ? 'consulta espera respuesta' : 'consultas esperan respuesta',
  },
  {
    clave: 'catalogo', to: '/admin/catalogo', icono: 'mdi-book-open-page-variant-outline',
    titulo: 'Catálogo global', cifra: totalVerificar.value, alerta: totalVerificar.value > 0,
    detalle: `${porVerificar.value.proveedores} proveedores y ${porVerificar.value.productos} productos por verificar`,
  },
  {
    clave: 'ia', to: '/admin/uso-ia', icono: 'mdi-robot-outline',
    titulo: 'Uso de IA', cifra: erroresIa.value, alerta: erroresIa.value > 0,
    detalle: erroresIa.value === 1 ? 'error de IA en los últimos 7 días' : 'errores de IA en los últimos 7 días',
  },
  {
    clave: 'tasas', to: '/admin/tasas', icono: 'mdi-cash-sync',
    titulo: 'Tasas globales', cifra: diasSinTasa.value, alerta: diasSinTasa.value > 0,
    detalle: diasSinTasa.value === 0 ? 'No falta ningún día hábil' : `${textoFaltan(diasSinTasa.value)} (lunes a viernes)`,
  },
])

const siguiente = computed(() => {
  if (sinResponder.value > 0) {
    return { titulo: `${sinResponder.value} ${sinResponder.value === 1 ? 'consulta espera' : 'consultas esperan'} tu respuesta`, detalle: 'Los negocios escribieron al equipo desde el chat de ayuda.', boton: 'Abrir soporte', to: '/admin/soporte' }
  }
  if (diasSinTasa.value > 0) {
    return { titulo: textoFaltan(diasSinTasa.value) + ' de tasa', detalle: 'Los negocios usan estas tasas para convertir sus facturas.', boton: 'Revisar tasas', to: '/admin/tasas' }
  }
  if (erroresIa.value > 0) {
    return { titulo: `${erroresIa.value} ${erroresIa.value === 1 ? 'error' : 'errores'} de IA esta semana`, detalle: 'Mira cuáles códigos se repiten y qué dicen.', boton: 'Ver el uso de IA', to: '/admin/uso-ia' }
  }
  if (totalVerificar.value > 0) {
    return { titulo: `${totalVerificar.value} ${totalVerificar.value === 1 ? 'dato' : 'datos'} del catálogo por verificar`, detalle: 'Los más confirmados por los negocios van primero.', boton: 'Ir al catálogo', to: '/admin/catalogo' }
  }
  return null
})

// Texto estático: lo que aún NO tiene herramienta (docs/mvp/super-admin-pendientes.md).
const pendientes = [
  { titulo: 'Fusionar productos y proveedores duplicados', texto: 'Comparador lado a lado para el catálogo y para los proveedores con RIF dudoso.' },
  { titulo: 'Fotos de estudio con IA por lote', texto: 'Hoy se suben a mano; falta "Generar con IA" para el catálogo.' },
  { titulo: 'Categorías y campos por rubro', texto: 'Editor de la taxonomía (hoy vive en el código).' },
  { titulo: 'Límites por plan y aviso al cliente', texto: 'Topes de fotos IA y mejoras al mes.' },
  { titulo: 'Revisión de chats calificados 👎', texto: 'Bandeja para que el contador corrija las respuestas.' },
  { titulo: 'Llaves de API y registro de importaciones', texto: 'Ver uso por negocio, revocar y deshacer importaciones.' },
  { titulo: 'Correcciones de datos de clientes', texto: 'Reprocesar inventario de una factura, fusionar clientes y mover empresas entre despachos.' },
  { titulo: 'Documentos legales y ayuda pública', texto: 'Editor con versiones y registro de aceptación; artículos de ayuda.' },
  { titulo: 'Alícuotas de retención municipal', texto: 'Editor del catálogo por municipio con la fuente de la ordenanza.' },
]
</script>

<style scoped>
.operacion { max-width: 960px; margin: 0 auto; padding-bottom: 32px; }

.operacion__tarjetas {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 720px) { .operacion__tarjetas { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1000px) { .operacion__tarjetas { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

.tarjeta {
  display: flex;
  flex-direction: column;
  padding: 18px;
  text-decoration: none;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 20px;
  min-height: 44px;
}
.tarjeta:hover, .tarjeta:focus-visible { border-color: rgba(var(--v-theme-primary), 0.5); }
.tarjeta__titulo { font-weight: 700; }
.tarjeta__cifra { font-size: 2.2rem; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
.tarjeta__cifra--alerta { color: rgb(var(--v-theme-warning)); }
.tarjeta__detalle { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.68); margin-top: 2px; }
.tarjeta__ir { margin-top: 12px; font-weight: 600; font-size: 0.9rem; color: rgb(var(--v-theme-primary)); }

.pendiente { padding: 12px 16px; }
</style>
