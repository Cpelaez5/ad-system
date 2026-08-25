<template>
  <v-card color="#121C2B" theme="dark" elevation="4" class="rounded-lg border-thin">
    <v-card-title class="d-flex align-center flex-wrap gap-2 pa-3 pa-sm-4 bg-surface-header">
      <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
      <span class="text-subtitle-1 font-weight-bold">Datos Extraídos</span>
      <v-spacer class="d-none d-sm-block"></v-spacer>
      <v-chip :color="confidenceColor" variant="flat" size="small" class="font-weight-bold text-uppercase w-100 w-sm-auto justify-center mt-2 mt-sm-0">
        Confianza: {{ data.confianza || 'Desconocida' }}
      </v-chip>
    </v-card-title>

    <v-card-text class="pa-3 pa-sm-4 pt-0">
      
      <v-alert
        v-if="data.notas_ocr"
        type="warning"
        variant="tonal"
        class="my-3 text-body-2 rounded-lg"
        icon="mdi-alert"
      >
        {{ data.notas_ocr }}
      </v-alert>

      <!-- Información básica (Mobile First Grid) -->
      <v-row dense class="mt-2">
        <v-col cols="12" sm="6">
          <v-list density="compact" bg-color="transparent" class="pa-0">
            <v-list-item class="px-0 py-1">
              <template #prepend><v-icon size="small" class="mr-3 text-primary">mdi-office-building</v-icon></template>
              <v-list-item-subtitle class="text-caption text-grey">Proveedor</v-list-item-subtitle>
              <v-list-item-title class="text-white font-weight-medium text-wrap">{{ data.proveedor || 'No detectado' }}</v-list-item-title>
            </v-list-item>
            <v-list-item class="px-0 py-1">
              <template #prepend><v-icon size="small" class="mr-3 text-primary">mdi-file-document-outline</v-icon></template>
              <v-list-item-subtitle class="text-caption text-grey">Nº Factura</v-list-item-subtitle>
              <v-list-item-title class="text-white font-weight-medium">{{ data.numero_factura || 'No detectado' }}</v-list-item-title>
            </v-list-item>
            <v-list-item class="px-0 py-1">
              <template #prepend><v-icon size="small" class="mr-3 text-primary">mdi-calendar</v-icon></template>
              <v-list-item-subtitle class="text-caption text-grey">Fecha Emisión</v-list-item-subtitle>
              <v-list-item-title class="text-white font-weight-medium">{{ data.fecha_emision || 'No detectada' }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-col>
        <v-col cols="12" sm="6">
          <v-list density="compact" bg-color="transparent" class="pa-0">
            <v-list-item class="px-0 py-1 bg-total-box rounded-lg mb-2">
              <template #prepend><v-icon size="small" class="mr-3 text-gold">mdi-cash</v-icon></template>
              <v-list-item-subtitle class="text-caption text-grey">Totales</v-list-item-subtitle>
              <v-list-item-title class="text-white">
                <span class="text-gold font-weight-black text-h6">{{ data.moneda || 'VES' }} {{ formatNumber(data.monto_total) }}</span>
              </v-list-item-title>
            </v-list-item>
            <v-list-item class="px-0 py-1">
              <template #prepend><v-icon size="small" class="mr-3 text-primary">mdi-credit-card-outline</v-icon></template>
              <v-list-item-subtitle class="text-caption text-grey">Método</v-list-item-subtitle>
              <v-list-item-title class="text-white font-weight-medium d-flex align-center flex-wrap gap-2">
                {{ data.metodo_pago || 'No detectado' }}
                <v-chip v-if="data.es_cashea" color="primary" size="x-small" variant="elevated">
                  CASHEA (Cuota: {{ data.numero_cuota !== null ? data.numero_cuota : '?' }})
                </v-chip>
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-col>
      </v-row>

      <v-divider color="rgba(255,255,255,0.1)" class="my-4"></v-divider>

      <!-- Items -->
      <h4 class="text-subtitle-2 mb-3 text-white d-flex align-center">
        <v-icon size="small" class="mr-2 text-grey">mdi-format-list-bulleted</v-icon>
        Líneas Extraídas ({{ data.lineas?.length || 0 }})
      </h4>
      <div class="bg-black-transparent rounded-lg pa-2 mb-4" style="max-height: 250px; overflow-y: auto;">
        <v-list density="compact" bg-color="transparent">
          <v-list-item
            v-for="(item, index) in data.lineas"
            :key="index"
            class="px-2 py-2 border-bottom-dashed"
          >
            <v-list-item-title class="text-body-2 text-white text-wrap font-weight-medium mb-1">
              {{ item.descripcion }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption text-grey-lighten-1">
              <span class="font-weight-bold">{{ item.cantidad }}</span> un. × {{ formatNumber(item.precio_unit) }} 
              = <span class="text-white">{{ formatNumber(item.subtotal) }}</span>
            </v-list-item-subtitle>
          </v-list-item>
          <div v-if="!data.lineas?.length" class="text-caption text-grey-lighten-1 text-center py-4">
            <v-icon color="grey-darken-1" size="large" class="mb-2">mdi-text-box-remove-outline</v-icon><br>
            No se extrajeron líneas de detalle
          </div>
        </v-list>
      </div>

      <!-- JSON completo -->
      <v-expansion-panels>
        <v-expansion-panel bg-color="rgba(0,0,0,0.3)" elevation="0" class="border-thin">
          <v-expansion-panel-title class="text-grey-lighten-1 text-caption font-weight-bold">
            <v-icon size="small" class="mr-2">mdi-code-json</v-icon>
            Inspeccionar JSON Nativo
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <pre class="json-display text-grey-lighten-2">{{ JSON.stringify(data, null, 2) }}</pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <v-divider color="rgba(255,255,255,0.05)"></v-divider>

    <v-card-actions class="pa-3 pa-sm-4 bg-surface-header d-flex flex-column flex-sm-row gap-2">
      <v-btn variant="text" color="grey-lighten-1" @click="$emit('clear')" class="w-100 w-sm-auto order-2 order-sm-1">
        Descartar
      </v-btn>
      <v-spacer class="d-none d-sm-block"></v-spacer>
      <v-btn color="#e0b04f" variant="flat" class="text-black font-weight-bold w-100 w-sm-auto order-1 order-sm-2 mb-2 mb-sm-0" @click="$emit('save')">
        <v-icon start>mdi-check</v-icon>
        Simular Guardado
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
});

defineEmits(['clear', 'save']);

const confidenceColor = computed(() => {
  const conf = props.data?.confianza?.toLowerCase();
  if (conf === 'alta') return 'success';
  if (conf === 'media') return 'warning';
  return 'error';
});

function formatNumber(value) {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
</script>

<style scoped>
.text-gold {
  color: #e0b04f !important;
}
.bg-black-transparent {
  background-color: rgba(0, 0, 0, 0.3) !important;
}
.bg-surface-header {
  background-color: rgba(255, 255, 255, 0.02) !important;
}
.bg-total-box {
  background-color: rgba(224, 176, 79, 0.05) !important;
  border: 1px solid rgba(224, 176, 79, 0.2);
}
.border-thin {
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.border-bottom-dashed {
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}
.border-bottom-dashed:last-child {
  border-bottom: none;
}
.json-display {
  background-color: #000;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
  line-height: 1.4;
  font-family: 'Fira Code', monospace;
}
</style>
