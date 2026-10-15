<template>
  <PantallaError
    numero="404"
    icono="mdi-compass-outline"
    titulo="No encontramos esta página"
    texto="Puede que el enlace esté viejo o que la dirección tenga un error. Vuelve a tu inicio y sigue desde ahí."
  />
</template>

<script>
import PantallaError from './PantallaError.vue'

export default {
  name: 'NoEncontrada',
  components: { PantallaError }
}
</script>
