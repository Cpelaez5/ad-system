/**
 * Plantilla de importación por rubro (.xlsx), generada en el navegador con
 * exceljs (import dinámico para no engordar el bundle inicial).
 * Hojas: "Productos" (encabezados + ejemplos), "Instrucciones" (cada columna en llano).
 */
import { RUBROS, camposDe, CAMPOS_SERVICIO } from '@/constants/rubros.js'

const BASE_PRODUCTO = [
  { clave: 'tipo', titulo: 'Tipo', ayuda: 'Escribe Producto o Servicio. Si lo dejas vacío, será Producto.', ancho: 12 },
  { clave: 'nombre', titulo: 'Nombre', ayuda: 'Obligatorio. Cómo quieres ver este producto en tu lista.', ancho: 30 },
  { clave: 'codigo', titulo: 'Código', ayuda: 'Tu código o SKU. Si ya existe en tu lista, ese producto se actualiza en vez de repetirse.', ancho: 14 },
  { clave: 'codigo_barras', titulo: 'Código de barras', ayuda: 'El número de las barras (opcional). También sirve para reconocer productos que ya tienes.', ancho: 18 },
  { clave: 'categoria', titulo: 'Categoría', ayuda: 'Para agrupar, por ejemplo: Víveres, Bebidas.', ancho: 16 },
  { clave: 'marca', titulo: 'Marca', ayuda: 'Opcional.', ancho: 14 },
  { clave: 'precio', titulo: 'Precio', ayuda: 'Precio de venta. Puedes escribir 10, 10,50 o $10.', ancho: 11 },
  { clave: 'moneda', titulo: 'Moneda', ayuda: 'Bs, USD o EUR. Si lo dejas vacío usamos la moneda que elijas al importar.', ancho: 10 },
  { clave: 'iva', titulo: 'IVA', ayuda: 'General (16%), Reducido (8%), Lujo (15%) o Exento.', ancho: 11 },
  { clave: 'unidad', titulo: 'Unidad', ayuda: 'UND, KG, LTS, MTS, CAJA o BULTO. Si lo dejas vacío será UND.', ancho: 10 },
  { clave: 'costo', titulo: 'Costo', ayuda: 'Lo que te cuesta a ti. Solo productos.', ancho: 11 },
  { clave: 'existencias', titulo: 'Existencias', ayuda: 'Cuántas unidades tienes hoy. Solo se aplican a productos nuevos; los que ya tienes no se tocan.', ancho: 13 },
  { clave: 'existencias_minimas', titulo: 'Existencias mínimas', ayuda: 'Te avisamos cuando queden menos que esto.', ancho: 20 },
  { clave: 'descripcion', titulo: 'Descripción', ayuda: 'Opcional.', ancho: 30 },
]
const SOLO_PRODUCTO = new Set(['codigo_barras', 'marca', 'unidad', 'costo', 'existencias', 'existencias_minimas'])

/** Ejemplos propios de cada rubro: [nombre, precio, categoría, valores de campos del rubro]. */
const EJEMPLOS = {
  bodega: [['Harina de maíz 1 kg', 2.5, 'Víveres', { presentacion: '1 kg', vencimiento: '2027-06-30' }], ['Aceite 900 ml', 4.2, 'Víveres', { presentacion: '900 ml' }]],
  farmacia: [['Acetaminofén 500 mg', 3.1, 'Analgésicos', { principio_activo: 'Acetaminofén', presentacion: 'Caja de 20', laboratorio: 'Genérico', vencimiento: '2027-03-31', requiere_recipe: 'No' }]],
  moda: [['Camisa manga larga', 18, 'Camisas', { talla: 'M', color: 'Azul', genero: 'Caballero' }], ['Zapatos casuales', 35, 'Calzado', { talla: '40', color: 'Negro', genero: 'Dama' }]],
  ferreteria: [['Tornillo punta fina', 0.15, 'Tornillería', { medida: '1 1/2"', material: 'Acero' }], ['Cemento gris 42 kg', 9, 'Construcción', { medida: '42 kg' }]],
  electronica: [['Cargador USB-C 20 W', 12, 'Accesorios', { modelo: 'C20', garantia_meses: 6, color: 'Blanco' }]],
  comida: [['Pan de jamón', 6, 'Panadería', { porcion: 'Familiar', alergenos: 'Gluten' }]],
  papeleria: [['Cuaderno 100 hojas', 2, 'Cuadernos', { presentacion: 'Unidad', color: 'Rojo' }]],
  mascotas: [['Alimento para perros 1 kg', 5, 'Alimentos', { especie: 'Perro', presentacion: '1 kg' }]],
  belleza: [['Shampoo 400 ml', 7, 'Cabello', { presentacion: '400 ml', tono: 'Neutro' }]],
  servicios: [['Asesoría por hora', 25, 'Asesorías', { se_cobra_por: 'Hora', modalidad: 'En línea' }], ['Instalación', 40, 'Instalaciones', { se_cobra_por: 'Servicio', duracion: '2 horas', modalidad: 'A domicilio' }]],
  otro: [['Producto de ejemplo', 10, 'General', { presentacion: 'Unidad' }]],
}

/** Columnas de la plantilla para un rubro. */
export function columnasPlantilla(rubro = 'otro') {
  const esServicios = rubro === 'servicios'
  const base = BASE_PRODUCTO.filter((c) => !(esServicios && SOLO_PRODUCTO.has(c.clave)))
  const extra = esServicios ? CAMPOS_SERVICIO : [...camposDe(rubro, 'producto'), ...CAMPOS_SERVICIO]
  const vistos = new Set()
  const delRubro = []
  for (const c of extra) {
    if (vistos.has(c.clave)) continue
    vistos.add(c.clave)
    const valores = c.tipo === 'opciones' ? ` Valores: ${c.opciones.join(', ')}.` : c.tipo === 'si_no' ? ' Escribe Sí o No.' : c.tipo === 'fecha' ? ' Fecha como DD/MM/AAAA.' : c.ejemplo ? ` Por ejemplo: ${c.ejemplo}.` : ''
    const aplica = c.aplicaA === 'servicio' ? ' Solo para servicios.' : ''
    delRubro.push({ clave: `attr:${c.clave}`, titulo: c.etiqueta, ayuda: `Propio de tu rubro.${valores}${aplica}`, ancho: 20, atributo: c.clave })
  }
  return [...base, ...delRubro]
}

/** Filas de ejemplo (arreglos alineados con `columnasPlantilla`). */
export function filasEjemplo(rubro = 'otro') {
  const cols = columnasPlantilla(rubro)
  const ejemplos = EJEMPLOS[rubro] || EJEMPLOS.otro
  return ejemplos.map(([nombre, precio, categoria, atributos], i) => cols.map((c) => {
    switch (c.clave) {
      case 'tipo': return rubro === 'servicios' ? 'Servicio' : 'Producto'
      case 'nombre': return nombre
      case 'codigo': return `${rubro.slice(0, 3).toUpperCase()}-00${i + 1}`
      case 'categoria': return categoria
      case 'precio': return precio
      case 'moneda': return 'USD'
      case 'iva': return 'General'
      case 'unidad': return 'UND'
      case 'costo': return Math.round(precio * 0.6 * 100) / 100
      case 'existencias': return 10 + i * 5
      case 'existencias_minimas': return 3
      default: return c.atributo ? (atributos[c.atributo] ?? '') : ''
    }
  }))
}

export function nombreArchivoPlantilla(rubro = 'otro') {
  return `plantilla-productos-${rubro}.xlsx`
}

/** Genera la plantilla y devuelve un Blob .xlsx. */
export async function generarPlantilla(rubro = 'otro') {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))
  const titulo = RUBROS.find((r) => r.valor === rubro)?.titulo || 'Otro'
  const libro = new ExcelJS.Workbook()
  libro.creator = 'AD System'

  const hoja = libro.addWorksheet('Productos')
  const cols = columnasPlantilla(rubro)
  hoja.columns = cols.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho }))
  const cabecera = hoja.getRow(1)
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8E1818' } }
  cabecera.alignment = { vertical: 'middle', wrapText: true }
  cabecera.height = 30
  hoja.views = [{ state: 'frozen', ySplit: 1 }]
  filasEjemplo(rubro).forEach((f) => hoja.addRow(f))

  const guia = libro.addWorksheet('Instrucciones')
  guia.columns = [{ width: 26 }, { width: 90 }]
  guia.addRow([`Plantilla para: ${titulo}`]).font = { bold: true, size: 14 }
  guia.addRow(['Llena la hoja "Productos" (borra las filas de ejemplo) y súbela en Mi mercancía → Importar desde Excel.'])
  guia.addRow(['No es obligatorio usar esta plantilla: si ya tienes tu lista en Excel, súbela tal cual y te ayudamos a reconocer las columnas.'])
  guia.addRow([])
  const enc = guia.addRow(['Columna', 'Qué escribir'])
  enc.font = { bold: true }
  cols.forEach((c) => guia.addRow([c.titulo, c.ayuda]))
  guia.addRow([])
  guia.addRow(['Importante', 'Los servicios no llevan costo ni existencias. Si un producto ya existe (mismo código o código de barras), se actualiza; sus existencias no se cambian desde aquí.'])
  guia.eachRow((fila) => { fila.alignment = { vertical: 'top', wrapText: true } })

  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** Genera y descarga la plantilla en el navegador. */
export async function descargarPlantilla(rubro = 'otro') {
  const blob = await generarPlantilla(rubro)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivoPlantilla(rubro)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
