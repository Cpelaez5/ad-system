<template>
  <v-navigation-drawer
    v-if="renderDrawer"
    :model-value="esPermanente ? true : modelValue"
    :permanent="esPermanente"
    :temporary="esTemporal"
    :rail="railActivo"
    :expand-on-hover="railActivo"
    :rail-width="72"
    :width="264"
    color="#0b0b0b"
    theme="dark"
    class="menu-lateral"
    :class="{ 'menu-lateral--recogido': railActivo }"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #prepend>
      <div class="menu-lateral__header">
        <!-- Logo vectorial blanco: completo cuando el menú está abierto, solo el ícono cuando está recogido -->
        <router-link to="/" class="menu-lateral__marca" aria-label="AD System, ir al inicio">
          <LogoAnimado class="menu-lateral__logo-completo" variante="completo" tono="blanco" :alto="28" :reproducir="false" />
          <LogoAnimado class="menu-lateral__logo-icono" variante="icono" tono="blanco" :alto="30" :reproducir="false" />
        </router-link>

        <v-tooltip v-if="esPermanente" location="end" :text="textoBotonModo">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              class="menu-lateral__boton-modo"
              :icon="modo === 'fijo' ? 'mdi-pin' : 'mdi-pin-outline'"
              variant="text"
              size="small"
              :aria-label="textoBotonModo"
              :aria-pressed="modo === 'fijo' ? 'true' : 'false'"
              @click="$emit('cambiar-modo', modo === 'fijo' ? 'auto' : 'fijo')"
            />
          </template>
        </v-tooltip>
      </div>
    </template>

    <v-list density="comfortable" nav class="menu-lateral__lista">
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

        <v-list-item
          v-else
          :to="item.to"
          :prepend-icon="item.icono"
          :title="item.titulo"
          :value="item.key"
        />
      </template>
    </v-list>

    <template #append>
      <v-divider class="menu-lateral__divisor" />
      <div v-if="role === 'cliente'" class="menu-lateral__asistente">
        <TuAsistente variante="compacta" />
      </div>
      <v-list density="comfortable" nav class="menu-lateral__lista">
        <v-list-item prepend-icon="mdi-logout" title="Cerrar sesión" value="logout" @click="$emit('logout')" />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script>
import LogoAnimado from '@/components/ui/LogoAnimado.vue'
import TuAsistente from '@/components/cliente/TuAsistente.vue'
import { getMenuPorRol } from './menuPorRol.js'

/**
 * MenuLateral — drawer de navegación nativo de Vuetify con los ítems de
 * `menuPorRol.js` según el rol.
 *
 * Breakpoints:
 *  - <600px (xs) + rol `cliente`: NO se renderiza (usa la barra inferior).
 *  - <1280px: drawer temporary, abierto por el botón de menú del app bar (`modelValue`).
 *  - ≥1280px: drawer permanent a TODO el alto de la pantalla (AppShell lo registra
 *    antes que la barra superior), con dos modos que elige la persona con el pin
 *    de la cabecera (preferencia persistida por AppShell, como en Norkut):
 *      · 'fijo': abierto, empuja el contenido.
 *      · 'auto': recogido (solo íconos) y se expande al pasar el mouse, por encima
 *        del contenido sin moverlo (`rail` + `expand-on-hover` de Vuetify).
 *
 * Nota (revisión del shell, hallazgo #1): `VNavigationDrawer` solo se autoactiva
 * con `model-value` null; por eso se fuerza `true` cuando es permanente.
 */
export default {
  name: 'MenuLateral',

  components: { LogoAnimado, TuAsistente },

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
    /** Modo en escritorio: 'fijo' (abierto) | 'auto' (recogido, se expande con hover). */
    modo: {
      type: String,
      default: 'fijo',
      validator: (v) => ['fijo', 'auto'].includes(v),
    },
  },

  emits: ['update:modelValue', 'logout', 'cambiar-modo'],

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
      return this.isLgUp && this.modo === 'auto'
    },
    textoBotonModo() {
      return this.modo === 'fijo'
        ? 'Recoger el menú y expandir al pasar el mouse'
        : 'Dejar el menú siempre abierto'
    },
  },
}
</script>

<style>
/* Bloque NO scoped a propósito: VNavigationDrawer renderiza un Fragment como raíz,
   así que el data-v-* de scope nunca llega al <nav>. La clase propia .menu-lateral
   sí llega; cada regla queda acotada a ella y a los modificadores nativos de Vuetify
   (.v-navigation-drawer--rail, --is-hovering). Ver MenuLateral.spec.js. */
.menu-lateral {
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  transition:
    width var(--ad-move-normal) var(--ad-move-curva-entrada),
    box-shadow var(--ad-move-normal) var(--ad-move-curva-entrada) !important;
}

/* Expandido por hover (modo 'auto'): flota sobre el contenido con sombra suave */
.menu-lateral.v-navigation-drawer--rail.v-navigation-drawer--is-hovering {
  box-shadow: 8px 0 24px rgba(0, 0, 0, 0.18) !important;
}

/* ---- Cabecera: mismo alto que la barra superior ---- */
.menu-lateral .menu-lateral__header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px 0 20px;
}

.menu-lateral .menu-lateral__marca {
  display: flex;
  align-items: center;
  min-width: 0;
  text-decoration: none;
}

.menu-lateral .menu-lateral__marca .logo-animado {
  margin: 0 !important;
}

.menu-lateral .menu-lateral__logo-icono,
.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__logo-completo,
.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__boton-modo {
  display: none !important;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__logo-icono {
  display: inline-block !important;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__header {
  justify-content: center;
  padding: 0;
}

.menu-lateral .menu-lateral__boton-modo {
  color: rgba(255, 255, 255, 0.7) !important;
  flex-shrink: 0;
}

/* ---- Ítems: píldora; la activa en granate de marca ---- */
.menu-lateral .menu-lateral__lista {
  padding: 8px 12px !important;
}

.menu-lateral .menu-lateral__lista .v-list-item {
  min-height: 44px !important;
  border-radius: 12px !important;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.78) !important;
  transition: background-color var(--ad-move-rapido) var(--ad-move-curva-entrada);
}

.menu-lateral .menu-lateral__lista .v-list-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.menu-lateral .menu-lateral__lista .v-list-item .v-list-item-title {
  font-size: 0.95rem !important;
  font-weight: 500 !important;
  letter-spacing: 0 !important;
  transition: opacity var(--ad-move-rapido) var(--ad-move-curva-entrada);
}

.menu-lateral .menu-lateral__lista .v-list-item--active {
  background: #8e1818 !important;
  color: #ffffff !important;
}

.menu-lateral .menu-lateral__lista .v-list-item--active > .v-list-item__overlay {
  opacity: 0 !important;
}

.menu-lateral .menu-lateral__lista .v-list-item--active .v-icon {
  color: #ffffff !important;
  opacity: 1 !important;
}

/* Recogido: solo íconos centrados en la píldora (el texto se oculta, no se corta) */
.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__lista {
  padding: 8px 12px !important;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .v-list-item-title {
  opacity: 0;
}

/* El espaciador del ícono (32px) no cabe en la píldora de 48px: sin él, el ícono queda
   centrado (antes se salía 20px a la izquierda y desaparecía). */
.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .v-list-item__spacer {
  display: none !important;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__lista .v-list-item {
  padding-inline: 12px !important;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .v-list-group__header .v-list-item__append {
  display: none;
}

/* Tu asistente (solo cliente): barra fina; recogido, solo el círculo */
.menu-lateral .menu-lateral__asistente {
  padding: 8px 12px 0;
}

.menu-lateral .ta-compacta__circulo {
  display: none;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .ta-compacta__barra {
  display: none;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .ta-compacta__circulo {
  display: flex;
}

.menu-lateral.v-navigation-drawer--rail:not(.v-navigation-drawer--is-hovering) .menu-lateral__asistente {
  padding-inline: 8px;
}

.menu-lateral .menu-lateral__divisor {
  border-color: rgba(255, 255, 255, 0.08) !important;
  opacity: 1;
}

.menu-lateral:not(.v-navigation-drawer--rail) .v-list-group__items .v-list-item {
  padding-left: 32px !important;
}

.menu-lateral::-webkit-scrollbar {
  width: 4px;
}

.menu-lateral::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .menu-lateral,
  .menu-lateral .v-list-item,
  .menu-lateral .v-list-item-title {
    transition: none !important;
  }
}
</style>
