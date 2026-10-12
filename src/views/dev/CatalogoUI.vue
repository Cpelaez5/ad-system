<template>
  <v-container class="py-8" style="max-width: 720px">
    <h1 class="mb-1">Catálogo de componentes — AD System</h1>
    <p class="text-medium-emphasis mb-8">
      Página solo para desarrollo. No está en el router — ver instrucciones en
      docs/mvp/diseno/sistema-diseno.md para montarla temporalmente.
    </p>

    <section class="mb-10">
      <h2 class="mb-4">LogoAdSystem</h2>
      <div class="d-flex flex-wrap ga-6 align-center">
        <LogoAdSystem variante="completo" tono="color" />
        <div style="background: #1F355C; padding: 8px; border-radius: 8px;">
          <LogoAdSystem variante="completo" tono="blanco" />
        </div>
        <LogoAdSystem variante="icono" tono="color" :alto="48" />
        <div style="background: #1F355C; padding: 8px; border-radius: 8px;">
          <LogoAdSystem variante="icono" tono="blanco" :alto="48" />
        </div>
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">BotonAccion</h2>
      <div class="d-flex flex-column ga-3">
        <BotonAccion texto="Vendí algo" icono="mdi-cart-outline" variante="primaria" tamano="principal" />
        <BotonAccion texto="Gasté o compré algo" icono="mdi-receipt-text-outline" variante="secundaria" tamano="normal" />
        <BotonAccion texto="Ver detalles" variante="terciaria" tamano="normal" ancho="auto" />
        <BotonAccion texto="Eliminar proveedor" icono="mdi-trash-can-outline" variante="destructiva" tamano="normal" />
        <BotonAccion texto="Guardando..." variante="primaria" tamano="normal" cargando />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">TarjetaAccion</h2>
      <div class="d-flex flex-column ga-3">
        <TarjetaAccion icono="mdi-cart-outline" titulo="Vendí algo" subtitulo="Registra una venta" color="primary" />
        <TarjetaAccion icono="mdi-receipt-text-outline" titulo="Gasté o compré algo" subtitulo="Con o sin factura" color="secondary" />
        <TarjetaAccion icono="mdi-chart-line" titulo="¿Cómo voy?" subtitulo="Tus números del mes" color="success" :mostrar-flecha="false" />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">EstadoVacio</h2>
      <EstadoVacio
        icono="mdi-receipt-text-outline"
        titulo="Este mes todavía no registras nada"
        mensaje="Empieza tocando «Gasté o compré algo»."
        texto-accion="Registrar ahora"
      />
    </section>

    <section class="mb-10">
      <h2 class="mb-4">AvisoAmable</h2>
      <div class="d-flex flex-column ga-3">
        <AvisoAmable tipo="info" mensaje="Dólar BCV hoy: Bs 36,50" />
        <AvisoAmable tipo="advertencia" mensaje="Tu RIF vence en 5 días" texto-accion="Ver" />
        <AvisoAmable tipo="error" mensaje="No pudimos guardar tu registro. Intenta de nuevo." cerrable />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">ResumenMonto</h2>
      <div class="d-flex flex-wrap ga-4">
        <ResumenMonto etiqueta="Vendiste este mes" :monto="1250" :monto-bs="45625000" color="success" />
        <ResumenMonto etiqueta="Gastaste este mes" :monto="830" :monto-bs="30295000" color="error" />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">PasoGuiado</h2>
      <PasoGuiado :paso-actual="2" :total-pasos="3" titulo="Confirma los datos" subtitulo="Revisa antes de guardar" />
    </section>

    <section class="mb-10">
      <h2 class="mb-4">HojaInferior</h2>
      <BotonAccion texto="Abrir hoja inferior" ancho="auto" @click="abierta = true" />
      <HojaInferior v-model="abierta" titulo="Gasté o compré algo">
        <p>Aquí va el contenido del formulario (ej. SimpleInvoiceForm en modo simple).</p>
        <template #acciones>
          <BotonAccion texto="Guardar" tamano="normal" @click="abierta = false" />
        </template>
      </HojaInferior>
    </section>
  </v-container>
</template>

<script>
import LogoAdSystem from '@/components/ui/LogoAdSystem.vue'
import BotonAccion from '@/components/ui/BotonAccion.vue'
import TarjetaAccion from '@/components/ui/TarjetaAccion.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import ResumenMonto from '@/components/ui/ResumenMonto.vue'
import PasoGuiado from '@/components/ui/PasoGuiado.vue'
import HojaInferior from '@/components/ui/HojaInferior.vue'

/**
 * CatalogoUI — vitrina de los componentes de src/components/ui/ para
 * revisarlos en el navegador durante el desarrollo. NO se agrega al
 * router (ver docs/mvp/diseno/sistema-diseno.md para montarla temporal).
 */
export default {
  name: 'CatalogoUI',

  components: {
    LogoAdSystem,
    BotonAccion,
    TarjetaAccion,
    EstadoVacio,
    AvisoAmable,
    ResumenMonto,
    PasoGuiado,
    HojaInferior,
  },

  data() {
    return {
      abierta: false,
    }
  },
}
</script>
