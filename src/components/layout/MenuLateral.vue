<template>
  <v-navigation-drawer
    v-if="renderDrawer"
    :model-value="esPermanente ? true : modelValue"
    :permanent="esPermanente"
    :temporary="esTemporal"
    :rail="railActivo"
    color="#010101"
    theme="dark"
    class="menu-lateral animate-slide-in-left"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #prepend>
      <div class="menu-lateral__header">
        <LogoAdSystem variante="icono" tono="blanco" :alto="logoAlto" class="menu-lateral__logo" />
      </div>
    </template>

    <v-divider />

    <v-list density="compact" nav>
      <template v-for="item in items" :key="item.key">
        <v-list-group v-if="item.grupo" :value="item.key">
          <template #activator="{ props: activatorProps }">
            <v-list-item
              v-bind="activatorProps"
              :prepend-icon="item.icono"
              :title="item.titulo"
              :value="item.key"
            />
          </template>
          <v-list-item
            v-for="hijo in item.hijos"
            :key="hijo.key"
            :to="hijo.to"
            :prepend-icon="hijo.icono"
            :title="hijo.titulo"
            :value="hijo.key"
          />
        </v-list-group>

        <v-tooltip v-else :disabled="!railActivo" location="end" :text="item.titulo">
          <template #activator="{ props: tooltipProps }">
            <v-list-item
              v-bind="tooltipProps"
              :to="item.to"
              :prepend-icon="item.icono"
              :title="item.titulo"
              :value="item.key"
            />
          </template>
        </v-tooltip>
      </template>
    </v-list>

    <template #append>
      <v-divider class="mb-1" />
      <v-list density="compact" nav>
        <v-list-item @click="$emit('logout')" prepend-icon="mdi-logout" title="Cerrar Sesión" value="logout" />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script>
import LogoAdSystem from '@/components/ui/LogoAdSystem.vue'
import { getMenuPorRol } from './menuPorRol.js'

/**
 * MenuLateral — reemplaza a Sidebar.vue. Drawer de navegación nativo de
 * Vuetify, con los ítems de `menuPorRol.js` según el rol actual.
 *
 * Breakpoints (unificados para todos los roles, feedback del shell):
 *  - <600px (xs) + rol `cliente`: NO se renderiza (usa la barra inferior).
 *  - <1280px (xs/sm/md, "tablet" + móvil no-cliente): drawer temporary,
 *    abierto por el botón de menú del app bar (`modelValue`).
 *  - ≥1280px (lg+): drawer permanent, empuja el contenido; modo rail
 *    (solo íconos + tooltip) plegable con el botón de `BarraSuperior`
 *    (prop `collapsed`, preferencia persistida por el padre).
 *
 * Corrección (revisión del shell, hallazgo #1 Crítico): `VNavigationDrawer`
 * solo se autoactiva cuando su `model-value` es `null` — con `false` (el
 * valor inicial de `AppShell.drawerOpen`) queda oculto incluso siendo
 * `permanent`, porque el watch de `permanent` solo corre cuando ese prop
 * *cambia*, no al montar ya en escritorio. Por eso el `:model-value` fuerza
 * `true` cuando el drawer es permanente, sin depender del valor que venga
 * del padre (ver MenuLateral.spec.js, "no queda oculto en escritorio").
 */
export default {
  name: 'MenuLateral',

  components: { LogoAdSystem },

  props: {
    /** Abierto/cerrado cuando el drawer es temporary (tablet / móvil no-cliente). */
    modelValue: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: '',
    },
    isServicesCompany: {
      type: Boolean,
      default: false,
    },
    /** Preferencia de modo rail en escritorio (persistida por AppShell). */
    collapsed: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue', 'logout'],

  computed: {
    items() {
      return getMenuPorRol({ role: this.role, isServicesCompany: this.isServicesCompany })
    },
    isLgUp() {
      return this.$vuetify.display.lgAndUp
    },
    isXs() {
      return this.$vuetify.display.xs
    },
    renderDrawer() {
      // El cliente en móvil usa ClienteBottomNav en su lugar (ver AppShell.vue).
      return !(this.role === 'cliente' && this.isXs)
    },
    esPermanente() {
      return this.isLgUp
    },
    esTemporal() {
      return !this.isLgUp
    },
    railActivo() {
      return this.isLgUp && this.collapsed
    },
    logoAlto() {
      return this.railActivo ? 24 : 40
    },
  },
}
</script>

<style>
/* Bloque NO scoped a propósito (revisión del shell, hallazgo #2 Importante):
   `VNavigationDrawer` renderiza un Fragment como raíz, así que el atributo
   `data-v-*` de scope de este componente nunca llega al <nav> real — los
   selectores "deep" (".v-navigation-drawer...") de un `<style scoped>` exigen
   ese atributo como ancestro y por eso nunca aplicaban (11 de 14 reglas
   quedaban muertas, incluida toda la animación del plegado en rail). La
   clase propia `.menu-lateral` SÍ llega al <nav> (Vuetify reenvía `class`
   como prop explícita, no por scopeId), así que cada regla queda acotada a
   ese selector + las clases de modificador nativas de Vuetify
   (`.v-navigation-drawer--rail`), sin depender de scoping. Ver
   MenuLateral.spec.js, "el modo rail aplica sus estilos". */
.menu-lateral {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  transition: width var(--ad-move-normal) var(--ad-move-curva-entrada) !important;
}

.menu-lateral .v-list-item-title {
  transition: opacity var(--ad-move-rapido) var(--ad-move-curva-entrada);
}

.menu-lateral.v-navigation-drawer--rail .v-list-item-title {
  opacity: 0;
}

.menu-lateral .menu-lateral__header {
  padding: 20px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: padding var(--ad-move-normal) var(--ad-move-curva-entrada);
}

.menu-lateral.v-navigation-drawer--rail .menu-lateral__header {
  padding: 10px 0;
}

.menu-lateral .menu-lateral__logo {
  transition: height var(--ad-move-normal) var(--ad-move-curva-entrada);
}

.menu-lateral .v-list-item--active {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white !important;
}

.menu-lateral .v-list-item--active .v-icon {
  color: #e0b04f !important;
}

.menu-lateral.v-navigation-drawer--rail .v-list-item {
  justify-content: center;
}

.menu-lateral::-webkit-scrollbar {
  width: 4px;
}

.menu-lateral::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.menu-lateral:not(.v-navigation-drawer--rail) .v-list-group__items .v-list-item {
  padding-left: 32px;
}

.menu-lateral.v-navigation-drawer--rail .v-list-group__header .v-list-item__append {
  display: none;
}
</style>
