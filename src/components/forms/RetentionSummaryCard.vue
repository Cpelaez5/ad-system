<template>
  <v-card variant="outlined" class="mb-4 bg-grey-lighten-4 rounded-lg border-2">
    <div class="d-flex align-center pa-3" @click="expanded = !expanded" style="cursor: pointer;">
      <v-icon color="primary" class="mr-3">mdi-percent</v-icon>
      <div>
        <div class="text-subtitle-2 font-weight-bold">Retenciones Fiscales</div>
        <div class="text-caption text-grey-darken-1">Configuración aplicada</div>
      </div>
      <v-spacer></v-spacer>
      <v-btn
        variant="tonal"
        color="primary"
        size="small"
        class="mr-2"
        @click.stop="$emit('adjust')"
      >
        Ajustar
      </v-btn>
      <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </div>
    
    <v-expand-transition>
      <div v-show="expanded">
        <v-divider></v-divider>
        <v-list density="compact" class="bg-transparent">
          <v-list-item>
            <template v-slot:prepend>
              <v-icon :color="aplicarIva ? 'success' : 'grey'" class="mr-2">
                {{ aplicarIva ? 'mdi-check-circle' : 'mdi-minus-circle' }}
              </v-icon>
            </template>
            <v-list-item-title>Retención IVA</v-list-item-title>
            <template v-slot:append>
              <span class="text-caption">{{ proveedor?.iva_retention_rate || 0 }}%</span>
            </template>
          </v-list-item>
          
          <v-list-item>
            <template v-slot:prepend>
              <v-icon :color="aplicarIslr ? 'success' : 'grey'" class="mr-2">
                {{ aplicarIslr ? 'mdi-check-circle' : 'mdi-minus-circle' }}
              </v-icon>
            </template>
            <v-list-item-title>Retención ISLR</v-list-item-title>
            <template v-slot:append>
              <span class="text-caption">{{ conceptoIslrNombre || 'N/A' }}</span>
            </template>
          </v-list-item>
          
          <v-list-item>
            <template v-slot:prepend>
              <v-icon :color="aplicarMunicipal ? 'success' : 'grey'" class="mr-2">
                {{ aplicarMunicipal ? 'mdi-check-circle' : 'mdi-minus-circle' }}
              </v-icon>
            </template>
            <v-list-item-title>Retención Municipal</v-list-item-title>
            <template v-slot:append>
              <span class="text-caption">{{ proveedor?.municipal_rate || 0 }}%</span>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script>
export default {
  name: 'RetentionSummaryCard',
  props: {
    proveedor: {
      type: Object,
      default: null
    },
    aplicarIva: {
      type: Boolean,
      default: true
    },
    aplicarIslr: {
      type: Boolean,
      default: true
    },
    aplicarMunicipal: {
      type: Boolean,
      default: true
    },
    conceptoIslrNombre: {
      type: String,
      default: ''
    }
  },
  emits: ['adjust'],
  data() {
    return {
      expanded: false
    }
  }
}
</script>
