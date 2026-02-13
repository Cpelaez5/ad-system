<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900px"
    persistent
  >
    <v-card class="inventory-adjustment-dialog">
      <v-card-title class="bg-primary text-white d-flex align-center py-3">
        <v-icon start icon="mdi-robot" class="mr-2" />
        <span class="text-h6 font-weight-bold">
          Asistente de Inventario IA
        </span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" @click="close" />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-stepper v-model="step" class="elevation-0">
          <v-stepper-header>
            <v-stepper-item title="Cargar Imagen" :value="1" :complete="step > 1" />
            <v-divider />
            <v-stepper-item title="Revisar Items" :value="2" :complete="step > 2" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- PASO 1: CARGA -->
            <v-stepper-window-item :value="1">
              <v-container class="pa-6">
                <div class="text-center mb-6">
                  <h3 class="text-h6 mb-2">Carga una foto de tu lista o estante</h3>
                  <p class="text-body-2 text-grey">
                    La IA identificará los productos y cantidades automáticamente.
                    Soporta listas manuscritas, notas de entrega y fotos de productos.
                  </p>
                </div>

                <FiscalFileUpload
                    @file-selected="handleFileSelect"
                    :loading="analyzing"
                    loading-message="La IA está leyendo tu lista..."
                    accept="image/jpeg,image/png,image/jpg"
                />

                <v-alert
                  v-if="error"
                  type="error"
                  variant="tonal"
                  class="mt-4"
                  closable
                  @click:close="error = null"
                >
                  {{ error }}
                </v-alert>
              </v-container>
            </v-stepper-window-item>

            <!-- PASO 2: REVISIÓN -->
            <v-stepper-window-item :value="2">
              <v-container class="pa-4">
                <v-row align="center" class="mb-2">
                  <v-col>
                    <div class="text-subtitle-1 font-weight-bold">
                      Items Detectados ({{ items.length }})
                    </div>
                  </v-col>
                  <v-col cols="auto">
                     <v-btn size="small" prepend-icon="mdi-plus" variant="text" @click="addItem">
                       Agregar Manual
                     </v-btn>
                  </v-col>
                </v-row>

                <!-- Tipo de Movimiento Global -->
                <v-card variant="outlined" class="mb-4 pa-3 bg-grey-lighten-4">
                    <v-row align="center" dense>
                        <v-col cols="12" sm="4">
                            <v-select
                                v-model="globalMovementType"
                                label="Tipo de Movimiento"
                                :items="movementTypes"
                                density="compact"
                                variant="outlined"
                                hide-details
                            ></v-select>
                        </v-col>
                        <v-col cols="12" sm="8">
                            <span class="text-caption text-grey-darken-1">
                                {{ movementDescription }}
                            </span>
                        </v-col>
                    </v-row>
                </v-card>

                <div class="items-table-container">
                    <v-table density="compact" hover>
                      <thead>
                        <tr>
                          <th style="width: 40%">Producto Detectado / Asignado</th>
                          <th style="width: 15%">Cant.</th>
                          <th style="width: 15%">Unidad</th>
                          <th style="width: 10%">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, index) in items" :key="index" :class="{'bg-green-lighten-5': item.matchedProduct}">
                          <td>
                            <!-- Si no hay match, mostramos texto detectado + buscador -->
                             <div class="d-flex flex-column py-2">
                                <span v-if="item.originalName" class="text-caption text-grey mb-1">
                                    Detectado: "{{ item.originalName }}"
                                </span>
                                <ProductAutocomplete
                                    v-model="item.matchedProduct"
                                    :label="item.matchedProduct ? '' : 'Buscar coincidencia...'"
                                    density="compact"
                                    variant="underlined"
                                    :client-id="clientId"
                                    hide-details
                                    auto-select-first
                                    return-object
                                    @update:model-value="onProductMatch(item)"
                                />
                             </div>
                          </td>
                          <td>
                            <v-text-field
                                v-model.number="item.quantity"
                                type="number"
                                density="compact"
                                variant="underlined"
                                hide-details
                                min="0"
                            ></v-text-field>
                          </td>
                          <td>
                             <span class="text-caption">{{ item.unit || 'Und' }}</span>
                          </td>
                          <td>
                            <v-btn icon="mdi-delete" size="x-small" color="grey" variant="text" @click="removeItem(index)"></v-btn>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                </div>

                <v-alert
                    v-if="unmatchedItemsCount > 0"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mt-4"
                >
                    Hay <strong>{{ unmatchedItemsCount }}</strong> items sin asignar a productos del inventario. Debes seleccionarlos o eliminarlos.
                </v-alert>

              </v-container>
            </v-stepper-window-item>
          </v-stepper-window>

          <v-divider />

          <v-card-actions class="pa-4">
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-spacer />
            <v-btn
                v-if="step === 2"
                variant="text"
                @click="step = 1"
                class="mr-2"
            >
                Atrás
            </v-btn>
            <v-btn
                v-if="step === 2"
                color="primary"
                variant="elevated"
                @click="confirmAdjustment"
                :loading="processing"
                :disabled="unmatchedItemsCount > 0 || items.length === 0"
            >
                Confirmar Consumo
            </v-btn>
          </v-card-actions>
        </v-stepper>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import FiscalFileUpload from '@/components/fiscal/FiscalFileUpload.vue'
import ProductAutocomplete from '@/components/common/ProductAutocomplete.vue'
import inventoryOCRService from '@/services/inventoryOCRService'
import inventoryService from '@/services/inventoryService'
import { getCurrentClientId } from '@/utils/tenantHelpers'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'saved'])

// State
const step = ref(1)
const analyzing = ref(false)
const processing = ref(false)
const error = ref(null)
const items = ref([])
const globalMovementType = ref('OUT_SELF_CONSUMPTION')

// Constants
const movementTypes = [
    { title: 'Autoconsumo / Merma', value: 'OUT_SELF_CONSUMPTION' },
    { title: 'Ajuste de Entrada (+)', value: 'ADJUSTMENT_IN' }, // Custom logic needed
    { title: 'Ajuste de Salida (-)', value: 'ADJUSTMENT_OUT' },
    { title: 'Re-stock (Compra Simple)', value: 'IN_PURCHASE' }
]

const movementDescription = computed(() => {
    switch(globalMovementType.value) {
        case 'OUT_SELF_CONSUMPTION': return 'Salida de inventario para uso interno o merma.'
        case 'ADJUSTMENT_IN': return 'Entrada manual para corregir diferencias.'
        case 'ADJUSTMENT_OUT': return 'Salida manual para corregir diferencias.'
        case 'IN_PURCHASE': return 'Entrada por compra (sin factura fiscal detallada).'
        default: return ''
    }
})

const clientId = computed(() => getCurrentClientId())

const unmatchedItemsCount = computed(() => {
    return items.value.filter(i => !i.matchedProduct).length
})

// Methods
const close = () => {
    emit('update:modelValue', false)
    reset()
}

const reset = () => {
    step.value = 1
    items.value = []
    error.value = null
    analyzing.value = false
}

const handleFileSelect = async (file) => {
    analyzing.value = true
    error.value = null
    
    try {
        const data = await inventoryOCRService.analyzeImage(file)
        
        // Mapear items detectados
        const detectedItems = data.items || []
        
        // Intentar auto-match
        const processedItems = await Promise.all(detectedItems.map(async (item) => {
            let matchedProduct = null
            
            // Búsqueda simple por nombre o código
            if (item.code || item.name) {
                const search = item.code || item.name
                const results = await inventoryService.getProducts({ 
                    search, 
                    limit: 1, 
                    clientId: clientId.value 
                })
                if (results && results.length > 0) {
                    matchedProduct = results[0]
                }
            }
            
            return {
                originalName: item.name,
                quantity: item.quantity || 1,
                unit: item.unit,
                matchedProduct
            }
        }))
        
        items.value = processedItems
        
        if (items.value.length === 0) {
            error.value = "No se detectaron items. Intenta agregar manualmente."
        }
        
        step.value = 2
        
    } catch (e) {
        console.error(e)
        error.value = "Error analizando la imagen. Intenta nuevamente."
    } finally {
        analyzing.value = false
    }
}

const addItem = () => {
    items.value.push({
        originalName: '',
        quantity: 1,
        unit: 'Und',
        matchedProduct: null
    })
}

const removeItem = (index) => {
    items.value.splice(index, 1)
}

const onProductMatch = (item) => {
    // Si seleccionó un producto, podríamos actualizar la unidad si la tiene
    if (item.matchedProduct) {
        // item.unit = item.matchedProduct.unit || 'Und'
    }
}

const confirmAdjustment = async () => {
    processing.value = true
    try {
        // Procesar todos los movimientos
        for (const item of items.value) {
            if (!item.matchedProduct) continue;
            
            // Determinar tipo real y signo
            let type = globalMovementType.value
            let qty = Math.abs(item.quantity)
            let isNegative = false // Para ADJ
            
            if (type === 'ADJUSTMENT_IN') {
                type = 'ADJUSTMENT'
                isNegative = false
            } else if (type === 'ADJUSTMENT_OUT') {
                type = 'ADJUSTMENT'
                isNegative = true
            }
            
            await inventoryService.registerMovement({
                product_id: item.matchedProduct.id,
                movement_type: type,
                quantity: qty,
                is_negative: isNegative,
                description: `IA Autoconsumo: ${item.originalName || 'Manual'}`,
                reference_id: null // No hay factura explícita
            })
        }
        
        emit('saved')
        close()
        
    } catch (e) {
        console.error(e)
        // Show snackbar ideally
        error.value = "Error guardando movimientos."
    } finally {
        processing.value = false
    }
}
</script>

<style scoped>
.inventory-adjustment-dialog {
    border-radius: 12px;
    overflow: hidden;
}
.items-table-container {
    max-height: 400px;
    overflow-y: auto;
}
</style>
