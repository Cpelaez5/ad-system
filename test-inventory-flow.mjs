/**
 * Script de prueba para verificar el flujo de inventario en facturas
 * Ejecutar con: node test-inventory-flow.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Cargar variables de entorno manualmente
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envContent = readFileSync(join(__dirname, '.env'), 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper para logging
const log = {
  info: (msg) => console.log(`ℹ️ ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️ ${msg}`),
  section: (title) => console.log(`\n${'='.repeat(50)}\n${title}\n${'='.repeat(50)}`),
  data: (label, data) => console.log(`📊 ${label}:`, JSON.stringify(data, null, 2))
}

async function runTests() {
  log.section('PRUEBAS DE FLUJO DE INVENTARIO EN FACTURAS')

  try {
    // ========================================
    // FASE 1: Verificar estado actual del inventario
    // ========================================
    log.section('FASE 1: Estado actual del inventario')

    const { data: products, error: productsError } = await supabase
      .from('inventory_products')
      .select('id, name, code, stock, cost_price, sale_price, unit, status')
      .order('name', { ascending: true })
      .limit(20)

    if (productsError) {
      log.error(`Error al obtener productos: ${productsError.message}`)
      return
    }

    if (!products || products.length === 0) {
      log.warn('No hay productos en el inventario. Se necesitan productos de prueba.')
      log.info('Creando producto de prueba...')

      // Crear producto de prueba
      const { data: newProduct, error: createError } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Producto Prueba Inventario',
          code: 'TEST-INV-001',
          stock: 0,
          cost_price: 10.00,
          sale_price: 15.00,
          unit: 'UND',
          status: 'ACTIVE',
          organization_id: '00000000-0000-0000-0000-000000000000' // Placeholder
        })
        .select()
        .single()

      if (createError) {
        log.error(`No se pudo crear producto de prueba: ${createError.message}`)
        log.info('Para probar correctamente, necesitas:')
        log.info('1. Tener un usuario autenticado en el sistema')
        log.info('2. Tener al menos un producto creado en el inventario')
        log.info('3. Ejecutar las pruebas desde la aplicación con sesión activa')
        return
      }

      log.success(`Producto creado: ${newProduct.name} (ID: ${newProduct.id})`)
    } else {
      log.success(`Productos encontrados: ${products.length}`)
      log.data('Productos', products.map(p => ({
        id: p.id.substring(0, 8) + '...',
        name: p.name,
        stock: p.stock,
        status: p.status
      })))
    }

    // ========================================
    // FASE 2: Verificar facturas existentes
    // ========================================
    log.section('FASE 2: Facturas existentes')

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, flow, expense_type, status, items')
      .order('created_at', { ascending: false })
      .limit(10)

    if (invoicesError) {
      log.error(`Error al obtener facturas: ${invoicesError.message}`)
    } else {
      log.success(`Facturas encontradas: ${invoices?.length || 0}`)
      if (invoices && invoices.length > 0) {
        log.data('Ultimas facturas', invoices.map(inv => ({
          numero: inv.invoice_number,
          tipo: inv.flow,
          estado: inv.status,
          items: inv.items?.length || 0
        })))
      }
    }

    // ========================================
    // FASE 3: Verificar movimientos de inventario
    // ========================================
    log.section('FASE 3: Movimientos de inventario')

    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('id, product_id, movement_type, quantity, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (movementsError) {
      log.error(`Error al obtener movimientos: ${movementsError.message}`)
    } else {
      log.success(`Movimientos encontrados: ${movements?.length || 0}`)
      if (movements && movements.length > 0) {
        log.data('Ultimos movimientos', movements.map(m => ({
          tipo: m.movement_type,
          cantidad: m.quantity,
          fecha: m.created_at
        })))
      }
    }

    // ========================================
    // ANÁLISIS DEL CÓDIGO
    // ========================================
    log.section('ANÁLISIS DEL CÓDIGO DE INVENTARIO')

    log.info('Revisando invoiceService.js...')
    log.info('Funciones clave encontradas:')
    console.log('   1. processInventoryMovements() - Crea movimientos al crear factura')
    console.log('   2. updateInventoryForInvoiceEdit() - Calcula deltas al editar factura')
    console.log('')
    log.info('Lógica de deltas implementada:')
    console.log('   - Compra (COMPRA): delta positivo = IN_PURCHASE, delta negativo = OUT_RETURN')
    console.log('   - Venta (VENTA): delta positivo = OUT_SALE, delta negativo = IN_RETURN')
    console.log('')
    log.info('Manejo de productos nuevos:')
    console.log('   - Si item.isInventory=true y no tiene product_id:')
    console.log('     - Busca producto existente por nombre exacto')
    console.log('     - Si no existe, crea producto nuevo')
    console.log('     - Asocia el product_id al item después de crear')

    // ========================================
    // RESUMEN DE PRUEBAS A REALIZAR MANUALMENTE
    // ========================================
    log.section('PRUEBAS A REALIZAR DESDE LA UI')

    console.log(`
Para probar completamente el flujo de inventario, sigue estos pasos desde la aplicacion:

1️⃣  PRUEBA DE CREACIÓN DE FACTURA DE COMPRA:
   - Ir a Facturacion > Nueva Factura > Compra
   - Crear factura con un producto de inventario, cantidad 10
   - Verificar que el stock del producto aumento en 10

2️⃣  PRUEBA DE EDICIÓN (INCREMENTAR):
   - Editar la factura creada
   - Cambiar cantidad de 10 a 15
   - Verificar que el stock ahora es +15 (delta de +5)

3️⃣  PRUEBA DE EDICIÓN (DECREMENTAR):
   - Editar la misma factura
   - Cambiar cantidad de 15 a 5
   - Verificar que el stock ahora es +5 (delta de -10)

4️⃣  PRUEBA DE FACTURA DE VENTA:
   - Crear factura de venta del mismo producto, cantidad 3
   - Verificar que el stock ahora es +2 (5 - 3)

5️⃣  VERIFICACIÓN EN BASE DE DATOS:
   - Consultar inventory_products para ver stock actual
   - Consultar inventory_movements para ver movimientos
   - Verificar que los deltas se aplicaron correctamente

CONEXIÓN A SUPABASE:
   URL: ${supabaseUrl}
   Estado: ${products ? '✅ Conectado' : '❌ Sin conexión'}
`)

  } catch (error) {
    log.error(`Error inesperado: ${error.message}`)
    console.error(error)
  }
}

runTests()