<template>
  <v-card class="tasa-rapida" width="340" data-testid="tasa-rapida">
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <h3 class="tasa-rapida__titulo">Tasa de hoy</h3>
        <span class="tasa-rapida__fecha">{{ fechaHoy }}</span>
      </div>

      <v-btn-toggle v-model="modo" mandatory divided density="comfortable" color="primary" variant="outlined" class="tasa-rapida__modo mb-4">
        <v-btn value="automatica" class="text-none" prepend-icon="mdi-autorenew">Automática</v-btn>
        <v-btn value="manual" class="text-none" prepend-icon="mdi-pencil-outline">La defino yo</v-btn>
      </v-btn-toggle>

      <div v-if="cargando" class="d-flex justify-center py-4"><v-progress-circular indeterminate size="24" /></div>

      <!-- Automática: muestra lo que trae el servicio -->
      <template v-else-if="modo === 'automatica'">
        <div v-for="m in monedasVisibles" :key="m" class="tasa-rapida__fila">
          <span>{{ nombre(m) }}</span>
          <strong>{{ automaticas[m] ? 'Bs ' + formatoTasa(automaticas[m]) : '—' }}</strong>
        </div>
        <p class="tasa-rapida__nota">Viene de un servicio externo basado en el BCV. Puede fallar o llegar con retraso.</p>
        <v-checkbox v-if="!avisoAceptado && prefModo !== 'automatica'" v-model="entiendo" density="compact" hide-details class="mt-1"
          label="Entiendo que puede fallar o llegar con retraso" />
      </template>

      <!-- Manual: la escribe el cliente -->
      <template v-else>
        <v-text-field
          v-for="m in monedasVisibles"
          :key="m"
          :model-value="campos[m]"
          :label="nombre(m)"
          prefix="Bs"
          placeholder="Ej. 879,12"
          inputmode="decimal"
          variant="outlined"
          density="comfortable"
          :hint="pista(m)"
          persistent-hint
          class="mb-2"
          :data-testid="`tasa-rapida-${m}`"
          @update:model-value="v => (campos[m] = formatearTasaEscrita(v))"
          @keyup.enter="guardar"
        />
        <v-btn v-if="!mostrarTodas && monedasOcultas.length" variant="text" size="small" class="text-none px-1" prepend-icon="mdi-plus" @click="mostrarTodas = true">
          Agregar otra moneda
        </v-btn>
        <v-btn v-if="automaticas.USD" variant="text" size="small" class="text-none px-1" prepend-icon="mdi-content-copy" @click="copiarAutomaticas">
          Usar la del BCV como punto de partida
        </v-btn>
      </template>

      <p v-if="error" class="tasa-rapida__error" role="alert">{{ error }}</p>
    </v-card-text>

    <v-card-actions class="px-4 pb-4 pt-0 d-flex flex-wrap ga-2">
      <v-btn variant="text" class="text-none px-1" size="small" @click="irAMiNegocio">Historial y más opciones</v-btn>
      <v-spacer />
      <v-btn color="primary" variant="flat" class="text-none" :loading="guardando" :disabled="!puedeGuardar" data-testid="tasa-rapida-guardar" @click="guardar">
        Guardar
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
/**
 * Acceso rápido a la tasa desde la barra superior (chips USD/EUR): cambiar entre automática
 * y manual, y escribir las tasas del día sin ir a Mi negocio. El detalle y el historial
 * siguen en Mi negocio → Tasa de cambio (TasaDeCambio.vue).
 */
import { preferencia, tasasVigentes, guardarPreferencia, monedasUsadas } from '@/services/tasaService.js'
import { MONEDAS, formatearTasaEscrita, parsearTasaEscrita, tasaParaCampo } from '@/utils/monedas.js'
import { formatFechaCorta, hoyISO } from '@/utils/fechas.js'

export default {
  name: 'TasaRapida',
  props: {
    /** Moneda del chip que se tocó: solo se muestra esa (las demás, con "Agregar otra moneda"). */
    moneda: { type: String, default: null },
  },
  emits: ['guardado', 'cerrar'],
  data() {
    return {
      cargando: true,
      guardando: false,
      error: '',
      modo: 'automatica',
      prefModo: 'automatica',
      avisoAceptado: false,
      entiendo: false,
      monedas: ['USD', 'EUR'],
      campos: {},
      manualesGuardadas: {},
      automaticas: {},
      mostrarTodas: false,
    }
  },
  computed: {
    fechaHoy() {
      return formatFechaCorta(hoyISO())
    },
    /** Tocó un chip: solo esa moneda. Desde el recordatorio: las que ya tiene guardadas (o el dólar). */
    monedasVisibles() {
      if (this.mostrarTodas) return this.monedas
      if (this.moneda) return [this.moneda]
      const guardadas = Object.keys(this.manualesGuardadas)
      return guardadas.length ? guardadas : ['USD']
    },
    monedasOcultas() {
      return this.monedas.filter((m) => !this.monedasVisibles.includes(m))
    },
    puedeGuardar() {
      if (this.modo === 'automatica') return this.prefModo !== 'automatica' && (this.avisoAceptado || this.entiendo)
      return this.monedasVisibles.some((m) => this.numero(this.campos[m]) > 0)
    },
  },
  async mounted() {
    try {
      const [pref, vigentes, usadas] = await Promise.all([preferencia(), tasasVigentes(), monedasUsadas()])
      this.prefModo = pref.modo
      this.modo = pref.modo
      this.avisoAceptado = !!pref.avisoAceptadoEn
      this.manualesGuardadas = pref.tasas || {}
      this.monedas = [...new Set(['USD', 'EUR', ...(usadas || []), ...Object.keys(pref.tasas || {})])]
      if (vigentes?.modo === 'automatica') this.automaticas = { ...vigentes.tasas }
      else {
        // En manual, igual mostramos la automática como referencia (si responde).
        try {
          const { default: bcvService } = await import('@/services/bcvService.js')
          const r = await bcvService.getCurrentRate()
          if (r?.success && r.data) this.automaticas = { USD: r.data.dollar, EUR: r.data.euro, CNY: r.data.yuan, TRY: r.data.lira, RUB: r.data.rublo }
        } catch { /* sin referencia */ }
      }
      if (this.moneda && !this.monedas.includes(this.moneda)) this.monedas.push(this.moneda)
      for (const m of this.monedas) this.campos[m] = tasaParaCampo(this.manualesGuardadas[m]?.tasa)
    } finally {
      this.cargando = false
    }
  },
  methods: {
    nombre(codigo) {
      const m = MONEDAS[codigo]
      return m?.nombre ? `${m.nombre} (${codigo})` : codigo
    },
    formatearTasaEscrita,
    /** El campo siempre tiene el formato "104.036,77". */
    numero(v) {
      return parsearTasaEscrita(v) || 0
    },
    formatoTasa(n) {
      return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    },
    pista(m) {
      const g = this.manualesGuardadas[m]
      if (!g?.fecha) return 'Sin tasa guardada'
      return g.fecha === hoyISO() ? 'Actualizada hoy' : `Última: ${formatFechaCorta(g.fecha)}`
    },
    copiarAutomaticas() {
      for (const m of this.monedasVisibles) if (this.automaticas[m]) this.campos[m] = tasaParaCampo(this.automaticas[m])
    },
    async guardar() {
      if (!this.puedeGuardar) return
      this.error = ''
      this.guardando = true
      try {
        // Se conservan las tasas ya guardadas de las otras monedas (con su fecha);
        // solo cambian las que la persona escribió aquí, con fecha de hoy.
        const tasas = { ...this.manualesGuardadas }
        if (this.modo === 'manual') {
          for (const m of this.monedasVisibles) {
            const n = this.numero(this.campos[m])
            if (n > 0) tasas[m] = n
          }
        }
        const r = await guardarPreferencia({
          modo: this.modo,
          tasas: this.modo === 'manual' ? tasas : this.manualesGuardadas,
          avisoAceptado: this.modo === 'automatica' && this.entiendo,
        })
        if (!r.ok) {
          this.error = r.error
          return
        }
        this.$emit('guardado')
        this.$emit('cerrar')
      } finally {
        this.guardando = false
      }
    },
    irAMiNegocio() {
      this.$emit('cerrar')
      this.$router?.push('/cliente/mi-area#tasa')
    },
  },
}
</script>

<style scoped>
.tasa-rapida__titulo {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}
.tasa-rapida__fecha,
.tasa-rapida__nota {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.tasa-rapida__nota {
  margin: 8px 0 0;
}
.tasa-rapida__modo {
  width: 100%;
}
.tasa-rapida__modo :deep(.v-btn) {
  flex: 1 1 0;
}
.tasa-rapida__fila {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.tasa-rapida__error {
  color: rgb(var(--v-theme-error));
  font-size: 0.875rem;
  margin: 8px 0 0;
}
</style>
