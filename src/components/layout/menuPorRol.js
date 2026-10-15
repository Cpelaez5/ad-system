/**
 * menuPorRol — configuración PURA (sin Vue, sin Vuetify) de los ítems de
 * navegación por rol. La consumen `MenuLateral.vue` (drawer de escritorio/
 * tablet) y `HojaMas.vue` (hoja "Más" del cliente en móvil), así el menú de
 * cada rol se define en un solo lugar y es testeable sin montar componentes.
 *
 * Inventario conservado de AppNavigation.vue/Sidebar.vue (556 + 660 líneas,
 * ver docs/mvp/BITACORA.md de esta tarea): rutas e íconos exactos por rol,
 * y la regla "ocultar Inventario si el cliente es de servicios"
 * (`client.activity_type === 'services'`).
 *
 * @typedef {Object} ItemMenu
 * @property {string} key - identificador único, también usado como `value` del v-list-item.
 * @property {string} titulo
 * @property {string} icono - nombre `mdi-*`.
 * @property {string|{name:string, query?:object}} [to] - destino para router-link (ausente si `grupo`).
 * @property {boolean} [grupo] - true si es un v-list-group con `hijos`.
 * @property {ItemMenu[]} [hijos]
 */

/**
 * @param {Object} ctx
 * @param {string} ctx.role - 'super_admin' | 'admin' | 'contador' | 'cliente'
 * @param {boolean} [ctx.isServicesCompany] - true si `client.activity_type === 'services'` (cliente sin Inventario).
 * @returns {ItemMenu[]}
 */
export function getMenuPorRol({ role, isServicesCompany = false } = {}) {
  if (role === 'cliente') {
    return getMenuCliente({ isServicesCompany })
  }

  const items = []

  if (['contador', 'admin', 'super_admin'].includes(role)) {
    items.push({ key: 'dashboard', titulo: 'Dashboard', icono: 'mdi-view-dashboard', to: { name: 'Dashboard' } })
  }

  if (role === 'contador' || role === 'admin') {
    items.push(
      { key: 'contador-area', titulo: 'Área de Contador', icono: 'mdi-calculator', to: { name: 'ContadorArea' } },
      { key: 'clientes', titulo: 'Clientes', icono: 'mdi-account-group', to: { name: 'Clientes' } },
      { key: 'facturacion', titulo: 'Facturación', icono: 'mdi-receipt-text-outline', to: { name: 'Facturacion' } },
      {
        key: 'organizacion',
        titulo: 'Organización',
        icono: 'mdi-office-building',
        grupo: true,
        hijos: [
          { key: 'gastos-organizacion', titulo: 'Gastos', icono: 'mdi-cash-minus', to: { name: 'GastosOrganizacion' } },
          { key: 'compras-organizacion', titulo: 'Compras', icono: 'mdi-cart', to: { name: 'ComprasOrganizacion' } },
          { key: 'ventas-organizacion', titulo: 'Ventas', icono: 'mdi-cash-plus', to: { name: 'VentasOrganizacion' } },
        ],
      },
      { key: 'contabilidad', titulo: 'Contabilidad', icono: 'mdi-book-open-variant', to: { name: 'Contabilidad' } },
      { key: 'auditoria', titulo: 'Auditoría', icono: 'mdi-shield-search', to: { name: 'Auditoria' } },
      { key: 'archivo', titulo: 'Archivo Digital', icono: 'mdi-folder-multiple', to: { name: 'Archivo' } }
    )
  }

  if (role === 'admin' || role === 'super_admin') {
    items.push({ key: 'usuarios', titulo: 'Usuarios', icono: 'mdi-account-group', to: { name: 'Usuarios' } })
  }

  if (role === 'super_admin') {
    items.push(
      { key: 'facturacion-sistema', titulo: 'Facturación', icono: 'mdi-receipt-text-outline', to: { name: 'FacturacionSistema' } },
      { key: 'ai-settings', titulo: 'Configuración IA', icono: 'mdi-robot-outline', to: { name: 'AiSettings' } },
      {
        key: 'operacion',
        titulo: 'Operación',
        icono: 'mdi-tools',
        grupo: true,
        hijos: [
          { key: 'operacion-resumen', titulo: 'Resumen', icono: 'mdi-view-dashboard-outline', to: { name: 'AdminOperacion' } },
          { key: 'operacion-catalogo', titulo: 'Catálogo global', icono: 'mdi-book-open-page-variant-outline', to: { name: 'AdminCatalogo' } },
          { key: 'operacion-uso-ia', titulo: 'Uso de IA', icono: 'mdi-chart-bar', to: { name: 'AdminUsoIa' } },
          { key: 'operacion-tasas', titulo: 'Tasas globales', icono: 'mdi-cash-sync', to: { name: 'AdminTasas' } },
        ],
      },
      { key: 'empresas', titulo: 'Empresas', icono: 'mdi-office-building', to: { name: 'Dashboard' } }
    )
  }

  return items
}

/**
 * Menú completo del cliente (usado por MenuLateral.vue en escritorio/tablet).
 * Nombres en lenguaje llano de docs/mvp/diseno/fase2-spec.md §1.
 */
export function getMenuCliente({ isServicesCompany = false } = {}) {
  const items = [
    { key: 'cliente-inicio', titulo: 'Inicio', icono: 'mdi-home-variant', to: '/cliente/inicio' },
    { key: 'cliente-facturacion', titulo: 'Mis movimientos', icono: 'mdi-receipt-text-outline', to: { name: 'ClienteFacturacion', query: { tab: 'all' } } },
    { key: 'cliente-dashboard', titulo: '¿Cómo voy?', icono: 'mdi-chart-line', to: { name: 'ClienteDashboard' } },
    { key: 'cliente-fiscal-360', titulo: 'Mis papeles', icono: 'mdi-file-certificate', to: { name: 'ClienteFiscal360' } },
  ]

  if (!isServicesCompany) {
    items.push({ key: 'cliente-inventario', titulo: 'Mi mercancía', icono: 'mdi-package-variant-closed', to: { name: 'ClienteInventario' } })
  }

  items.push(
    { key: 'cliente-proveedores', titulo: 'Mis proveedores', icono: 'mdi-truck-delivery-outline', to: { name: 'ClienteProveedores' } },
    { key: 'cliente-clientes', titulo: 'Mis clientes', icono: 'mdi-account-group-outline', to: { name: 'ClienteClientes' } },
    { key: 'cliente-mi-area', titulo: 'Mi negocio', icono: 'mdi-domain', to: { name: 'ClienteMiArea' } },
    { key: 'cliente-planes', titulo: 'Mi plan', icono: 'mdi-crown-outline', to: { name: 'ClientePlanes' } }
  )

  return items
}

/**
 * Subconjunto del menú del cliente para la hoja "Más" de la barra inferior
 * móvil: excluye lo que ya tiene su propio botón en la barra (Inicio, Mis
 * movimientos/"Mis números").
 */
export function getMenuClienteMas({ isServicesCompany = false } = {}) {
  const excluidos = new Set(['cliente-inicio', 'cliente-facturacion'])
  return getMenuCliente({ isServicesCompany }).filter((item) => !excluidos.has(item.key))
}

export default { getMenuPorRol, getMenuCliente, getMenuClienteMas }
