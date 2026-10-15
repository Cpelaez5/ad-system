<template>
  <section id="tasa" class="tasa" aria-labelledby="tasa-titulo" data-testid="tasa-cambio">
    <header class="tasa__cabecera">
      <h2 id="tasa-titulo" class="tasa__titulo">Tasa de cambio</h2>
      <p class="tasa__ayuda">Con esta tasa pasamos a bolívares tus facturas en dólares, euros y otras monedas.</p>
    </header>

    <v-skeleton-loader v-if="cargando" type="list-item-two-line, list-item-two-line" class="bg-transparent" />

    <template v-else>
      <div class="tasa__opciones" role="radiogroup" aria-label="Cómo quieres tu tasa">
        <button
          v-for="op in opciones"
          :key="op.valor"
          type="button"
          role="radio"
          :aria-checked="modo === op.valor ? 'true' : 'false'"
          :class="['tasa__opcion', { 'tasa__opcion--activa': modo === op.valor }]"
          :data-testid="`tasa-opcion-${op.valor}`"
          @click="elegirModo(op.valor)"
        >
          <v-icon :icon="op.icono" size="28" class="tasa__opcion-icono" />
          <span class="tasa__opcion-texto">
            <strong>{{ op.titulo }}</strong>
            <span>{{ op.detalle }}</span>
          </span>
          <v-icon v-if="modo === op.valor" icon="mdi-check-circle" color="primary" size="24" />
        </button>
      </div>

      <p class="tasa__aviso" data-testid="tasa-aviso">
        Las tasas automáticas vienen de un servicio externo basado en el BCV. Pueden fallar o llegar con retraso. Revísalas antes de declarar.
      </p>

      <!-- Automática -->
      <div v-if="modo === 'automatica'" class="tasa__detalle">
        <p v-if="resumenAutomatica" class="tasa__hoy" data-testid="tasa-hoy">{{ resumenAutomatica }}</p>
        <v-checkbox
          v-if="!guardado.avisoAceptadoEn"
          v-model="entiendo"
          color="primary"
          hide-details
          density="comfortable"
          label="Entiendo que la tasa automática puede fallar o llegar con retraso"
          data-testid="tasa-entiendo"
        />
      </div>

      <!-- Manual -->
      <div v-else class="tasa__detalle" data-testid="tasa-manual">
        <p class="tasa__nota">Escribe cuántos bolívares vale cada moneda. No la cambiamos por ti: actualízala cuando cambie.</p>
        <div class="tasa__campos">
          <div v-for="cod in monedasVisibles" :key="cod" class="tasa__campo">
            <v-text-field
              :model-value="campos[cod]"
              :label="`${nombreMoneda(cod)} (${cod})`"
              placeholder="Ej. 879,12"
              @update:model-value="v => (campos[cod] = formatearTasaEscrita(v))"
              :prefix="`Bs por ${simbolo(cod)}1 =`"
              inputmode="decimal"
              variant="outlined"
              density="comfortable"
              color="primary"
              :error-messages="errorCampo(cod)"
              :hint="notaCampo(cod)"
              persistent-hint
              :data-testid="`tasa-campo-${cod}`"
            />
          </div>
        </div>
        <v-menu v-if="monedasPorAgregar.length">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="text" color="primary" class="text-none" prepend-icon="mdi-plus" data-testid="tasa-agregar">
              Agregar otra moneda
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="cod in monedasPorAgregar"
              :key="cod"
              :title="`${nombreMoneda(cod)} (${cod})`"
              :data-testid="`tasa-agregar-${cod}`"
              @click="agregarMoneda(cod)"
            />
          </v-list>
        </v-menu>
      </div>

      <AvisoAmable v-if="error" tipo="error" :mensaje="error" class="mt-3" />
      <AvisoAmable v-if="exito" tipo="info" icono="mdi-check-circle" :mensaje="exito" class="mt-3" cerrable @cerrar="exito = ''" />

      <div v-if="hayCambios" class="tasa__acciones" data-testid="tasa-acciones">
        <v-btn
          color="primary"
          size="large"
          class="text-none"
          :loading="guardando"
          :disabled="!puedeGuardar"
          data-testid="tasa-guardar"
          @click="guardar"
        >
          Guardar
        </v-btn>
        <v-btn variant="text" size="large" class="text-none" :disabled="guardando" data-testid="tasa-cancelar" @click="cancelar">
          Cancelar
        </v-btn>
      </div>
    </template>

    <!-- Historial de las tasas que el negocio definió a mano (tasas_historial) -->
    <v-expansion-panels v-if="historial.length" variant="accordion" class="tasa__historial mt-4" data-testid="tasa-historial">
      <v-expansion-panel elevation="0">
        <v-expansion-panel-title>
          <v-icon icon="mdi-history" size="20" class="mr-2" />
          Historial de tus tasas ({{ historial.length }} {{ historial.length === 1 ? 'día' : 'días' }})
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <ul class="tasa__historial-lista">
            <li v-for="d in historial" :key="d.fecha" class="tasa__historial-fila">
              <span class="tasa__historial-fecha">
                {{ formatFechaCorta(d.fecha) }}<span v-if="d.en" class="tasa__historial-hora"> · {{ horaCaracas(d.en) }}</span>
              </span>
              <span class="tasa__historial-valores">
                <span v-for="(valor, codigo) in d.tasas" :key="codigo" class="tasa__historial-valor">
                  <span class="tasa__historial-moneda">{{ codigo }}</span>
                  Bs {{ tasaParaCampo(valor) }}
                </span>
              </span>
            </li>
          </ul>
          <p class="tasa__historial-nota">Cada factura guarda además la tasa con la que se registró.</p>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </section>
</template>

<script>
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { preferencia, guardarPreferencia, tasasVigentes, monedasUsadas, diasDeAntiguedad, historialTasas } from '@/services/tasaService.js'
import { MONEDAS, CODIGOS_CON_TASA, MONEDAS_OTRAS, formatearTasaEscrita, parsearTasaEscrita, tasaParaCampo } from '@/utils/monedas.js'
import { formatTasa } from '@/utils/formatMoney.js'
import { formatFechaCorta, horaCaracas } from '@/utils/fechas.js'

const BASICAS = ['USD', 'EUR']

/**
 * TasaDeCambio — sección "Tasa de cambio" de Mi negocio. El cliente elige si usa la
 * tasa automática (BCV, servicio de terceros) o si la define él (manual, sin
 * actualizarse sola). Solo guarda al tocar "Guardar"; "Cancelar" vuelve a lo guardado.
 * Especificación: docs/mvp/diseno/tasas-de-cambio.md.
 */
export default {
  name: 'TasaDeCambio',

  components: { AvisoAmable },

  data() {
    return {
      historial: [],
      cargando: true,
      guardando: false,
      error: '',
      exito: '',
      // Lo guardado en la BD
      guardado: { modo: 'automatica', tasas: {}, avisoAceptadoEn: null },
      // Lo que se ve en pantalla (sin guardar)
      modo: 'automatica',
      campos: {},
      agregadas: [],
      usadas: [],
      entiendo: false,
      vigente: null,
    }
  },

  computed: {
    opciones() {
      return [
        { valor: 'automatica', titulo: 'Automática (BCV)', detalle: 'La buscamos por ti cada día', icono: 'mdi-autorenew' },
        { valor: 'manual', titulo: 'La defino yo', detalle: 'La cambias tú cuando quieras', icono: 'mdi-pencil-outline' },
      ]
    },
    monedasVisibles() {
      const guardadas = Object.keys(this.guardado.tasas)
      const todas = new Set([...BASICAS, ...guardadas, ...this.usadas, ...this.agregadas])
      return CODIGOS_CON_TASA.filter((c) => todas.has(c))
    },
    monedasPorAgregar() {
      return MONEDAS_OTRAS.filter((c) => !this.monedasVisibles.includes(c))
    },
    resumenAutomatica() {
      const t = this.vigente?.tasas
      if (!t || !t.USD) return ''
      const partes = [`Dólar ${formatTasa(t.USD)}`]
      if (t.EUR) partes.push(`Euro ${formatTasa(t.EUR)}`)
      return `Hoy usamos: ${partes.join(' · ')}.`
    },
    cambioModo() {
      return this.modo !== this.guardado.modo
    },
    camposCambiados() {
      if (this.modo !== 'manual') return false
      return this.monedasVisibles.some((c) => this.valorCampo(c) !== (this.guardado.tasas[c]?.tasa ?? null))
    },
    aceptaAviso() {
      return this.modo === 'automatica' && !this.guardado.avisoAceptadoEn && this.entiendo
    },
    hayCambios() {
      return this.cambioModo || this.camposCambiados || this.aceptaAviso
    },
    hayCamposInvalidos() {
      return this.monedasVisibles.some((c) => !!this.errorCampo(c))
    },
    hayAlgunaTasa() {
      return this.monedasVisibles.some((c) => this.valorCampo(c) !== null)
    },
    puedeGuardar() {
      if (this.modo === 'automatica') {
        return !!this.guardado.avisoAceptadoEn || this.entiendo
      }
      return this.hayAlgunaTasa && !this.hayCamposInvalidos
    },
  },

  watch: {
    // Ya estando en Mi negocio, tocar el chip de la barra cambia solo el hash.
    '$route.hash'(hash) {
      if (hash === '#tasa') this.irAqui()
    },
  },

  async mounted() {
    await this.cargar()
    if (typeof window !== 'undefined' && window.location?.hash === '#tasa') this.irAqui()
  },

  methods: {
    formatFechaCorta,
    formatTasa,
    irAqui() {
      this.$nextTick(() => this.$el?.scrollIntoView?.({ block: 'start' }))
    },

    nombreMoneda: (c) => MONEDAS[c]?.nombre || c,
    simbolo: (c) => MONEDAS[c]?.simbolo || c,

    async cargarHistorial() {
      this.historial = await historialTasas({ limite: 60 })
    },

    async cargar() {
      this.cargarHistorial()
      this.cargando = true
      try {
        const [pref, usadas] = await Promise.all([preferencia(), monedasUsadas()])
        this.guardado = pref
        this.usadas = usadas
        this.restaurar()
        // La referencia de hoy solo se muestra en automática
        if (pref.modo === 'automatica') {
          try { this.vigente = await tasasVigentes() } catch { this.vigente = null }
        }
      } finally {
        this.cargando = false
      }
    },

    /** Vuelve la pantalla a lo guardado. */
    restaurar() {
      this.modo = this.guardado.modo
      this.agregadas = []
      this.entiendo = false
      const campos = {}
      for (const [cod, v] of Object.entries(this.guardado.tasas)) campos[cod] = this.formatoCampo(v.tasa)
      this.campos = campos
      this.error = ''
    },

    formatearTasaEscrita,
    tasaParaCampo,
    horaCaracas,
    /** "104036.77" → "104.036,77" (mismo formato que se usa al escribir). */
    formatoCampo(n) {
      return tasaParaCampo(n)
    },

    elegirModo(valor) {
      this.modo = valor
      this.error = ''
      this.exito = ''
    },

    agregarMoneda(cod) {
      if (!this.agregadas.includes(cod)) this.agregadas = [...this.agregadas, cod]
    },

    valorCampo(cod) {
      const t = this.campos[cod]
      if (t === undefined || t === null || String(t).trim() === '') return null
      return parsearTasaEscrita(t)
    },

    errorCampo(cod) {
      const t = this.campos[cod]
      if (t === undefined || t === null || String(t).trim() === '') return ''
      return parsearTasaEscrita(t) ? '' : 'Escribe un número mayor que cero, por ejemplo 877,90'
    },

    notaCampo(cod) {
      const guardada = this.guardado.tasas[cod]
      const nueva = this.valorCampo(cod)
      if (nueva !== null && nueva !== (guardada?.tasa ?? null)) return 'Se guardará con la fecha de hoy'
      if (!guardada) return 'Aún no la escribes'
      if (!guardada.fecha) return 'Actualizada: fecha desconocida'
      const vieja = diasDeAntiguedad(guardada.fecha) > 1
      const hora = guardada.en ? ` a las ${horaCaracas(guardada.en)}` : ''
      return `Actualizada el ${formatFechaCorta(guardada.fecha)}${hora}${vieja ? ' · tiene más de un día, revisa si cambió' : ''}`
    },

    /** Tasas a guardar: las que no cambiaron conservan su fecha; las nuevas llevan la de hoy. */
    construirTasas() {
      const salida = {}
      for (const cod of this.monedasVisibles) {
        const n = this.valorCampo(cod)
        if (n === null) continue
        const previa = this.guardado.tasas[cod]
        salida[cod] = previa && previa.tasa === n ? { tasa: n, fecha: previa.fecha, en: previa.en } : { tasa: n }
      }
      return salida
    },

    async guardar() {
      if (!this.puedeGuardar || this.guardando) return
      this.guardando = true
      this.error = ''
      this.exito = ''
      try {
        const res = await guardarPreferencia({
          modo: this.modo,
          // Al pasar a automática se conservan las tasas manuales por si vuelve.
          tasas: this.modo === 'manual' ? this.construirTasas() : this.guardado.tasas,
          avisoAceptado: this.aceptaAviso,
        })
        if (!res.ok) {
          this.error = res.error || 'No pudimos guardar la tasa. Intenta de nuevo.'
          return
        }
        this.exito = this.modo === 'manual'
          ? 'Listo. Usaremos tus tasas hasta que las cambies.'
          : 'Listo. Usaremos la tasa automática del BCV.'
        this.$emit('guardado', this.modo)
        await this.cargar()
      } finally {
        this.guardando = false
      }
    },

    cancelar() {
      this.restaurar()
    },
  },

  emits: ['guardado'],
}
</script>

<style scoped>
.tasa {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 20px;
  padding: 22px 24px;
  margin-bottom: 20px;
  scroll-margin-top: 80px;
}
@media (max-width: 599px) {
  .tasa { padding: 18px; }
}
.tasa__cabecera { margin-bottom: 16px; }
.tasa__titulo { font-size: 1.15rem; font-weight: 700; margin: 0; }
.tasa__ayuda { margin: 4px 0 0; font-size: 1rem; color: rgba(var(--v-theme-on-surface), 0.72); max-width: 68ch; }

.tasa__opciones { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 720px) {
  .tasa__opciones { grid-template-columns: 1fr 1fr; }
}
.tasa__opcion {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 76px;
  padding: 14px 16px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 16px;
  cursor: pointer;
  transition: border-color var(--ad-move-rapido, 150ms) ease, background-color var(--ad-move-rapido, 150ms) ease;
}
.tasa__opcion:hover { border-color: rgba(var(--v-theme-on-surface), 0.36); }
.tasa__opcion:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.tasa__opcion--activa { border-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), 0.05); }
.tasa__opcion-icono { flex: none; }
.tasa__opcion-texto { display: flex; flex-direction: column; gap: 2px; flex: 1; font-size: 1rem; }
.tasa__opcion-texto strong { font-size: 1.05rem; }
.tasa__opcion-texto span { color: rgba(var(--v-theme-on-surface), 0.72); }

.tasa__aviso { margin: 14px 0 0; font-size: 0.95rem; line-height: 1.5; color: rgba(var(--v-theme-on-surface), 0.78); max-width: 68ch; }
.tasa__detalle { margin-top: 12px; }
.tasa__hoy { margin: 0 0 4px; font-size: 1rem; font-weight: 600; }
.tasa__nota { margin: 0 0 12px; font-size: 1rem; }
.tasa__campos { display: grid; grid-template-columns: 1fr; gap: 6px 16px; }
@media (min-width: 720px) {
  .tasa__campos { grid-template-columns: 1fr 1fr; }
}
.tasa__acciones { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
@media (max-width: 599px) {
  .tasa__acciones { flex-direction: column; }
  .tasa__acciones .v-btn { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .tasa__opcion { transition: none; }
}
.tasa__historial-lista {
  list-style: none;
  padding: 0;
  margin: 0;
}
.tasa__historial-fila {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 16px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.tasa__historial-fecha {
  font-weight: 600;
}
.tasa__historial-valores {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.tasa__historial-nota {
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.tasa__historial-hora {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.tasa__historial-valor {
  white-space: nowrap;
}
.tasa__historial-moneda {
  display: inline-block;
  margin-right: 4px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
