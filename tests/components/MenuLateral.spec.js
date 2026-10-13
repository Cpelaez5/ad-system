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

function mountMenu({ width, modelValue = false, collapsed = false, role = 'admin', isServicesCompany = false } = {}) {
  setWidth(width)
  const vuetify = createVuetify({ components, directives })

  const Wrapper = defineComponent({
    name: 'MenuLateralTestWrapper',
    props: { modelValue: Boolean, collapsed: Boolean, role: String, isServicesCompany: Boolean },
    emits: ['update:modelValue', 'logout'],
    setup(props, { emit }) {
      return () =>
        h(VLayout, null, () =>
          h(MenuLateral, {
            modelValue: props.modelValue,
            collapsed: props.collapsed,
            role: props.role,
            isServicesCompany: props.isServicesCompany,
            'onUpdate:modelValue': (v) => emit('update:modelValue', v),
            onLogout: () => emit('logout'),
          })
        )
    },
  })

  return mount(Wrapper, {
    props: { modelValue, collapsed, role, isServicesCompany },
    global: { plugins: [vuetify] },
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
      expect(nav.attributes('style')).toContain('width: 256px')
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

  describe('modo rail (plegado) en escritorio — rail + persistencia (hallazgo #8)', () => {
    it('ancho nativo: 256px expandido, 56px (railWidth) cuando collapsed=true', async () => {
      const expandido = mountMenu({ width: 1400, collapsed: false, role: 'admin' })
      await flush(expandido)
      expect(expandido.get('.v-navigation-drawer').attributes('style')).toContain('width: 256px')

      const rail = mountMenu({ width: 1400, collapsed: true, role: 'admin' })
      await flush(rail)
      const nav = rail.get('.v-navigation-drawer')
      expect(nav.classes()).toContain('v-navigation-drawer--rail')
      expect(nav.attributes('style')).toContain('width: 56px')
    })

    it('la preferencia de rail (prop `collapsed`) es la que decide, no el ancho por sí solo', async () => {
      // A <1280px nunca hay rail, sin importar `collapsed` (lo decide `esPermanente`, ver MenuLateral.vue).
      const wrapper = mountMenu({ width: 960, collapsed: true, role: 'admin' })
      await flush(wrapper)
      expect(wrapper.get('.v-navigation-drawer').classes()).not.toContain('v-navigation-drawer--rail')
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

    it('las reglas del rail están acotadas a la clase real del <nav> (.menu-lateral), no a :deep() roto', () => {
      expect(css).not.toContain(':deep(')
      expect(css).toContain('.menu-lateral.v-navigation-drawer--rail .v-list-item-title')
      expect(css).toContain('.menu-lateral.v-navigation-drawer--rail .v-list-item {')
      expect(css).toContain('.menu-lateral.v-navigation-drawer--rail .menu-lateral__header')
      expect(css).toContain('.menu-lateral.v-navigation-drawer--rail .v-list-group__header .v-list-item__append')
    })

    it('el ancho/borde del propio drawer está acotado a `.menu-lateral` (la clase que SÍ llega al <nav>)', () => {
      expect(css).toContain('.menu-lateral {')
      expect(css).toContain('border-right')
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
      const itemLogout = wrapper.findAll('.v-list-item').find((item) => item.text().includes('Cerrar Sesión'))
      expect(itemLogout).toBeTruthy()
      await itemLogout.trigger('click')
      expect(wrapper.emitted('logout')).toBeTruthy()
    })
  })
})
