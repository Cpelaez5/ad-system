import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import FiscalPeriodTracker from '../FiscalPeriodTracker.vue'

// Omitimos los warnings de Vuetify por iconos faltantes o directivas
// Configuramos stubs que rendericen su contenido (slots) para poder buscar elementos anidados
const globalConfig = {
  stubs: {
    'v-card': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-icon': { template: '<i v-bind="$attrs"><slot /></i>' },
    'v-chip': { template: '<span v-bind="$attrs"><slot /></span>' },
    'v-list': { template: '<ul v-bind="$attrs"><slot /></ul>' },
    'v-list-item': { template: '<li v-bind="$attrs"><slot name="prepend"/><slot /><slot name="append"/></li>' },
    'v-list-item-title': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-list-item-subtitle': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-divider': { template: '<hr v-bind="$attrs" />' },
    'v-avatar': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-btn': { template: '<button v-bind="$attrs"><slot /></button>' },
    'v-tooltip': { template: '<div v-bind="$attrs"><slot name="activator" :props="{}" /></div>' }
  },
  directives: {
    tooltip: () => {}
  }
}

describe('FiscalPeriodTracker.vue', () => {
  beforeEach(() => {
    // Fijar la fecha actual a Agosto 2026 para que el 'año actual' siempre sea 2026
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 26)) // 26 de Agosto de 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Para frecuencia ANUAL, muestra el botón Subir en el año actual', async () => {
    const wrapper = mount(FiscalPeriodTracker, {
      props: {
        type: { id: 'RUPDAE', label: 'RUPDAE', frequency: 'ANNUAL', required: true },
        category: 'OTROS',
        documents: [], // Sin documentos subidos aún
        year: 2026 // Año seleccionado igual al año actual
      },
      global: globalConfig
    })

    // Accedemos a la propiedad computada 'periods' expuesta por setup()
    // En test-utils con script setup, las propiedades expuestas no siempre están directamente en wrapper.vm 
    // a menos que se use defineExpose. Como no usa defineExpose, podemos verificar el template.
    
    // El template de un período sin documento que permite subir renderiza el btn "Subir"
    // Buscamos si existe un stub de v-btn con texto "Subir" o si NO existe el texto "Próximo" para el período.
    
    // Render HTML del stub (ya que stubs de v-btn no muestran su inner text a menos que se defina)
    // Stubs en vue-test-utils se pueden buscar por el nombre de la etiqueta original
    const buttons = wrapper.findAll('button')
    const subirBtn = buttons.find(b => b.text().includes('Subir') || b.attributes('prepend-icon') === 'mdi-upload')
    
    expect(subirBtn).toBeTruthy()
    expect(subirBtn.attributes('prepend-icon')).toBe('mdi-upload')
    
    // Verificamos que NO muestre el chip "Próximo" para el año en curso
    const chips = wrapper.findAll('span')
    const proximoChip = chips.find(c => c.text().includes('Próximo'))
    expect(proximoChip).toBeFalsy()
  })

  it('Para frecuencia ANUAL, oculta el botón Subir y muestra Próximo para años futuros', async () => {
    const wrapper = mount(FiscalPeriodTracker, {
      props: {
        type: { id: 'RUPDAE', label: 'RUPDAE', frequency: 'ANNUAL', required: true },
        category: 'OTROS',
        documents: [],
        year: 2027 // Año seleccionado en el futuro
      },
      global: globalConfig
    })

    const buttons = wrapper.findAll('button')
    const subirBtn = buttons.find(b => b.attributes('prepend-icon') === 'mdi-upload')
    
    expect(subirBtn).toBeFalsy() // No debe haber botón de subir
    
    // Debe mostrar el chip "Próximo"
    const chips = wrapper.findAll('span')
    const proximoChip = chips.find(c => c.text().includes('Próximo'))
    expect(proximoChip).toBeTruthy()
  })

  it('Para frecuencia MENSUAL, permite subir en el mes actual', async () => {
    const wrapper = mount(FiscalPeriodTracker, {
      props: {
        type: { id: 'IVA', label: 'IVA', frequency: 'MONTHLY', required: true },
        category: 'SENIAT',
        documents: [],
        year: 2026 // Año actual
      },
      global: globalConfig
    })

    // Agosto es el mes 7 (0-indexed). Verificamos que el botón de subir exista para agosto.
    // Hay 12 períodos. Los meses hasta Agosto (incluido) deben permitir subir.
    const buttons = wrapper.findAll('button').filter(b => b.attributes('prepend-icon') === 'mdi-upload')
    
    // De Enero (0) a Agosto (7) hay 8 meses. Así que deben haber 8 botones "Subir".
    // De Septiembre (8) a Diciembre (11) son 4 meses en el futuro ("Próximo").
    expect(buttons.length).toBe(8)
    
    const chips = wrapper.findAll('span').filter(c => c.text().includes('Próximo'))
    expect(chips.length).toBe(4)
  })
})
