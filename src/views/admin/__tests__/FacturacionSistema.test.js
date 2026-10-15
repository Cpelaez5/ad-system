/**
 * Facturación del sistema (super admin). Servicios simulados: ningún test
 * toca la BD real. Cubre carga y cifras, filtros, aprobar/rechazar pagos con
 * confirmación, anular facturas, métodos de pago y los diálogos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }) },
    functions: { invoke: vi.fn().mockResolvedValue({}) },
  },
}))

vi.mock('@/services/billingService', () => ({
  default: {
    getAllInvoices: vi.fn(),
    getPaymentReports: vi.fn(),
    getPaymentMethods: vi.fn(),
    getClientsForBilling: vi.fn(),
    getBalance: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    createInvoice: vi.fn(),
    updateInvoiceStatus: vi.fn(),
    createPaymentMethod: vi.fn(),
    updatePaymentMethod: vi.fn(),
    togglePaymentMethod: vi.fn(),
    deletePaymentMethod: vi.fn(),
    getProofSignedUrl: vi.fn(),
    approvePayment: vi.fn(),
    rejectPayment: vi.fn(),
  },
}))
vi.mock('@/services/plansService', () => ({ default: { getPlans: vi.fn() } }))

import billingService from '@/services/billingService'
import plansService from '@/services/plansService'
import { supabase } from '@/lib/supabaseClient'
import FacturacionSistema from '../FacturacionSistema.vue'

const stubs = {
  // El diálogo real se teletransporta al body: aquí solo se pinta su contenido.
  DialogoAdaptable: {
    props: ['modelValue', 'titulo'],
    template: '<div v-if="modelValue" class="dialogo" :data-titulo="titulo"><h2>{{ titulo }}</h2><slot /><slot name="acciones" /></div>',
  },
}
const montar = (query = {}) => mount(FacturacionSistema, {
  global: { plugins: [createVuetify({ components, directives })], stubs, mocks: { $route: { query } } },
})

const invoices = [
  { id: 'i1', invoice_number: 'INV-101', amount: 100, currency: 'USD', status: 'paid', client: { company_name: 'Panadería Sol', rif: 'J-1' } },
  { id: 'i2', invoice_number: 'INV-102', amount: 50, currency: 'USD', status: 'pending', client: { company_name: 'Ferretería Luna', rif: 'J-2', balance: 5 } },
  { id: 'i3', invoice_number: 'INV-103', amount: 200, currency: 'USD', status: 'overdue', client: { company_name: 'Taller Mar', rif: 'V-3' } },
]
const reports = [
  {
    id: 'p1', amount: 50, status: 'pending_review', reference: '998877', created_at: '2026-10-10T15:00:00Z', proof_url: 'u/comprobante.png',
    invoice: { invoice_number: 'INV-102', amount: 50, notes: 'Suscripción a plan AD Visionary', period_end: '2026-11-10T00:00:00Z', client: { company_name: 'Ferretería Luna', rif: 'J-2', email: 'luna@example.com' } },
    payment_method: { name: 'Pago Móvil', type: 'mobile_payment' }, sender_details: {},
  },
  {
    id: 'p2', amount: 30, status: 'approved', reference: '111', created_at: '2026-10-01T15:00:00Z',
    invoice: { invoice_number: 'INV-099', amount: 30, client: { company_name: 'Taller Mar', rif: 'V-3' } },
    payment_method: { name: 'Zelle', type: 'zelle' }, sender_details: {},
  },
]
const methods = [
  { id: 'm1', name: 'Pago Móvil Banesco', type: 'mobile_payment', is_enabled: true, require_proof: true, charge_igtf: false, details: { phone: '0412-1234567', document: 'V-1', bank: 'Banesco' } },
]

beforeEach(() => {
  vi.clearAllMocks()
  billingService.getAllInvoices.mockResolvedValue({ success: true, data: invoices })
  billingService.getPaymentReports.mockResolvedValue({ success: true, data: reports })
  billingService.getPaymentMethods.mockResolvedValue({ success: true, data: methods })
  billingService.getClientsForBilling.mockResolvedValue({ success: true, data: [{ id: 'c1', company_name: 'Taller Mar', rif: 'V-3' }] })
  billingService.getBalance.mockResolvedValue({ success: true, data: { totalFacturado: 350, totalPagado: 100, totalPendiente: 50, totalVencido: 200 } })
  billingService.getNextInvoiceNumber.mockResolvedValue({ success: true, data: 'INV-104' })
  billingService.getProofSignedUrl.mockResolvedValue('https://firmada/comprobante.png')
  billingService.approvePayment.mockResolvedValue({ success: true })
  billingService.rejectPayment.mockResolvedValue({ success: true })
  billingService.updateInvoiceStatus.mockResolvedValue({ success: true })
  billingService.deletePaymentMethod.mockResolvedValue({ success: true })
  billingService.togglePaymentMethod.mockResolvedValue({ success: true })
  billingService.createPaymentMethod.mockResolvedValue({ success: true })
  billingService.updatePaymentMethod.mockResolvedValue({ success: true })
  plansService.getPlans.mockResolvedValue({ success: true, data: [{ id: 'plan-v', name: 'AD Visionary' }, { id: 'plan-s', name: 'AD Solo Pro' }] })
})

const chip = (w, texto) => w.findAll('.v-chip').find((c) => c.text().includes(texto))
const boton = (w, texto) => w.findAll('button').find((b) => b.text().includes(texto))
const irAPagos = async (w) => { await chip(w, 'Pagos reportados').trigger('click'); await flushPromises() }

describe('FacturacionSistema — carga y cifras', () => {
  it('carga todo al abrir y muestra las cifras del balance', async () => {
    const w = montar()
    await flushPromises()
    for (const f of ['getAllInvoices', 'getPaymentReports', 'getPaymentMethods', 'getBalance', 'getClientsForBilling']) expect(billingService[f]).toHaveBeenCalled()
    expect(plansService.getPlans).toHaveBeenCalled()
    const texto = w.text()
    expect(texto).toMatch(/350,00/)
    expect(texto).toMatch(/100,00/)
    expect(texto).toMatch(/50,00/)
    expect(texto).toMatch(/200,00/)
  })

  it('lista las facturas con empresa, número y estado en palabras', async () => {
    const w = montar()
    await flushPromises()
    const filas = w.findAll('[data-testid="factura-fila"]')
    expect(filas).toHaveLength(3)
    expect(filas[0].text()).toContain('Panadería Sol')
    expect(filas[0].text()).toContain('INV-101')
    expect(filas[0].text()).toContain('Pagada')
    expect(filas[1].text()).toContain('Saldo a favor')
  })

  it('el siguiente paso es aprobar el pago pendiente y abre Pagos con ese filtro', async () => {
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('1 pago por aprobar')
    await boton(w, 'Revisar pagos').trigger('click')
    await flushPromises()
    const filas = w.findAll('[data-testid="pago-fila"]')
    expect(filas).toHaveLength(1)
    expect(filas[0].text()).toContain('Ferretería Luna')
  })

  it('sin pagos pendientes, el siguiente paso son las facturas vencidas', async () => {
    billingService.getPaymentReports.mockResolvedValue({ success: true, data: [reports[1]] })
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('1 factura vencida')
    await boton(w, 'Ver facturas vencidas').trigger('click')
    await flushPromises()
    const filas = w.findAll('[data-testid="factura-fila"]')
    expect(filas).toHaveLength(1)
    expect(filas[0].text()).toContain('Taller Mar')
  })

  it('con ?tab=reports abre directo en Pagos reportados por revisar', async () => {
    const w = montar({ tab: 'reports' })
    await flushPromises()
    expect(w.findAll('[data-testid="pago-fila"]')).toHaveLength(1)
  })

  it('con ?report_id abre el detalle de ese pago', async () => {
    const w = montar({ report_id: 'p1' })
    await flushPromises()
    expect(w.find('.dialogo[data-titulo="Pago reportado"]').exists()).toBe(true)
    expect(billingService.getProofSignedUrl).toHaveBeenCalledWith('u/comprobante.png')
  })
})

describe('FacturacionSistema — filtros de facturas', () => {
  it('filtra por estado con los chips (con cantidad)', async () => {
    const w = montar()
    await flushPromises()
    expect(chip(w, 'Vencidas').text()).toContain('1')
    await chip(w, 'Vencidas').trigger('click')
    expect(w.findAll('[data-testid="factura-fila"]')).toHaveLength(1)
  })

  it('busca por número, empresa o RIF', async () => {
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="facturas-buscar"] input').setValue('luna')
    expect(w.findAll('[data-testid="factura-fila"]')).toHaveLength(1)
    await w.get('[data-testid="facturas-buscar"] input').setValue('zzz')
    expect(w.text()).toContain('No hay facturas con ese filtro')
  })

  it('sin facturas enseña qué hacer', async () => {
    billingService.getAllInvoices.mockResolvedValue({ success: true, data: [] })
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('Aún no has emitido facturas')
  })
})

describe('FacturacionSistema — anular factura', () => {
  it('pide confirmación y solo entonces anula', async () => {
    const w = montar()
    await flushPromises()
    const botones = w.findAll('[data-testid="factura-anular"]')
    expect(botones).toHaveLength(1) // solo la pendiente
    await botones[0].trigger('click')
    expect(billingService.updateInvoiceStatus).not.toHaveBeenCalled()
    expect(w.text()).toContain('Anularás la factura INV-102')
    await w.get('[data-testid="confirmar-aceptar"]').trigger('click')
    await flushPromises()
    expect(billingService.updateInvoiceStatus).toHaveBeenCalledWith('i2', 'canceled')
    expect(billingService.getAllInvoices).toHaveBeenCalledTimes(2)
  })

  it('cancelar la confirmación no anula nada', async () => {
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="factura-anular"]').trigger('click')
    await w.get('[data-testid="confirmar-cancelar"]').trigger('click')
    expect(billingService.updateInvoiceStatus).not.toHaveBeenCalled()
  })
})

describe('FacturacionSistema — emitir factura', () => {
  it('abre el diálogo con el siguiente número y no emite si faltan datos', async () => {
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="emitir-factura"]').trigger('click')
    await flushPromises()
    expect(billingService.getNextInvoiceNumber).toHaveBeenCalled()
    const dialogo = w.get('.dialogo[data-titulo="Emitir factura"]')
    expect(dialogo.find('input[readonly]').element.value).toBe('INV-104')
    await w.get('[data-testid="factura-emitir"]').trigger('click')
    await flushPromises()
    expect(billingService.createInvoice).not.toHaveBeenCalled()
    expect(w.text()).toContain('Elige una empresa')
  })
})

describe('FacturacionSistema — pagos reportados', () => {
  it('lista pagos con su método y montos; Ver abre el detalle con el comprobante', async () => {
    const w = montar()
    await flushPromises()
    await irAPagos(w)
    const filas = w.findAll('[data-testid="pago-fila"]')
    expect(filas).toHaveLength(2)
    expect(filas[0].text()).toContain('Pago Móvil')
    expect(filas[0].text()).toContain('Ref. 998877')
    await filas[0].get('[data-testid="pago-ver"]').trigger('click')
    await flushPromises()
    const detalle = w.get('.dialogo[data-titulo="Pago reportado"]')
    expect(detalle.text()).toContain('INV-102')
    expect(detalle.find('[data-testid="comprobante-imagen"]').exists()).toBe(true)
    expect(detalle.find('[data-testid="detalle-aprobar"]').exists()).toBe(true)
  })

  it('un pago ya aprobado no ofrece aprobar ni rechazar', async () => {
    const w = montar()
    await flushPromises()
    await irAPagos(w)
    await chip(w, 'Aprobados').trigger('click')
    const fila = w.get('[data-testid="pago-fila"]')
    expect(fila.find('[data-testid="pago-aprobar"]').exists()).toBe(false)
    expect(fila.find('[data-testid="pago-mas"]').exists()).toBe(false)
  })

  it('aprobar pide confirmación, llama al servicio, avisa por correo y recarga', async () => {
    const w = montar()
    await flushPromises()
    await irAPagos(w)
    await w.get('[data-testid="pago-aprobar"]').trigger('click')
    expect(billingService.approvePayment).not.toHaveBeenCalled()
    expect(w.text()).toContain('¿Aprobar este pago?')
    await w.get('[data-testid="confirmar-aceptar"]').trigger('click')
    await flushPromises()
    expect(billingService.approvePayment).toHaveBeenCalledWith('p1', 'test-user', expect.objectContaining({ plan_id: 'plan-v' }))
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-invoice-email', expect.objectContaining({ body: expect.objectContaining({ status: 'approved', to: 'luna@example.com' }) }))
    expect(billingService.getPaymentReports).toHaveBeenCalledTimes(2)
  })

  it('una suscripción pre-llena el plan por nombre y no aprueba sin plan', async () => {
    const w = montar()
    await flushPromises()
    w.vm.confirmApprovePayment(reports[0])
    expect(w.vm.subscriptionForm.plan_id).toBe('plan-v')
    expect(w.vm.subscriptionForm.trial_end).toBe('2026-11-10T00:00')
    w.vm.subscriptionForm.plan_id = null
    await w.vm.approvePayment()
    expect(billingService.approvePayment).not.toHaveBeenCalled()
  })

  it('rechazar exige un motivo y lo manda al servicio', async () => {
    const w = montar()
    await flushPromises()
    await irAPagos(w)
    await w.get('[data-testid="pago-mas"]').trigger('click')
    await flushPromises()
    // El menú se teletransporta al body.
    document.querySelector('[data-testid="pago-rechazar"]').click()
    await flushPromises()
    expect(w.text()).toContain('Rechazar pago')
    expect(w.get('[data-testid="confirmar-aceptar"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="rechazo-motivo"] textarea').setValue('La referencia no coincide')
    await w.get('[data-testid="confirmar-aceptar"]').trigger('click')
    await flushPromises()
    expect(billingService.rejectPayment).toHaveBeenCalledWith('p1', 'test-user', 'La referencia no coincide')
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-invoice-email', expect.objectContaining({ body: expect.objectContaining({ status: 'rejected', rejection_reason: 'La referencia no coincide' }) }))
  })

  it('el servicio de aprobación en lógica directa recibe las opciones', async () => {
    const w = montar()
    await flushPromises()
    w.vm.actionReport = { id: 'p1', status: 'pending_review' }
    await w.vm.approvePayment()
    expect(billingService.approvePayment).toHaveBeenCalledWith('p1', 'test-user', expect.any(Object))
  })

  it('si el servicio falla, avisa y no cierra el diálogo', async () => {
    billingService.approvePayment.mockResolvedValue({ success: false, error: 'x' })
    const w = montar()
    await flushPromises()
    w.vm.confirmApprovePayment(reports[1])
    await w.vm.approvePayment()
    expect(w.vm.snackbar.color).toBe('error')
    expect(w.vm.showApproveConfirm).toBe(true)
  })
})

describe('FacturacionSistema — métodos de pago', () => {
  const irAMetodos = async (w) => { await chip(w, 'Métodos de pago').trigger('click'); await flushPromises() }

  it('lista los métodos con sus condiciones', async () => {
    const w = montar()
    await flushPromises()
    await irAMetodos(w)
    const fila = w.get('[data-testid="metodo-fila"]')
    expect(fila.text()).toContain('Pago Móvil Banesco')
    expect(fila.text()).toContain('Pide comprobante')
    expect(fila.text()).toContain('Habilitado')
  })

  it('el interruptor habilita o deshabilita y, si falla, vuelve atrás', async () => {
    const w = montar()
    await flushPromises()
    await irAMetodos(w)
    await w.vm.toggleMethod(w.vm.paymentMethods[0], false)
    expect(billingService.togglePaymentMethod).toHaveBeenCalledWith('m1', false)
    billingService.togglePaymentMethod.mockResolvedValue({ success: false })
    await w.vm.toggleMethod(w.vm.paymentMethods[0], true)
    expect(w.vm.paymentMethods[0].is_enabled).toBe(false)
  })

  it('agregar valida y guarda un método nuevo', async () => {
    const w = montar()
    await flushPromises()
    await irAMetodos(w)
    await w.get('[data-testid="agregar-metodo"]').trigger('click')
    await flushPromises()
    await w.get('[data-testid="metodo-guardar"]').trigger('click')
    await flushPromises()
    expect(billingService.createPaymentMethod).not.toHaveBeenCalled()
    expect(w.text()).toContain('Elige un tipo')
    w.vm.saveMethod({ type: 'zelle', name: 'Zelle AD', details: { email: 'a@b.c', full_name: 'AD' } })
    await flushPromises()
    expect(billingService.createPaymentMethod).toHaveBeenCalledWith(expect.objectContaining({ name: 'Zelle AD' }))
  })

  it('editar manda los cambios al método existente', async () => {
    const w = montar()
    await flushPromises()
    await irAMetodos(w)
    await w.get('[data-testid="metodo-editar"]').trigger('click')
    await flushPromises()
    expect(w.get('.dialogo').text()).toContain('Editar método de pago')
    await w.get('[data-testid="metodo-guardar"]').trigger('click')
    await flushPromises()
    expect(billingService.updatePaymentMethod).toHaveBeenCalledWith('m1', expect.objectContaining({ name: 'Pago Móvil Banesco' }))
  })

  it('eliminar pide confirmación', async () => {
    const w = montar()
    await flushPromises()
    await irAMetodos(w)
    w.vm.confirmDeleteMethod(methods[0])
    await flushPromises()
    expect(billingService.deletePaymentMethod).not.toHaveBeenCalled()
    expect(w.text()).toContain('Eliminarás «Pago Móvil Banesco»')
    await w.get('[data-testid="confirmar-aceptar"]').trigger('click')
    await flushPromises()
    expect(billingService.deletePaymentMethod).toHaveBeenCalledWith('m1')
  })

  it('sin métodos enseña a agregar el primero', async () => {
    billingService.getPaymentMethods.mockResolvedValue({ success: true, data: [] })
    const w = montar()
    await flushPromises()
    await irAMetodos(w)
    expect(w.text()).toContain('Aún no hay métodos de pago')
  })
})
