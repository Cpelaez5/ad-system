<template>
  <DialogoAdaptable :model-value="modelValue" titulo="Pago reportado" icono="mdi-file-eye-outline" @update:model-value="$emit('update:modelValue', $event)">
    <template v-if="reporte">
      <dl class="detalle">
        <div v-for="d in datosPrincipales" :key="d.texto" class="detalle__dato">
          <dt>{{ d.texto }}</dt><dd>{{ d.valor }}</dd>
        </div>
      </dl>

      <template v-if="sd.plan_name">
        <h3 class="detalle__seccion">Plan que pidió</h3>
        <dl class="detalle">
          <div class="detalle__dato"><dt>Plan</dt><dd>{{ sd.plan_name }}</dd></div>
          <div class="detalle__dato"><dt>Periodo</dt><dd>{{ sd.billing_period }}</dd></div>
          <div class="detalle__dato"><dt>Precio del plan</dt><dd>{{ formatMoney(sd.plan_price_usd) }}</dd></div>
        </dl>
      </template>

      <template v-if="sd.reported_amount_bs">
        <h3 class="detalle__seccion">Pago en bolívares</h3>
        <dl class="detalle">
          <div class="detalle__dato"><dt>Monto</dt><dd>Bs. {{ formatBs(sd.reported_amount_bs) }}</dd></div>
          <div class="detalle__dato"><dt>Tasa BCV usada</dt><dd>Bs. {{ sd.bcv_rate_used }}</dd></div>
        </dl>
      </template>

      <template v-if="datosEmisor.length">
        <h3 class="detalle__seccion">Quién envió el pago</h3>
        <dl class="detalle">
          <div v-for="d in datosEmisor" :key="d.texto" class="detalle__dato"><dt>{{ d.texto }}</dt><dd>{{ d.valor }}</dd></div>
        </dl>
      </template>

      <AvisoAmable
        v-if="sd.related_balance_payment" class="mt-4" tipo="info" titulo="Pago mixto"
        :mensaje="`Se completó con ${formatMoney(sd.related_balance_payment)} del saldo a favor del cliente.`"
      />

      <template v-if="reporte.proof_url">
        <h3 class="detalle__seccion">Comprobante</h3>
        <div v-if="!urlComprobante" class="text-medium-emphasis">Cargando el comprobante…</div>
        <template v-else>
          <v-img v-if="esImagen(reporte.proof_url)" :src="urlComprobante" max-height="320" class="detalle__imagen" data-testid="comprobante-imagen" />
          <v-btn v-else :href="urlComprobante" target="_blank" rel="noopener" variant="outlined" class="text-none" prepend-icon="mdi-file-pdf-box" data-testid="comprobante-pdf">
            Abrir el comprobante (PDF)
          </v-btn>
        </template>
      </template>

      <p v-if="reporte.status === 'rejected' && reporte.rejection_reason" class="mt-4">
        <strong>Motivo del rechazo:</strong> {{ reporte.rejection_reason }}
      </p>
    </template>

    <template v-if="reporte && reporte.status === 'pending_review'" #acciones>
      <v-btn variant="outlined" color="error" class="text-none" prepend-icon="mdi-close-circle-outline" data-testid="detalle-rechazar" @click="$emit('rechazar', reporte)">Rechazar</v-btn>
      <v-btn color="primary" variant="flat" size="large" class="text-none font-weight-bold" prepend-icon="mdi-check" data-testid="detalle-aprobar" @click="$emit('aprobar', reporte)">Aprobar pago</v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { computed } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { formatMoney } from '@/utils/formatMoney'
import { formatBs, esImagen, fechaHora } from '@/utils/facturacionSistema'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  reporte: { type: Object, default: null },
  /** URL firmada del comprobante (null mientras carga). */
  urlComprobante: { type: String, default: null },
})
defineEmits(['update:modelValue', 'aprobar', 'rechazar'])

const sd = computed(() => props.reporte?.sender_details || {})

const datosPrincipales = computed(() => {
  const r = props.reporte
  if (!r) return []
  return [
    { texto: 'Factura', valor: r.invoice?.invoice_number || '—' },
    { texto: 'Empresa', valor: r.invoice?.client?.company_name || '—' },
    { texto: 'Monto reportado', valor: formatMoney(r.amount) },
    { texto: 'Monto de la factura', valor: formatMoney(r.invoice?.amount || 0) },
    { texto: 'Método', valor: r.payment_method?.name || '—' },
    { texto: 'Referencia', valor: r.reference || '—' },
    { texto: 'Fecha', valor: fechaHora(r.created_at) },
  ]
})

const datosEmisor = computed(() => {
  const d = sd.value
  return [
    ['Teléfono', d.sender_phone], ['Documento', d.sender_document], ['Banco', d.sender_bank],
    ['Correo', d.sender_email], ['Nombre', d.sender_name], ['Binance ID', d.sender_binance_id],
    ['Monto enviado', d.sender_amount ? formatMoney(d.sender_amount) : ''],
  ].filter(([, v]) => v).map(([texto, valor]) => ({ texto, valor }))
})
</script>

<style scoped>
.detalle { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin: 0; }
.detalle__dato dt { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), 0.68); }
.detalle__dato dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.detalle__seccion { font-size: 1rem; font-weight: 700; margin: 20px 0 8px; }
.detalle__imagen { border: 1px solid rgba(var(--v-theme-on-surface), 0.12); border-radius: 12px; }
</style>
