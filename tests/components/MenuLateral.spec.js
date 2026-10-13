import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { defineComponent, h } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'

import MenuLateral from '@/components/layout/MenuLateral.vue'

const { VLayout } = components

/**
 * MenuLateral montado con Vuetify 3.9.7 REAL (createVuetify, sin stubs) —
 * requisito explícito de la revisión del shell para el hallazgo #1 Crítico.
 * `AppShell.spec.js` stubbea MenuLateral por completo, así que nunca podía
 * detectar que el drawer se quedaba oculto en escritorio.
 *
 * `VNavigationDrawer` necesita un `VuetifyLayoutKey` inyectado (lo provee
 * `<v-layout>`/`<v-app>`) para calcular su `transform`/`width` reales — por
 * eso se envuelve en `<v-layout>` en vez de montar MenuLateral solo.
 */
function setWidth(width) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

function mountMenu({ width, modelValue = false, modo = 'fijo', role = 'admin', isServicesCompany = false } = {}) {
  setWidth(width)
  const vuetify = createVuetify({ components, directives })

  const Wrapper = defineComponent({
    name: 'MenuLateralTestWrapper',
    props: { modelValue: Boolean, modo: String, role: String, isServicesCompany: Boolean },
    emits: ['update:modelValue', 'logout', 'cambiar-modo'],
    setup(props, { emit }) {
      return () =>
        h(VLayout, null, () =>
          h(MenuLateral, {
            modelValue: props.modelValue,
            modo: props.modo,
            onCambiarModo: (m) => emit('cambiar-modo', m),
            role: props.role,
            isServicesCompany: props.isServicesCompany,
            'onUpdate:modelValue': (v) => emit('update:modelValue', v),
            onLogout: () => emit('logout'),
          })
        )
    },
  })

  return mount(Wrapper, {
    props: { modelValue, modo, role, isServicesCompany },
    global: { plugins: [vuetify], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    attachTo: document.body,
  })
}

/** Dos ticks: el ancho/transform "reales" del layout de Vuetify solo quedan
 *  reflejados en el <nav> después de que `<v-layout>` termine de montarse
 *  (su propio `onMounted` corre DESPUÉS del de MenuLateral) y de un repintado
 *  reactivo adicional. */
async function flush(wrapper) {
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

describe('MenuLateral (Vuetify real, sin stubs)', () => {
  describe('hallazgo #1 Crítico: el drawer no debe quedar oculto en escritorio', () => {
    it('≥1280px (permanent): se activa y empuja el contenido aunque el padre pase modelValue=false', async () => {
      const wrapper = mountMenu({ width: 1400, modelValue: false, role: 'admin' })
      await flush(wrapper)

      const nav = wrapper.get('.v-navigation-drawer')
      expect(nav.classes()).toContain('v-navigation-drawer--active')
      expect(nav.classes()).not.toContain('v-navigation-drawer--temporary')
      // translateX(0px) = visible/empujando; translateX(-256px) = oculto (el bug reportado).
      expect(nav.attributes('style')).toContain('translateX(0px)')
      expect(nav.attributes('style')).not.toMatch(/translateX\(-/)
      expect(nav.attributes('style')).toContain('width: 264px')
    })

    it('≥1280px: también queda activo si el padre todavía no cargó nada (modelValue null/undefined)', async () => {
      const wrapper = mountMenu({ width: 1400, modelValue: undefined, role: 'contador' })
      await flush(wrapper)
      expect(wrapper.get('.v-navigation-drawer').classes()).toContain('v-navigation-drawer--active')
    })

    it('<1280px (temporary): SÍ respeta modelValue — arranca cerrado', async () => {
      const wrapper = mountMenu({ width: 960, modelValue: false, role: 'admin' })
      await flush(wrapper)

      const nav = wrapper.get('.v-navigation-drawer')
      expect(nav.classes()).toContain('v-navigation-drawer--temporary')
      expect(nav.classes()).not.toContain('v-navigation-drawer--active')
    })

    it('<1280px (temporary): abre cuando el padre pone modelValue=true (botón de menú del app bar)', async () => {
      const wrapper = mountMenu({ width: 960, modelValue: true, role: 'admin' })
      await flush(wrapper)
      expect(wrapper.get('.v-navigation-drawer').classes()).toContain('v-navigation-drawer--active')
    })

    it('emite update:modelValue cuando el drawer temporary se cierra (ej. clic en el scrim)', async () => {
      const wrapper = mountMenu({ width: 960, modelValue: true, role: 'admin' })
      await flush(wrapper)
      await wrapper.getComponent(MenuLateral).vm.$emit('update:modelValue', false)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  describe('modos en escritorio: fijo (abierto) y auto (recogido + expandir al pasar el mouse)', () => {
    it("modo 'fijo': 264px, sin rail", async () => {
      const wrapper = mountMenu({ width: 1400, modo: 'fijo', role: 'admin' })
      await flush(wrapper)
      const nav = wrapper.get('.v-navigation-drawer')
      expect(nav.attributes('style')).toContain('width: 264px')
      expect(nav.classes()).not.toContain('v-navigation-drawer--rail')
    })

    it("modo 'auto': rail de 72px con expand-on-hover", async () => {
      const wrapper = mountMenu({ width: 1400, modo: 'auto', role: 'admin' })
      await flush(wrapper)
      const nav = wrapper.get('.v-navigation-drawer')
      expect(nav.classes()).toContain('v-navigation-drawer--rail')
      expect(nav.classes()).toContain('menu-lateral--recogido')
      expect(nav.attributes('style')).toContain('width: 72px')
    })

    it('a <1280px nunca hay rail, sin importar el modo', async () => {
      const wrapper = mountMenu({ width: 960, modo: 'auto', role: 'admin' })
      await flush(wrapper)
      expect(wrapper.get('.v-navigation-drawer').classes()).not.toContain('v-navigation-drawer--rail')
    })

    it('el pin de la cabecera alterna el modo y explica qué hace', async () => {
      const fijo = mountMenu({ width: 1400, modo: 'fijo', role: 'admin' })
      await flush(fijo)
      const boton = fijo.find('[aria-label="Recoger el menú y expandir al pasar el mouse"]')
      expect(boton.exists()).toBe(true)
      await boton.trigger('click')
      expect(fijo.emitted('cambiar-modo')).toEqual([['auto']])
      fijo.unmount()

      const auto = mountMenu({ width: 1400, modo: 'auto', role: 'admin' })
      await flush(auto)
      const botonAuto = auto.find('[aria-label="Dejar el menú siempre abierto"]')
      expect(botonAuto.exists()).toBe(true)
      await botonAuto.trigger('click')
      expect(auto.emitted('cambiar-modo')).toEqual([['fijo']])
      auto.unmount()
    })

    it('el pin no aparece en el drawer temporal (<1280px)', async () => {
      const wrapper = mountMenu({ width: 960, modelValue: true, role: 'admin' })
      await flush(wrapper)
      expect(wrapper.find('.menu-lateral__boton-modo').exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('hallazgo #2 Importante: estilos del rail ya no dependen de scoped CSS roto', () => {
    const fuente = readFileSync(resolve(process.cwd(), 'src/components/layout/MenuLateral.vue'), 'utf-8')
    const { descriptor } = parse(fuente)
    const css = descriptor.styles[0]?.content || ''

    it('el bloque <style> NO es scoped (VNavigationDrawer renderiza un Fragment: scoped nunca llegaría al <nav>)', () => {
      expect(descriptor.styles).toHaveLength(1)
      expect(descriptor.styles[0].scoped).toBeFalsy()
    })

    it('las reglas del modo recogido están acotadas a la clase real del <nav> (.menu-lateral)', () => {
      expect(css).not.toContain(':deep(')
      expect(css).toContain('.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .v-list-item-title')
      expect(css).toContain('.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .v-list-item__spacer')
      expect(css).toContain('.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__header')
    })

    it('respeta prefers-reduced-motion', () => {
      expect(css).toContain('prefers-reduced-motion: reduce')
    })
  })

  describe('contenido según rol', () => {
    it('cliente en xs (<600px) NO se renderiza (usa la barra inferior)', async () => {
      const wrapper = mountMenu({ width: 375, role: 'cliente' })
      await flush(wrapper)
      expect(wrapper.find('.v-navigation-drawer').exists()).toBe(false)
    })

    it('cliente en escritorio SÍ se renderiza, con su propio menú', async () => {
      const wrapper = mountMenu({ width: 1400, role: 'cliente' })
      await flush(wrapper)
      expect(wrapper.get('.v-navigation-drawer').text()).toContain('¿Cómo voy?')
    })

    it('admin ve el grupo "Organización" (v-list-group)', async () => {
      const wrapper = mountMenu({ width: 1400, role: 'admin' })
      await flush(wrapper)
      expect(wrapper.text()).toContain('Organización')
    })

    it('emite "logout" al hacer clic en "Cerrar Sesión"', async () => {
      const wrapper = mountMenu({ width: 1400, role: 'admin' })
      await flush(wrapper)
      const itemLogout = wrapper.findAll('.v-list-item').find((item) => item.text().includes('Cerrar sesión'))
      expect(itemLogout).toBeTruthy()
      await itemLogout.trigger('click')
      expect(wrapper.emitted('logout')).toBeTruthy()
    })
  })
})
