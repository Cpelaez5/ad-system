<template>
  <PantallaError
    numero="403"
    icono="mdi-lock-outline"
    titulo="Esta parte no es para tu cuenta"
    texto="Tu tipo de cuenta no puede ver esta pantalla. Si crees que es un error, escríbele a tu contador o al soporte."
  />
</template>

<script>
import PantallaError from './PantallaError.vue'

export default {
  name: 'SinPermiso',
  components: { PantallaError }
}
</script>
