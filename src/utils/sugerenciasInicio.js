/**
 * "Sugerencias para ti" del Inicio: ideas concretas a partir de los datos del
 * negocio, para cuando la persona ya completó los primeros pasos. Función pura
 * (testeable sin Vue). Cada sugerencia: { clave, icono, titulo, detalle,
 * textoBoton, accion: { ruta? | evento? } , prioridad }.
 * Menor prioridad = más importante. Las descartadas (por clave) no se muestran.
 */
import { formatMoney } from './formatMoney'

const RETENCION = (inv) =>
  Number(inv?.retenciones?.iva || 0) + Number(inv?.retenciones?.islr || 0) + Number(inv?.retenciones?.municipal || 0)

/**
 * @param {object} s
 * @param {Array} s.ventasMes       ventas del mes actual (formato invoiceService)
 * @param {Array} s.comprasMes      compras/gastos del mes actual
 * @param {Array} s.todasVentas     todas las ventas (para cuentas por cobrar)
 * @param {number} s.papelesSubidos documentos fiscales subidos (sin papelera)
 * @param {number} s.diaDelMes      1..31 (inyectado para poder probar)
 * @param {{titulo:string, detalle:string}|null} [s.seniatPendiente] declaración de retenciones por hacer (utils/seniat/tarjetas)
 * @param {(n:number)=>number} [s.aUSD] convierte el monto de una factura a USD
 * @param {string[]} [s.descartadas] claves que la persona ocultó
 * @param {number} [s.maximo]       cuántas devolver (por defecto 4)
 */
export function sugerenciasInicio({
  ventasMes = [],
  comprasMes = [],
  todasVentas = [],
  papelesSubidos = 0,
  diaDelMes = 1,
  seniatPendiente = null,
  aUSD = (inv) => Number(inv?.financial?.totalSales || 0),
  descartadas = [],
  maximo = 4,
} = {}) {
  const lista = []

  const sinCategoria = comprasMes.filter((c) => !c.expenseCategory && !c.expense_category_id)
  if (sinCategoria.length > 0) {
    lista.push({
      clave: 'categorizar',
      icono: 'mdi-tag-outline',
      titulo: `Clasifica ${sinCategoria.length === 1 ? '1 gasto' : `${sinCategoria.length} gastos`} sin categoría`,
      detalle: 'Así sabrás en qué se te va el dinero en «¿Cómo voy?».',
      textoBoton: 'Clasificar',
      accion: { ruta: '/cliente/facturacion?tab=compras' },
      prioridad: 20,
    })
  }

  const porCobrar = todasVentas.filter((v) => v.status === 'POR_COBRAR')
  if (porCobrar.length > 0) {
    const total = porCobrar.reduce((suma, v) => suma + aUSD(v), 0)
    lista.push({
      clave: 'cobrar',
      icono: 'mdi-cash-clock',
      titulo: `Te deben ${formatMoney(total, 'USD')}`,
      detalle: `${porCobrar.length === 1 ? '1 venta está' : `${porCobrar.length} ventas están`} por cobrar. Márcalas como pagadas cuando te paguen.`,
      textoBoton: 'Ver ventas',
      accion: { ruta: '/cliente/facturacion?tab=ventas' },
      prioridad: 10,
    })
  }

  if (seniatPendiente) {
    lista.push({
      clave: 'seniat',
      icono: 'mdi-file-send-outline',
      titulo: seniatPendiente.titulo,
      detalle: seniatPendiente.detalle,
      textoBoton: 'Ver SENIAT del mes',
      accion: { ruta: '/cliente/seniat' },
      prioridad: 12,
    })
  }

  const conRetencion = comprasMes.filter((c) => RETENCION(c) > 0)
  if (conRetencion.length > 0) {
    lista.push({
      clave: 'retenciones',
      icono: 'mdi-file-certificate-outline',
      titulo: `Entrega tus ${conRetencion.length === 1 ? 'comprobante' : `${conRetencion.length} comprobantes`} de retención`,
      detalle: 'Este mes retuviste impuestos a tus proveedores. Descarga el comprobante y envíaselo.',
      textoBoton: 'Ver retenciones',
      accion: { ruta: '/cliente/facturacion?tab=retenciones' },
      prioridad: 15,
    })
  }

  if (diaDelMes <= 15) {
    lista.push({
      clave: 'declarar',
      icono: 'mdi-calculator-variant-outline',
      titulo: 'Revisa lo que vas a declarar',
      detalle: 'En la primera quincena se declara el IVA del mes pasado. Mira el estimado en «¿Cómo voy?».',
      textoBoton: 'Ver estimado',
      accion: { ruta: '/cliente/dashboard' },
      prioridad: 25,
    })
  }

  if (comprasMes.length > 0 && ventasMes.length === 0) {
    lista.push({
      clave: 'registrar-ventas',
      icono: 'mdi-cart-plus',
      titulo: 'Registra también tus ventas',
      detalle: 'Este mes solo tienes gastos. Con tus ventas te decimos cuánto te queda.',
      textoBoton: 'Registrar venta',
      accion: { evento: 'registrar-venta' },
      prioridad: 30,
    })
  }

  if (papelesSubidos < 6) {
    lista.push({
      clave: 'expediente',
      icono: 'mdi-folder-plus-outline',
      titulo: 'Completa tu expediente',
      detalle: `Llevas ${papelesSubidos} ${papelesSubidos === 1 ? 'papel' : 'papeles'}. Mientras más subas, más vencimientos te avisamos.`,
      textoBoton: 'Subir papeles',
      accion: { ruta: '/cliente/fiscal-360' },
      prioridad: 35,
    })
  }

  if (diaDelMes >= 25 || diaDelMes <= 3) {
    lista.push({
      clave: 'libros',
      icono: 'mdi-book-arrow-down-outline',
      titulo: 'Pásale tus libros a tu contador',
      detalle: 'Cierre de mes: descarga el libro de compras y ventas en un clic.',
      textoBoton: 'Descargar',
      accion: { ruta: '/cliente/facturacion' },
      prioridad: 28,
    })
  }

  lista.push({
    clave: 'asistente',
    icono: 'mdi-chat-question-outline',
    titulo: '¿Tienes una duda?',
    detalle: 'Pregúntale a nuestro asistente: te responde en segundos, en palabras simples.',
    textoBoton: 'Preguntar',
    accion: { evento: 'abrir-asistente' },
    prioridad: 90,
  })

  return lista
    .filter((s) => !descartadas.includes(s.clave))
    .sort((a, b) => a.prioridad - b.prioridad)
    .slice(0, maximo)
}
