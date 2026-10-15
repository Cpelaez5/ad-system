import { describe, it, expect } from 'vitest'
import { getMenuPorRol, getMenuCliente, getMenuClienteMas } from '@/components/layout/menuPorRol.js'

describe('menuPorRol', () => {
  it('cliente ve su menú de "nombres llanos" (fase2-spec §1) con Inventario cuando NO es de servicios', () => {
    const items = getMenuPorRol({ role: 'cliente', isServicesCompany: false })
    const keys = items.map((i) => i.key)
    expect(keys).toEqual([
      'cliente-inicio',
      'cliente-facturacion',
      'cliente-dashboard',
      'cliente-fiscal-360',
      'cliente-inventario',
      'cliente-proveedores',
      'cliente-clientes',
      'cliente-mi-area',
      'cliente-planes',
    ])
  })

  it('cliente de servicios NO ve "Mi mercancía" (Inventario)', () => {
    const items = getMenuPorRol({ role: 'cliente', isServicesCompany: true })
    expect(items.some((i) => i.key === 'cliente-inventario')).toBe(false)
    // El resto del menú se mantiene igual.
    expect(items.map((i) => i.key)).toEqual([
      'cliente-inicio',
      'cliente-facturacion',
      'cliente-dashboard',
      'cliente-fiscal-360',
      'cliente-proveedores',
      'cliente-clientes',
      'cliente-mi-area',
      'cliente-planes',
    ])
  })

  it('contador ve Dashboard, Área de Contador, Clientes, Facturación, Organización, Contabilidad, Auditoría y Archivo', () => {
    const items = getMenuPorRol({ role: 'contador' })
    const keys = items.map((i) => i.key)
    expect(keys).toEqual([
      'dashboard',
      'contador-area',
      'clientes',
      'facturacion',
      'organizacion',
      'contabilidad',
      'auditoria',
      'archivo',
    ])
    // No ve Usuarios ni nada exclusivo de admin/super_admin.
    expect(keys).not.toContain('usuarios')
    expect(keys).not.toContain('facturacion-sistema')

    const organizacion = items.find((i) => i.key === 'organizacion')
    expect(organizacion.grupo).toBe(true)
    expect(organizacion.hijos.map((h) => h.key)).toEqual([
      'gastos-organizacion',
      'compras-organizacion',
      'ventas-organizacion',
    ])
  })

  it('admin ve lo mismo que contador más Usuarios (pero no lo exclusivo de super_admin)', () => {
    const items = getMenuPorRol({ role: 'admin' })
    const keys = items.map((i) => i.key)
    expect(keys).toContain('contador-area')
    expect(keys).toContain('usuarios')
    expect(keys).not.toContain('facturacion-sistema')
    expect(keys).not.toContain('ai-settings')
  })

  it('super_admin ve Dashboard, Usuarios, Facturación del Sistema, Configuración IA, y el grupo Operación, pero NO el área de contador', () => {
    const items = getMenuPorRol({ role: 'super_admin' })
    const keys = items.map((i) => i.key)
    expect(keys).toEqual(['dashboard', 'usuarios', 'facturacion-sistema', 'ai-settings', 'operacion'])
    expect(keys).not.toContain('contador-area')
    // El Dashboard del super_admin es su propio Inicio; los demás roles siguen con el compartido.
    expect(items.find((i) => i.key === 'dashboard').to.name).toBe('AdminInicio')
    expect(getMenuPorRol({ role: 'contador' })[0].to.name).toBe('Dashboard')
    expect(getMenuPorRol({ role: 'admin' })[0].to.name).toBe('Dashboard')
    const operacion = items.find((i) => i.key === 'operacion')
    expect(operacion.grupo).toBe(true)
    expect(operacion.hijos.map((h) => h.to.name)).toEqual(['AdminOperacion', 'AdminCatalogo', 'AdminSoporte', 'AdminUsoIa', 'AdminTasas'])
  })

  it('un rol desconocido no revienta y devuelve una lista vacía', () => {
    expect(getMenuPorRol({ role: 'invitado' })).toEqual([])
    expect(getMenuPorRol()).toEqual([])
  })

  it('getMenuCliente y getMenuPorRol(cliente) son equivalentes', () => {
    expect(getMenuCliente({ isServicesCompany: true })).toEqual(
      getMenuPorRol({ role: 'cliente', isServicesCompany: true })
    )
  })

  it('getMenuClienteMas excluye Inicio y Mis movimientos (ya están en la barra inferior)', () => {
    const items = getMenuClienteMas({ isServicesCompany: false })
    const keys = items.map((i) => i.key)
    expect(keys).not.toContain('cliente-inicio')
    expect(keys).not.toContain('cliente-facturacion')
    expect(keys).toContain('cliente-fiscal-360')
    expect(keys).toContain('cliente-dashboard')
  })
})
