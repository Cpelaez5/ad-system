/**
 * Rubros del negocio y los datos PROPIOS de cada uno para el catálogo de
 * productos y servicios (Mi mercancía). Ver docs/mvp/diseno/productos-y-servicios.md.
 *
 * - Los datos ESENCIALES (tipo, nombre, categoría, precio, moneda, IVA, foto,
 *   descripción; y en productos: costo, stock, stock mínimo, unidad, código de
 *   barras, marca) son columnas de inventory_products y valen para todos.
 * - Los de cada rubro van en inventory_products.atributos (jsonb) con estas claves.
 *   La IA de fotos (función producto-ia) recibe la lista y los llena si se ven.
 *
 * Tipos de campo: 'texto' | 'numero' | 'fecha' | 'si_no' | 'opciones'.
 * `aplicaA`: 'producto' | 'servicio' | 'ambos' (por defecto 'producto').
 */

export const RUBROS = [
  { valor: 'bodega', titulo: 'Bodega, abasto o supermercado', icono: 'mdi-basket-outline' },
  { valor: 'farmacia', titulo: 'Farmacia', icono: 'mdi-pill' },
  { valor: 'moda', titulo: 'Ropa, calzado y accesorios', icono: 'mdi-tshirt-crew-outline' },
  { valor: 'ferreteria', titulo: 'Ferretería y construcción', icono: 'mdi-hammer-wrench' },
  { valor: 'electronica', titulo: 'Electrónica y tecnología', icono: 'mdi-cellphone' },
  { valor: 'comida', titulo: 'Restaurante, panadería o comida', icono: 'mdi-food-outline' },
  { valor: 'papeleria', titulo: 'Librería y papelería', icono: 'mdi-notebook-outline' },
  { valor: 'mascotas', titulo: 'Tienda de mascotas', icono: 'mdi-paw' },
  { valor: 'belleza', titulo: 'Belleza y cuidado personal', icono: 'mdi-lipstick' },
  { valor: 'servicios', titulo: 'Servicios profesionales', icono: 'mdi-briefcase-outline' },
  { valor: 'otro', titulo: 'Otro', icono: 'mdi-store-outline' },
]

const VENCIMIENTO = { clave: 'vencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'fecha' }
const PRESENTACION = { clave: 'presentacion', etiqueta: 'Presentación (tamaño o contenido)', tipo: 'texto', ejemplo: '1 kg, 500 ml, caja de 12' }

/** Campos propios de los SERVICIOS (cualquier rubro). */
export const CAMPOS_SERVICIO = [
  { clave: 'se_cobra_por', etiqueta: 'Se cobra por', tipo: 'opciones', opciones: ['Servicio', 'Hora', 'Sesión', 'Día', 'Mes', 'Proyecto'], aplicaA: 'servicio' },
  { clave: 'duracion', etiqueta: 'Duración aproximada', tipo: 'texto', ejemplo: '1 hora, 3 días', aplicaA: 'servicio' },
  { clave: 'modalidad', etiqueta: 'Dónde se presta', tipo: 'opciones', opciones: ['En el local', 'A domicilio', 'En línea'], aplicaA: 'servicio' },
]

/** Campos propios de los PRODUCTOS según el rubro. */
export const CAMPOS_POR_RUBRO = {
  bodega: [PRESENTACION, { clave: 'pesable', etiqueta: 'Se vende por peso', tipo: 'si_no' }, VENCIMIENTO],
  farmacia: [
    { clave: 'principio_activo', etiqueta: 'Principio activo', tipo: 'texto', ejemplo: 'Acetaminofén' },
    PRESENTACION,
    { clave: 'laboratorio', etiqueta: 'Laboratorio', tipo: 'texto' },
    { clave: 'lote', etiqueta: 'Lote', tipo: 'texto' },
    VENCIMIENTO,
    { clave: 'registro_sanitario', etiqueta: 'Registro sanitario', tipo: 'texto' },
    { clave: 'requiere_recipe', etiqueta: 'Requiere récipe', tipo: 'si_no' },
  ],
  moda: [
    { clave: 'talla', etiqueta: 'Talla', tipo: 'texto', ejemplo: 'S, M, L, 38' },
    { clave: 'color', etiqueta: 'Color', tipo: 'texto' },
    { clave: 'material', etiqueta: 'Material', tipo: 'texto' },
    { clave: 'genero', etiqueta: 'Para', tipo: 'opciones', opciones: ['Dama', 'Caballero', 'Niños', 'Unisex'] },
  ],
  ferreteria: [
    { clave: 'medida', etiqueta: 'Medida', tipo: 'texto', ejemplo: '1/2", 3 m, 20 kg' },
    { clave: 'material', etiqueta: 'Material', tipo: 'texto' },
    { clave: 'modelo', etiqueta: 'Modelo', tipo: 'texto' },
  ],
  electronica: [
    { clave: 'modelo', etiqueta: 'Modelo', tipo: 'texto' },
    { clave: 'requiere_serial', etiqueta: 'Se registra el serial al vender', tipo: 'si_no' },
    { clave: 'garantia_meses', etiqueta: 'Garantía (meses)', tipo: 'numero' },
    { clave: 'color', etiqueta: 'Color', tipo: 'texto' },
  ],
  comida: [
    { clave: 'porcion', etiqueta: 'Porción o tamaño', tipo: 'texto', ejemplo: 'Personal, familiar, 250 g' },
    { clave: 'alergenos', etiqueta: 'Contiene (alérgenos)', tipo: 'texto', ejemplo: 'Gluten, leche, maní' },
    VENCIMIENTO,
  ],
  papeleria: [PRESENTACION, { clave: 'color', etiqueta: 'Color', tipo: 'texto' }],
  mascotas: [
    { clave: 'especie', etiqueta: 'Para', tipo: 'opciones', opciones: ['Perro', 'Gato', 'Ave', 'Pez', 'Otro'] },
    PRESENTACION,
    VENCIMIENTO,
  ],
  belleza: [PRESENTACION, { clave: 'tono', etiqueta: 'Tono o variante', tipo: 'texto' }, VENCIMIENTO],
  servicios: [],
  otro: [PRESENTACION],
}

/** Campos extra a mostrar para un rubro y un tipo (producto/servicio). */
export function camposDe(rubro, tipo = 'producto') {
  if (tipo === 'servicio') return CAMPOS_SERVICIO
  return CAMPOS_POR_RUBRO[rubro] || CAMPOS_POR_RUBRO.otro
}

/** Tipo sugerido al crear: los negocios de servicios empiezan en "servicio". */
export function tipoPorDefecto(rubro) {
  return rubro === 'servicios' ? 'servicio' : 'producto'
}
