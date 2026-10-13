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
      <h2 class="mb-4">FilaMovimiento</h2>
      <div class="d-flex flex-column ga-2">
        <FilaMovimiento
          quien="Ferretería López C.A."
          subtitulo="RIF J-12345678-9"
          fecha="2026-10-05"
          :monto="1250.5"
          moneda="USD"
          estado="Pagada"
          color-estado="success"
          icono="mdi-arrow-down"
          color-icono="error"
        />
        <FilaMovimiento
          quien="Comercial Reyes"
          fecha="2026-10-01"
          :monto="430"
          moneda="USD"
          estado="Crédito"
          color-estado="warning"
          icono="mdi-arrow-up"
          color-icono="success"
        />
      </div>
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
      <h2 class="mb-4">SelectorPeriodo</h2>
      <SelectorPeriodo v-model="periodoDemo" />
    </section>

    <section class="mb-10">
      <h2 class="mb-4">TarjetaKPI</h2>
      <div class="d-flex flex-wrap ga-4">
        <TarjetaKPI
          etiqueta="Vendí"
          :monto="1250"
          :monto-bs="45625000"
          color="success"
          :variacion="12.4"
          :subir-es-bueno="true"
          etiqueta-periodo-anterior="el mes pasado"
          :indice="0"
        />
        <TarjetaKPI
          etiqueta="Gasté"
          :monto="830"
          :monto-bs="30295000"
          color="error"
          :variacion="12.4"
          :subir-es-bueno="false"
          etiqueta-periodo-anterior="el mes pasado"
          :indice="1"
        />
        <TarjetaKPI
          etiqueta="Me queda"
          :monto="420"
          :monto-bs="15330000"
          color="success"
          :variacion="null"
          :indice="2"
        />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">SeccionPanel + ListaRanking</h2>
      <v-row>
        <v-col cols="12" md="6">
          <SeccionPanel titulo="¿En qué gasto más?" icono="mdi-receipt-text-outline">
            <ListaRanking
              :items="[
                { nombre: 'Mercancía', monto: 300 },
                { nombre: 'Servicios', monto: 150 },
                { nombre: 'Sin categoría', monto: 40 },
              ]"
              color="error"
            />
          </SeccionPanel>
        </v-col>
        <v-col cols="12" md="6">
          <SeccionPanel titulo="¿A quién le vendo más?" icono="mdi-account-group-outline">
            <ListaRanking :items="[]" color="secondary" vacio-texto="Sin ventas registradas en este período." />
          </SeccionPanel>
        </v-col>
      </v-row>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">GraficoBarras</h2>
      <SeccionPanel titulo="Últimos 6 meses" icono="mdi-chart-bar">
        <GraficoBarras
          :labels="['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct']"
          :series="[
            { nombre: 'Vendí', datos: [800, 950, 700, 1100, 900, 1250], color: '#2E7D32' },
            { nombre: 'Gasté', datos: [500, 600, 450, 700, 650, 830], color: '#D32F2F' },
          ]"
          :altura="260"
        />
      </SeccionPanel>
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

    <section class="mb-10">
      <h2 class="mb-4">ChipTasa</h2>
      <div class="d-flex flex-wrap ga-2 align-center">
        <ChipTasa currency="USD" :rate-value="36.5" />
        <ChipTasa currency="EUR" :rate-value="39.1" />
        <ChipTasa currency="USD" loading />
        <ChipTasa currency="USD" error />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-4">EncabezadoPagina</h2>
      <EncabezadoPagina titulo="Mis movimientos" subtitulo="Lo que vendiste y gastaste este mes">
        <BotonAccion texto="Vendí algo" ancho="auto" tamano="normal" />
      </EncabezadoPagina>
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
import SelectorPeriodo from '@/components/ui/SelectorPeriodo.vue'
import TarjetaKPI from '@/components/ui/TarjetaKPI.vue'
import SeccionPanel from '@/components/ui/SeccionPanel.vue'
import ListaRanking from '@/components/ui/ListaRanking.vue'
import GraficoBarras from '@/components/ui/GraficoBarras.vue'
import ChipTasa from '@/components/ui/ChipTasa.vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import FilaMovimiento from '@/components/ui/FilaMovimiento.vue'

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
    SelectorPeriodo,
    TarjetaKPI,
    SeccionPanel,
    ListaRanking,
    GraficoBarras,
    ChipTasa,
    EncabezadoPagina,
    FilaMovimiento,
  },

  data() {
    return {
      abierta: false,
      periodoDemo: 'este_mes',
    }
  },
}
</script>
