import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VistaPreviaSelloFirma from '@/components/cliente/VistaPreviaSelloFirma.vue'

const montar = (props = {}) => mount(VistaPreviaSelloFirma, {
  props: { sealUrl: 'https://x/sello.png', signatureUrl: 'https://x/firma.png', ...props },
  global: { plugins: [createVuetify({ components, directives })] },
})
const ultimo = (w) => w.emitted('update:ajustes').at(-1)[0]

describe('VistaPreviaSelloFirma — ajustes', () => {
  it('las flechas mueven el sello de 2 en 2 mm', async () => {
    const w = montar()
    await w.find('[data-testid="ajuste-derecha"]').trigger('click')
    expect(ultimo(w).sello).toEqual({ escala: 1, dx: 2, dy: 0 })
    await w.setProps({ ajustes: ultimo(w) })
    await w.find('[data-testid="ajuste-arriba"]').trigger('click')
    expect(ultimo(w).sello).toEqual({ escala: 1, dx: 2, dy: -2 })
    expect(ultimo(w).firma).toEqual({ escala: 1, dx: 0, dy: 0 })
  })

  it('la posición del sello en la vista sale de la misma función que el PDF', async () => {
    const w = montar({ ajustes: { sello: { escala: 1, dx: 4, dy: 0 }, firma: { escala: 1, dx: 0, dy: 0 } } })
    const estilo = w.vm.estilo('sello')
    // línea en x = 10 mm de la vista; el sello empieza 10 mm después, más 4 mm de ajuste
    expect(estilo.left).toBe('calc(var(--mm) * 24.00)')
    expect(estilo.top).toBe('calc(var(--mm) * 16.00)')
  })

  it('restablecer vuelve a tamaño 1 y sin desplazamiento', async () => {
    const w = montar({ ajustes: { sello: { escala: 1.4, dx: 6, dy: -4 }, firma: { escala: 1, dx: 0, dy: 0 } } })
    w.vm.restablecer()
    expect(ultimo(w).sello).toEqual({ escala: 1, dx: 0, dy: 0 })
  })

  it('el PDF de ejemplo recibe los ajustes en pantalla', () => {
    const ajustes = { sello: { escala: 1.2, dx: 0, dy: 0 }, firma: { escala: 1, dx: 0, dy: 0 } }
    const w = montar({ ajustes })
    expect(w.vm.configElegida.ajustes.sello.escala).toBe(1.2)
  })
})
