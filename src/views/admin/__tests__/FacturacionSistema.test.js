/**
 * Tests unitarios para el Módulo de Facturación del Sistema (Super Admin)
 * 
 * Cubre:
 * - Renderizado inicial y cálculo de métricas financieras
 * - Navegación entre pestañas (Facturas vs Pagos Reportados)
 * - Funcionalidad de Aprobación de Pagos
 */

import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import FacturacionSistema from '../FacturacionSistema.vue'

vi.mock('@/lib/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
      },
      functions: {
        invoke: vi.fn()
      }
    }
  }
})

vi.mock('@/services/billingService', () => {
  return {
    default: {
      getAllInvoices: vi.fn(),
      getPaymentReports: vi.fn(),
      getPaymentMethods: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getClientsForBilling: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getBalance: vi.fn(),
      approvePayment: vi.fn(),
      rejectPayment: vi.fn()
    }
  }
})

vi.mock('@/services/plansService', () => {
  return {
    default: {
      getPlans: vi.fn().mockResolvedValue([])
    }
  }
})

import billingService from '@/services/billingService'
import plansService from '@/services/plansService'

// Configuramos stubs para aislar Vuetify y evitar errores de renderizado
const globalConfig = {
  stubs: {
    'v-container': { template: '<div class="v-container"><slot /></div>' },
    'v-row': { template: '<div class="v-row"><slot /></div>' },
    'v-col': { template: '<div class="v-col"><slot /></div>' },
    'v-card': { template: '<div class="v-card"><slot /></div>' },
    'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
    'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
    'v-card-actions': { template: '<div class="v-card-actions"><slot /></div>' },
    'v-icon': { template: '<i><slot /></i>' },
    'v-chip': { template: '<span class="v-chip"><slot /></span>' },
    'v-chip-group': { template: '<div class="v-chip-group"><slot /></div>', props: ['modelValue'] },
    'v-btn': { template: '<button class="v-btn" @click="$emit(\'click\')" :title="title"><slot /></button>', props: ['title'] },
    'v-divider': { template: '<hr />' },
    'v-spacer': { template: '<span></span>' },
    'v-tabs': { template: '<div class="v-tabs"><slot /></div>', props: ['modelValue'] },
    'v-tab': { template: '<div class="v-tab"><slot /></div>', props: ['value'] },
    'v-tabs-window': { template: '<div class="v-tabs-window"><slot /></div>', props: ['modelValue'] },
    'v-tabs-window-item': { template: '<div class="v-tabs-window-item" v-show="true"><slot /></div>', props: ['value'] },
    'v-badge': { template: '<span class="v-badge"><slot /></span>', props: ['content'] },
    'v-data-table': { 
      template: '<div class="v-data-table"><slot name="item.invoice_number" :item="items[0]" v-if="items && items.length > 0" /><slot name="item.status" :item="items[0]" v-if="items && items.length > 0" /><slot name="item.actions" :item="items[0]" v-if="items && items.length > 0" /></div>', 
      props: ['items'] 
    },
    'v-text-field': { template: '<input class="v-text-field" />', props: ['modelValue'] },
    'v-progress-circular': { template: '<div class="v-progress-circular"></div>' },
    'v-dialog': { template: '<div class="v-dialog" v-if="modelValue"><slot /></div>', props: ['modelValue'] },
    'v-form': { template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>' },
    'v-textarea': { template: '<textarea></textarea>', props: ['modelValue'] },
    'v-file-input': { template: '<input type="file" />' },
    'v-snackbar': { template: '<div class="v-snackbar"><slot /></div>', props: ['modelValue'] },
    'v-alert': { template: '<div class="v-alert"><slot /></div>' },
    'v-img': { template: '<img />' },
    'v-switch': { template: '<input type="checkbox" />', props: ['modelValue'] },
    'v-autocomplete': { template: '<select></select>', props: ['modelValue'] },
    'v-select': { template: '<select></select>', props: ['modelValue'] },
    'v-checkbox': { template: '<input type="checkbox" />', props: ['modelValue'] }
  },
  mocks: {
    $route: { query: {} }
  }
}

describe('FacturacionSistema.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Retornamos data simulada para que el componente monte correctamente
    billingService.getAllInvoices.mockResolvedValue({
      success: true,
      data: [
        { id: '1', invoice_number: 'INV-101', amount: 100, status: 'paid' },
        { id: '2', invoice_number: 'INV-102', amount: 50, status: 'pending' },
        { id: '3', invoice_number: 'INV-103', amount: 200, status: 'overdue' }
      ]
    })
    
    billingService.getPaymentReports.mockResolvedValue({
      success: true,
      data: [
        { id: 'p1', amount: 50, status: 'pending_review', invoice_id: '2' }
      ]
    })

    billingService.getBalance.mockResolvedValue({
      success: true,
      data: {
        totalFacturado: 350,
        totalPagado: 100,
        totalPendiente: 50,
        totalVencido: 200
      }
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Carga y KPIs
  // ═════════════════════════════════════════════════════════════
  it('carga facturas y calcula los totales correctamente (KPIs)', async () => {
    const wrapper = mount(FacturacionSistema, { global: globalConfig })
    
    // Esperar a que se resuelvan las promesas en onMounted
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Total Facturado (100 + 50 + 200) = 350
    // Pagado = 100
    // Pendiente = 50
    // Vencido = 200
    // Comprobamos que existan en el DOM. El componente formatea (ej: 350.00)
    const text = wrapper.text()
    
    expect(billingService.getAllInvoices).toHaveBeenCalled()
    expect(text).toContain('350')
    expect(text).toContain('100')
    expect(text).toContain('50')
    expect(text).toContain('200')
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: Interacción y Cambio de Pestañas
  // ═════════════════════════════════════════════════════════════
  it('permite cambiar a la pestaña de reportes de pago y muestra el botón aprobar', async () => {
    const wrapper = mount(FacturacionSistema, { global: globalConfig })
    await new Promise(resolve => setTimeout(resolve, 100))

    // Cambiar la pestaña forzando el modelo
    wrapper.vm.activeTab = 'reports'
    await wrapper.vm.$nextTick()
    
    // En la vista de 'reports', el slot de actions renderiza botones de Aprobar/Rechazar si está pendiente
    // El v-data-table en nuestro stub va a renderizar el slot item.actions usando el primer item de la lista
    const html = wrapper.html()
    
    // El v-btn (Aprobar Pago) debería existir en el código renderizado por el slot de actions del reporte
    // (Aprobar y Rechazar)
    expect(html).toContain('Aprobar')
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 3: Flujo de Aprobación
  // ═════════════════════════════════════════════════════════════
  it('llama al servicio de aprobación cuando se aprueba un pago', async () => {
    const wrapper = mount(FacturacionSistema, { global: globalConfig })
    await new Promise(resolve => setTimeout(resolve, 100))
    
    billingService.approvePayment.mockResolvedValue({ success: true })

    // Simulamos la confirmación del pago en la interfaz
    wrapper.vm.actionReport = { id: 'p1', status: 'pending_review' }
    await wrapper.vm.approvePayment()
    
    expect(billingService.approvePayment).toHaveBeenCalledWith('p1', 'test-user', expect.any(Object))
  })
})
