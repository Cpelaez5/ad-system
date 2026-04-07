// Servicio para manejo de facturas con Supabase Multi-Tenant
import { supabase } from '@/lib/supabaseClient'
import {
  getCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant,
  updateWithTenant,
  deleteWithTenant,
  handleTenantError
} from '@/utils/tenantHelpers'
import inventoryService from './inventoryService'

class InvoiceService {
  constructor() {
    this.storageKey = 'sistema_contabilidad_invoices';
  }

  async getCurrentUserProfile() {
    try {
      const { data: authRes } = await supabase.auth.getUser()
      const userId = authRes?.user?.id
      if (!userId) return null
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, role, organization_id, client_id')
        .eq('id', userId)
        .single()
      if (error) return null
      return profile
    } catch (_) {
      return null
    }
  }

  // Obtener facturas de la organización actual, opcionalmente filtradas por flujo y cliente
  // organizationOnly: si es true, solo devuelve facturas de la organización (client_id IS NULL)
  // Listar facturas
  async getInvoices({ flow = 'VENTA', organizationOnly = false, clientId = null } = {}, options = { trashed: false }) {
    try {
      console.log('🔄 Obteniendo facturas desde Supabase...')
      console.log('📝 Filtros:', { flow, organizationOnly, clientId, trashed: options.trashed })

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.warn('⚠️ No hay organization_id disponible')
        return []
      }

      // Obtener facturas con información del cliente relacionado
      // Construir la consulta paso a paso para evitar ambigüedad
      let query = supabase
        .from('invoices')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_number,
          control_number,
          document_type,
          flow,
          expense_type,
          issue_date,
          due_date,
          status,
          issuer,
          client_info,
          financial,
          items,
          attachments,
          notes,
          created_by,
          created_at,
          updated_at,
          clients!invoices_client_id_fkey (
            id,
            company_name,
            rif,
            address,
            phone,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('flow', flow)

      // Aplicar filtros de client_id ANTES del order para evitar ambigüedad
      if (organizationOnly) {
        // Filtrar solo facturas de la organización (sin client_id)
        query = query.is('client_id', null)
      } else if (clientId) {
        // Filtrar por cliente específico
        query = query.eq('client_id', clientId)
      }

      // Filtros de Papelera
      // Por defecto (trashed=false), NO mostrar eliminadas (deleted_at IS NULL)
      // Si trashed=true, SOLO mostrar eliminadas (deleted_at IS NOT NULL)
      if (options.trashed) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }

      // Aplicar orden al final
      query = query.order('deleted_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })

      const { data: invoices, error } = await query

      if (error) {
        console.warn('⚠️ Error al obtener facturas desde Supabase:', error.message)
        return []
      }

      console.log('🔍 Datos brutos de facturas:', invoices)
      console.log('🔍 Número de facturas brutas:', invoices?.length || 0)

      // Verificar que invoices no sea null o undefined
      if (!invoices || !Array.isArray(invoices)) {
        console.warn('⚠️ Facturas no es un array válido:', invoices)
        return []
      }

      // Transformar datos para compatibilidad con el frontend
      const transformedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        controlNumber: invoice.control_number,
        documentType: invoice.document_type,
        flow: invoice.flow || 'VENTA',
        expense_type: invoice.expense_type,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer || {},
        client: invoice.client_info || {},
        financial: invoice.financial || {},
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        clientId: invoice.client_id,
        clientInfo: invoice.clients // Información del cliente relacionado
      }))

      console.log('🔍 Facturas transformadas:', transformedInvoices)
      console.log('✅ Facturas obtenidas desde Supabase:', transformedInvoices.length)
      return transformedInvoices

    } catch (error) {
      console.error('❌ Error inesperado al obtener facturas:', error)
      return []
    }
  }

  // Obtener factura por ID
  async getInvoiceById(id) {
    try {
      console.log('🔄 Obteniendo factura por ID desde Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return null
      }

      // Intentar obtener desde Supabase
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_number,
          control_number,
          document_type,
          flow,
          expense_type,
          issue_date,
          due_date,
          status,
          issuer,
          client_info,
          financial,
          items,
          attachments,
          notes,
          created_by,
          created_at,
          updated_at,
          clients!invoices_client_id_fkey (
            id,
            company_name,
            rif,
            address,
            phone,
            email
          )
        `)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (error || !invoice) {
        console.error('❌ Factura no encontrada en Supabase:', error?.message)
        return null
      }

      const transformedInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        controlNumber: invoice.control_number,
        documentType: invoice.document_type,
        documentType: invoice.document_type,
        flow: invoice.flow || 'VENTA',
        expense_type: invoice.expense_type,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer || {},
        client: invoice.client_info || {},
        financial: invoice.financial || {},
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        clientId: invoice.client_id,
        clientInfo: invoice.clients
      }

      console.log('✅ Factura obtenida desde Supabase:', transformedInvoice.invoiceNumber)
      return transformedInvoice

    } catch (error) {
      console.error('❌ Error inesperado al obtener factura:', error)
      return null
    }
  }

  // Crear nueva factura
  async createInvoice(invoiceData) {
    try {
      console.log('🔄 Creando factura en Supabase...')
      console.log('📥 Datos recibidos:', invoiceData)

      const organizationId = getCurrentOrganizationId()
      console.log('🏢 Organization ID:', organizationId)

      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { success: false, message: 'No hay organización disponible' }
      }

      // Determinamos el cliente según el rol

      // Determinar cliente según el rol; si es cliente, forzar su client_id
      // Si clientId es explícitamente null (organización), mantenerlo null
      const userProfile = await this.getCurrentUserProfile()
      const effectiveClientId = invoiceData.clientId === null
        ? null  // Factura de la organización (sin client_id)
        : (userProfile?.role === 'cliente' ? (userProfile?.client_id || null) : (invoiceData.clientId || null))
      const effectiveFlow = invoiceData.flow || 'VENTA'

      // Preparar datos para Supabase
      const invoiceRecord = {
        organization_id: organizationId,
        client_id: effectiveClientId,
        invoice_number: invoiceData.invoiceNumber,
        control_number: invoiceData.controlNumber || null,
        document_type: invoiceData.documentType || 'FACTURA',
        flow: effectiveFlow,
        expense_type: invoiceData.expense_type,
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate || null,
        status: invoiceData.status || 'BORRADOR',
        issuer: invoiceData.issuer || {},
        client_info: invoiceData.client || {},
        financial: invoiceData.financial || {},
        items: invoiceData.items || [],
        attachments: invoiceData.attachments || [],
        notes: invoiceData.notes || null,
        created_by: invoiceData.createdBy || userProfile?.id || null
      }

      console.log('📝 Datos a insertar:', invoiceRecord)

      // Lógica de reintento para conflictos de número de factura (código 23505)
      let attempts = 0;
      const maxAttempts = 5;
      let lastError = null;
      let newInvoice = null;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Intento ${attempts}/${maxAttempts} para crear factura con número: ${invoiceRecord.invoice_number}...`)

        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceRecord)
          .select()
          .single()

        if (!error) {
          newInvoice = data;
          break; // Éxito
        }

        // Si es error de duplicado (conflicto)
        if (error.code === '23505' && error.message.includes('invoice_number')) {
          console.warn(`⚠️ Conflicto de número de factura (${invoiceRecord.invoice_number}). Generando nuevo número...`);

          const currentFailedNum = invoiceRecord.invoice_number;
          let nextNum = await this.getNextInvoiceNumber();

          // Si el DB nos devuelve el MIMSO número que acaba de fallar (posiblemente por RLS ocultando el existente),
          // lo incrementamos manualmente.
          if (nextNum === currentFailedNum) {
            console.warn('⚠️ getNextInvoiceNumber devolvió el mismo número fallido. Incrementando manualmente...');

            // Intentar parsear y sumar 1
            const match = currentFailedNum.match(/^(.*?)-(\d+)$/);
            if (match) {
              const prefix = match[1];
              const numPart = parseInt(match[2]);
              // Mantener padding
              const newNumPart = (numPart + 1).toString().padStart(match[2].length, '0');
              nextNum = `${prefix}-${newNumPart}`;
            } else {
              // Fallback simple si no tiene formato estándar
              nextNum = `${currentFailedNum}-1`;
            }
          }

          invoiceRecord.invoice_number = nextNum;

          // LOGICA MEJORADA: Enforzar incremento monotónico
          // Si el "nextNum" que nos dio la base de datos es MENOR o IGUAL al que acabamos de fallar,
          // significa que la BD está retornando un número viejo (por RLS o delay).
          // En ese caso, ignoramos la BD y forzamos (currentFailedNum + 1)
          try {
            const parseInvoiceNum = (numStr) => {
              const match = numStr.match(/^(.*?)-(\d+)$/);
              if (!match) return { prefix: numStr, val: 0, raw: numStr };
              return { prefix: match[1], val: parseInt(match[2], 10), raw: numStr, len: match[2].length };
            };

            const current = parseInvoiceNum(currentFailedNum);
            const next = parseInvoiceNum(nextNum);

            // Solo comparamos si los prefijos son iguales (ej: F-2024 vs F-2024)
            if (current.prefix === next.prefix) {
              if (next.val <= current.val) {
                console.warn(`⚠️ Monotonicidad violada: DB sugirió ${nextNum} pero acabamos de fallar con ${currentFailedNum}. Forzando incremento...`);
                const newVal = current.val + 1;
                // Reconstruir string manteniendo padding
                const newNumPart = newVal.toString().padStart(current.len, '0');
                invoiceRecord.invoice_number = `${current.prefix}-${newNumPart}`;
              }
            }
          } catch (err) {
            console.error('Error calculando incremento monotónico:', err);
            // Fallback al nextNum original
            invoiceRecord.invoice_number = nextNum;
          }
          // Continuar al siguiente intento
        } else {
          // Otro tipo de error, abortar
          console.error('❌ Error al crear factura en Supabase:', error)
          lastError = error;
          break;
        }
      }

      if (!newInvoice) {
        // Falló después de reintentos o por otro error
        const finalError = lastError || { message: 'No se pudo crear la factura tras varios intentos de numeración' };
        console.error('❌ Fallo definitivo al crear factura:', finalError);
        return { success: false, message: `Error al crear factura: ${finalError.message}` }
      }

      console.log('✅ Factura creada exitosamente en Supabase:', newInvoice.id)
      console.log('📄 Factura creada:', newInvoice)

      // 2. Procesar Movimientos de Inventario (Salida/Entrada)
      // Esto también actualiza los items con product_id si se crearon productos nuevos
      const inventoryResult = await this.processInventoryMovements(newInvoice, false)

      // 3. Si se crearon productos nuevos, actualizar los items de la factura con los product_id
      if (inventoryResult?.createdProducts && inventoryResult.createdProducts.length > 0) {
        console.log('📦 [INVENTARIO] Actualizando items con nuevos product_id...')
        const updatedItems = newInvoice.items.map(item => {
          // Buscar si este item tuvo un producto creado
          const createdProduct = inventoryResult.createdProducts.find(
            cp => cp.description === item.description || cp.tempId === item._key
          )
          if (createdProduct && !item.product_id) {
            return { ...item, product_id: createdProduct.productId }
          }
          return item
        })

        // Actualizar en la base de datos
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ items: updatedItems })
          .eq('id', newInvoice.id)

        if (updateError) {
          console.warn('⚠️ No se pudieron actualizar los items con product_id:', updateError.message)
        } else {
          console.log('✅ Items actualizados con product_id correctamente')
          newInvoice.items = updatedItems // Actualizar para la respuesta
        }
      }

      // Transformar respuesta para el frontend
      const transformedInvoice = {
        id: newInvoice.id,
        invoiceNumber: newInvoice.invoice_number,
        controlNumber: newInvoice.control_number,
        documentType: newInvoice.document_type,
        flow: newInvoice.flow || 'VENTA',
        expense_type: newInvoice.expense_type,
        issueDate: newInvoice.issue_date,
        dueDate: newInvoice.due_date,
        status: newInvoice.status,
        issuer: newInvoice.issuer || {},
        client: newInvoice.client_info || {},
        financial: newInvoice.financial || {},
        items: newInvoice.items || [],
        attachments: newInvoice.attachments || [],
        notes: newInvoice.notes,
        createdBy: newInvoice.created_by,
        createdAt: newInvoice.created_at,
        updatedAt: newInvoice.updated_at,
        clientId: newInvoice.client_id
      }

      return {
        success: true,
        data: transformedInvoice,
        message: 'Factura creada exitosamente'
      }

    } catch (error) {
      console.error('❌ Error inesperado al crear factura:', error)
      return { success: false, message: 'Error inesperado al crear factura' }
    }
  }

  // Actualizar factura
  async updateInvoice(id, invoiceData) {
    try {
      console.log('🔄 Actualizando factura en Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { success: false, message: 'No hay organización disponible' }
      }

      // 1. CRÍTICO: Obtener factura ANTES del update y hacer un deep copy inmutable de sus ítems.
      //    Si capturamos DESPUÉS del update, los ítems ya serán los nuevos y el revert
      //    duplicará el inventario en vez de revertirlo.
      const { data: oldInvoiceRaw, error: fetchError } = await supabase
        .from('invoices')
        .select('items, flow, expense_type, invoice_number, id, status')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (fetchError) {
        console.warn('⚠️ No se pudo obtener factura anterior para ajustar inventario:', fetchError)
      }

      // Deep copy para garantizar inmutabilidad (el objeto queda congelado antes del update)
      const oldInvoiceSnapshot = oldInvoiceRaw
        ? { ...oldInvoiceRaw, items: JSON.parse(JSON.stringify(oldInvoiceRaw.items || [])) }
        : null

      // DEBUG: Log del snapshot antiguo para verificar items
      console.log('📦 [INVENTARIO DEBUG] Snapshot antiguo:', {
        flow: oldInvoiceSnapshot?.flow,
        expense_type: oldInvoiceSnapshot?.expense_type,
        items: oldInvoiceSnapshot?.items?.map(i => ({
          description: i.description,
          product_id: i.product_id,
          quantity: i.quantity,
          isInventory: i.isInventory
        }))
      })

      // Preparar datos para actualización
      const userProfile = await this.getCurrentUserProfile()
      const updateData = {
        client_id: userProfile?.role === 'cliente' ? undefined : (invoiceData.clientId || null),
        invoice_number: invoiceData.invoiceNumber,
        control_number: invoiceData.controlNumber || null,
        document_type: invoiceData.documentType,
        flow: invoiceData.flow || 'VENTA',
        expense_type: invoiceData.expense_type,
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate || null,
        status: invoiceData.status,
        issuer: invoiceData.issuer || {},
        client_info: invoiceData.client || {},
        financial: invoiceData.financial || {},
        items: invoiceData.items || [],
        attachments: invoiceData.attachments || [],
        notes: invoiceData.notes || null
      }

      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      console.log('📝 Datos a actualizar:', updateData)
      console.log('📦 [INVENTARIO DEBUG] Datos nuevos items:', updateData.items?.map(i => ({
        description: i.description,
        product_id: i.product_id,
        quantity: i.quantity,
        isInventory: i.isInventory
      })))

      const { data: updatedInvoice, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al actualizar factura en Supabase:', error.message)
        return { success: false, message: `Error al actualizar factura: ${error.message}` }
      }

      console.log('✅ Factura actualizada en Supabase:', updatedInvoice.id)

      // 2. Actualizar Inventario: Calcular delta entre factura antigua y nueva
      //    Esto es más preciso que revertir + aplicar, especialmente cuando cambian las cantidades
      const inventoryResult = await this.updateInventoryForInvoiceEdit(oldInvoiceSnapshot, updatedInvoice)

      if (inventoryResult.success) {
        console.log('✅ Inventario actualizado correctamente:', inventoryResult.message)
      } else {
        console.warn('⚠️ No se pudo actualizar inventario:', inventoryResult.message)
      }

      // Transformar respuesta para el frontend
      const transformedInvoice = {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoice_number,
        controlNumber: updatedInvoice.control_number,
        documentType: updatedInvoice.document_type,
        flow: updatedInvoice.flow || 'VENTA',
        expense_type: updatedInvoice.expense_type,
        issueDate: updatedInvoice.issue_date,
        dueDate: updatedInvoice.due_date,
        status: updatedInvoice.status,
        issuer: updatedInvoice.issuer || {},
        client: updatedInvoice.client_info || {},
        financial: updatedInvoice.financial || {},
        items: updatedInvoice.items || [],
        attachments: updatedInvoice.attachments || [],
        notes: updatedInvoice.notes,
        createdBy: updatedInvoice.created_by,
        createdAt: updatedInvoice.created_at,
        updatedAt: updatedInvoice.updated_at,
        clientId: updatedInvoice.client_id
      }

      return {
        success: true,
        data: transformedInvoice,
        message: 'Factura actualizada exitosamente'
      }

    } catch (error) {
      console.error('❌ Error inesperado al actualizar factura:', error)
      return { success: false, message: 'Error inesperado al actualizar factura' }
    }
  }

  /**
   * Actualiza el inventario calculando el delta entre factura antigua y nueva.
   * Este método es más preciso que revertir + aplicar porque:
   * 1. Maneja correctamente productos que cambiaron de cantidad
   * 2. Maneja productos agregados/eliminados
   * 3. Evita problemas de duplicación cuando los items no tienen product_id
   */
  async updateInventoryForInvoiceEdit(oldInvoice, newInvoice) {
    console.log('🔄 [INVENTARIO] Calculando delta para edición...')

    // Validaciones iniciales
    if (!oldInvoice && !newInvoice) {
      return { success: false, message: 'No hay facturas para comparar' }
    }

    // Si ambas facturas existen, calcular delta
    const oldItems = oldInvoice?.items || []
    const newItems = newInvoice?.items || []
    const flow = newInvoice?.flow || oldInvoice?.flow
    const expenseType = newInvoice?.expense_type ?? oldInvoice?.expense_type

    console.log('📦 [INVENTARIO DEBUG] oldItems:', oldItems.length, 'newItems:', newItems.length)
    console.log('📦 [INVENTARIO DEBUG] flow:', flow, 'expenseType:', expenseType)

    // Solo procesar si es COMPRA de mercancía (afecta inventario)
    const isPurchase = flow === 'COMPRA'
    const isInventoryFlow = isPurchase && expenseType === 'COMPRA'

    // Para VENTA también debemos procesar inventario (salida de stock)
    const isSale = flow === 'VENTA'

    if (!isInventoryFlow && !isSale) {
      console.log('📦 [INVENTARIO] No es flujo de inventario (flow:', flow, 'expenseType:', expenseType, ')')
      return { success: true, message: 'No requiere actualización de inventario' }
    }

    // Crear mapas de productos por product_id
    const oldMap = new Map()
    oldItems.forEach(item => {
      if (item.product_id) {
        const existing = oldMap.get(item.product_id) || { quantity: 0, item }
        existing.quantity += parseFloat(item.quantity) || 0
        oldMap.set(item.product_id, existing)
      }
    })

    const newMap = new Map()
    newItems.forEach(item => {
      if (item.product_id) {
        const existing = newMap.get(item.product_id) || { quantity: 0, item }
        existing.quantity += parseFloat(item.quantity) || 0
        newMap.set(item.product_id, existing)
      }
    })

    console.log('📦 [INVENTARIO DEBUG] oldMap:', Array.from(oldMap.entries()).map(([k, v]) => ({ id: k, qty: v.quantity })))
    console.log('📦 [INVENTARIO DEBUG] newMap:', Array.from(newMap.entries()).map(([k, v]) => ({ id: k, qty: v.quantity })))

    // Calcular deltas
    const deltas = []
    const allProductIds = new Set([...oldMap.keys(), ...newMap.keys()])

    allProductIds.forEach(productId => {
      const oldQty = oldMap.get(productId)?.quantity || 0
      const newQty = newMap.get(productId)?.quantity || 0
      const delta = newQty - oldQty

      if (delta !== 0) {
        deltas.push({
          product_id: productId,
          oldQty,
          newQty,
          delta,
          item: newMap.get(productId)?.item || oldMap.get(productId)?.item
        })
      }
    })

    console.log('📦 [INVENTARIO DEBUG] Deltas calculados:', deltas)

    // Aplicar cada delta al inventario
    const results = []
    for (const delta of deltas) {
      const movementType = flow === 'VENTA'
        ? (delta.delta > 0 ? 'OUT_SALE' : 'IN_RETURN')  // Venta: +delta = salir más, -delta = devolver
        : (delta.delta > 0 ? 'IN_PURCHASE' : 'OUT_RETURN')  // Compra: +delta = entrar más, -delta = devolver

      const qty = Math.abs(delta.delta)

      if (qty > 0) {
        console.log(`📦 [INVENTARIO] Aplicando delta para producto ${delta.product_id}: ${delta.oldQty} -> ${delta.newQty} (delta: ${delta.delta}, movimiento: ${movementType})`)

        try {
          const result = await inventoryService.registerMovement({
            product_id: delta.product_id,
            movement_type: movementType,
            quantity: qty,
            cost_price: delta.item?.unitPrice || null,
            reference_id: newInvoice?.id || oldInvoice?.id,
            description: `Ajuste por edición de ${flow === 'VENTA' ? 'venta' : 'compra'} Ref: ${newInvoice?.invoice_number || oldInvoice?.invoice_number}`
          })

          results.push({ product_id: delta.product_id, success: true, delta: delta.delta, result })
        } catch (err) {
          console.error(`❌ [INVENTARIO] Error aplicando delta para producto ${delta.product_id}:`, err)
          results.push({ product_id: delta.product_id, success: false, error: err.message })
        }
      }
    }

    // Verificar si hubo errores
    const errors = results.filter(r => !r.success)
    if (errors.length > 0) {
      return {
        success: false,
        message: `Se procesaron ${results.length - errors.length} de ${results.length} productos correctamente`,
        errors
      }
    }

    return {
      success: true,
      message: `Se actualizaron ${results.length} productos en inventario`,
      results
    }
  }

  // Eliminar factura (enviar a papelera)
  async deleteInvoice(id) {
    try {
      console.log('🔄 Enviando factura a papelera (soft delete)...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { success: false, message: 'No hay organización disponible' }
      }

      // Soft delete: marcar deleted_at
      const { data: deletedInvoice, error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al enviar factura a papelera:', error.message)
        return { success: false, message: `Error al enviar a papelera: ${error.message}` }
      }

      // Revertir inventario
      if (deletedInvoice) {
        await this.processInventoryMovements(deletedInvoice, true)
      }

      console.log('✅ Factura enviada a papelera:', deletedInvoice.id)

      return {
        success: true,
        message: 'Factura enviada a la papelera exitosamente'
      }

    } catch (error) {
      console.error('❌ Error inesperado al eliminar factura:', error)
      return { success: false, message: 'Error inesperado al eliminar factura' }
    }
  }

  // Restaurar factura de papelera
  async restoreInvoice(id) {
    try {
      console.log('🔄 Restaurando factura de papelera...')
      const organizationId = getCurrentOrganizationId()

      const { data, error } = await supabase
        .from('invoices')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) throw error;

      console.log('✅ Factura restaurada:', data.id);
      return { success: true, message: 'Factura restaurada exitosamente' };

    } catch (error) {
      console.error('❌ Error restaurando factura:', error);
      return { success: false, message: 'Error al restaurar factura' };
    }
  }

  // Eliminar factura permanentemente (Hard Delete)
  async hardDeleteInvoice(id) {
    try {
      console.log('🔥 Eliminando factura permanentemente (HARD DELETE)...')
      const organizationId = getCurrentOrganizationId()

      // 1. Obtener la factura para ver si tiene adjuntos
      const { data: invoiceToDelete, error: fetchError } = await supabase
        .from('invoices')
        .select('attachments, deleted_at, items, flow, expense_type, invoice_number')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) {
        console.warn('⚠️ No se pudo obtener info de adjuntos antes de borrar. Se procederá a borrar el registro.', fetchError);
      } else if (invoiceToDelete && invoiceToDelete.attachments && invoiceToDelete.attachments.length > 0) {
        console.log(`🗑️ Eliminando ${invoiceToDelete.attachments.length} archivos adjuntos...`);

        // Eliminar cada archivo del Storage
        // Recorremos los adjuntos y borramos si tienen path
        const deletePromises = invoiceToDelete.attachments
          .filter(att => att.path)
          .map(att => this.deleteAttachment(att.path));

        const results = await Promise.allSettled(deletePromises);

        // Loggear resultados (opcional)
        results.forEach((res, idx) => {
          if (res.status === 'rejected') {
            console.error(`❌ Error al eliminar adjunto ${idx}:`, res.reason);
          }
        });
        console.log('✅ Limpieza de archivos completada.');
      }

      // 2. Eliminar el registro de la base de datos
      const { data, error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) throw error;

      // Revertir movimientos de inventario si no estaba ya anulada (o si es hard delete directo)
      // Aunque si viene de papelera ya se revirtió.
      // HARD DELETE suele ser desde papelera (ya anulada).
      // Si el status NO es 'ANULADA' o deleted_at era null, revertimos.
      if (invoiceToDelete && !invoiceToDelete.deleted_at) {
        await this.processInventoryMovements(invoiceToDelete, true)
      }

      console.log('✅mm Factura eliminada permanentemente:', id)
      return { success: true, message: 'Factura eliminada definitivamente' }

    } catch (error) {
      console.error('❌ Error hard delete:', error);
      return { success: false, message: 'Error al eliminar permanentemente' };
    }
  }

  // Obtener estadísticas de facturas
  async getInvoiceStats() {
    try {
      console.log('🔄 Obteniendo estadísticas de facturas desde Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { total: 0, byStatus: {}, totalAmount: 0, paidAmount: 0 }
      }

      // Intentar usar función RPC optimizada
      try {
        const { data: stats, error } = await supabase.rpc('get_invoice_stats', {
          org_id: organizationId
        })

        if (!error && stats) {
          console.log('✅ Estadísticas obtenidas desde función RPC')
          return {
            total: stats.total || 0,
            byStatus: stats.by_status || {},
            totalAmount: stats.total_amount || 0,
            paidAmount: stats.paid_amount || 0
          }
        }
      } catch (rpcError) {
        console.warn('⚠️ Error en función RPC, calculando manualmente:', rpcError.message)
      }

      // Fallback: calcular manualmente
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('status, financial')
        .eq('organization_id', organizationId)
        .is('deleted_at', null) // Ignorar papelera en estadísticas

      if (error) {
        console.error('❌ Error al obtener facturas para estadísticas:', error.message)
        return { total: 0, byStatus: {}, totalAmount: 0, paidAmount: 0 }
      }

      // Calcular estadísticas
      const stats = {
        total: invoices.length,
        byStatus: {},
        totalAmount: 0,
        paidAmount: 0
      }

      invoices.forEach(invoice => {
        // Por estado
        stats.byStatus[invoice.status] = (stats.byStatus[invoice.status] || 0) + 1

        // Montos
        const totalSales = parseFloat(invoice.financial?.totalSales || 0)
        stats.totalAmount += totalSales

        if (invoice.status === 'PAGADA') {
          stats.paidAmount += totalSales
        }
      })

      console.log('✅ Estadísticas calculadas manualmente')
      return stats

    } catch (error) {
      console.error('❌ Error inesperado al obtener estadísticas:', error)
      return { total: 0, byStatus: {}, totalAmount: 0, paidAmount: 0 }
    }
  }

  // Buscar facturas
  async searchInvoices(searchTerm, { flow = 'VENTA', clientId } = {}) {
    try {
      console.log('🔄 Buscando facturas en Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return []
      }

      // Buscar en múltiples campos
      let query = supabase
        .from('invoices')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_number,
          control_number,
          document_type,
          flow,
          issue_date,
          due_date,
          status,
          issuer,
          client_info,
          financial,
          items,
          attachments,
          notes,
          created_by,
          created_at,
          updated_at,
          clients!invoices_client_id_fkey (
            id,
            company_name,
            rif,
            address,
            phone,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .is('deleted_at', null) // Excluir papelera en búsqueda por defecto
        .eq('flow', flow)
        .or(`invoice_number.ilike.%${searchTerm}%,control_number.ilike.%${searchTerm}%,client_info->>companyName.ilike.%${searchTerm}%`)

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data: invoices, error } = await query

      if (error) {
        console.error('❌ Error al buscar facturas:', error.message)
        return []
      }

      // Transformar datos
      const transformedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        controlNumber: invoice.control_number,
        documentType: invoice.document_type,
        flow: invoice.flow || 'VENTA',
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer || {},
        client: invoice.client_info || {},
        financial: invoice.financial || {},
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        clientId: invoice.client_id,
        clientInfo: invoice.clients
      }))

      console.log('✅ Facturas encontradas:', transformedInvoices.length)
      return transformedInvoices

    } catch (error) {
      console.error('❌ Error inesperado al buscar facturas:', error)
      return []
    }
  }

  // Validar número de factura único
  async validateUniqueInvoiceNumber(invoiceNumber, excludeId = null) {
    try {
      console.log('🔄 Validando número de factura único en Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return false
      }

      let query = supabase
        .from('invoices')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('invoice_number', invoiceNumber)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data: existingInvoice, error } = await query

      if (error) {
        console.error('❌ Error al validar número de factura:', error.message)
        return false
      }

      const isValid = !existingInvoice || existingInvoice.length === 0
      console.log('✅ Número de factura válido:', isValid)
      return isValid

    } catch (error) {
      console.error('❌ Error inesperado al validar número de factura:', error)
      return false
    }
  }

  // Obtener siguiente número de factura
  async getNextInvoiceNumber() {
    try {
      console.log('🔄 Obteniendo siguiente número de factura desde Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return 'F-2024-001'
      }

      // Obtener el último número de factura
      const { data: lastInvoice, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Error al obtener último número de factura:', error.message)
        return 'F-2024-001'
      }

      if (!lastInvoice || lastInvoice.length === 0) {
        return 'F-2024-001'
      }

      // Extraer número y incrementar
      const lastNumber = lastInvoice[0].invoice_number
      const match = lastNumber.match(/F-(\d{4})-(\d+)/)

      if (match) {
        const year = match[1]
        const number = parseInt(match[2]) + 1
        return `F-${year}-${number.toString().padStart(3, '0')}`
      }

      return 'F-2024-001'

    } catch (error) {
      console.error('❌ Error inesperado al obtener siguiente número:', error)
      return 'F-2024-001'
    }
  }

  // Extraer datos de archivo (simulado - para futuro OCR)
  async extractDataFromFile(file) {
    try {
      console.log('🔄 Extrayendo datos de archivo (simulado)...')

      // Simular procesamiento de archivo
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Retornar datos simulados
      return {
        success: true,
        data: {
          invoiceNumber: 'F-2024-XXX',
          controlNumber: '00-XXXXXXX',
          issueDate: new Date().toISOString().split('T')[0],
          totalAmount: 0,
          items: []
        }
      }

    } catch (error) {
      console.error('❌ Error al extraer datos del archivo:', error)
      return { success: false, message: 'Error al procesar archivo' }
    }
  }

  // Subir archivo adjunto a Supabase Storage con compresión
  async uploadAttachment(file) {
    try {
      console.log('🔄 Subiendo archivo adjunto a Supabase Storage...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        throw new Error('No hay organization_id para guardar el archivo')
      }

      // Optimización de espacio: Comprimir imágenes antes de subir
      let fileToUpload = file

      // Solo intentar comprimir si es imagen (JPG, PNG, etc.)
      if (file.type && file.type.startsWith('image/')) {
        try {
          console.log('🗜️ Optimizando imagen para ahorrar espacio...')
          // Importar dinámicamente BaseOCRService
          const BaseOCRService = (await import('./baseOcrService')).default
          const ocrService = new BaseOCRService()

          // Comprimir
          fileToUpload = await ocrService.compressImage(file)

          // Log de ahorro
          const originalSize = (file.size / 1024).toFixed(0)
          const newSize = (fileToUpload.size / 1024).toFixed(0)
          console.log(`✅ Imagen comprimida: ${originalSize}KB -> ${newSize}KB`)

        } catch (compressionError) {
          console.warn('⚠️ Falló compresión de imagen, se subirá el original:', compressionError)
          // Fallback: usar archivo original
          fileToUpload = file
        }
      }

      // Crear nombre de archivo único
      const timestamp = new Date().getTime()
      const fileExt = fileToUpload.name.split('.').pop()
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${organizationId}/${fileName}`

      console.log('📂 Ruta de archivo:', filePath)

      // Subir archivo al bucket 'invoices'
      const { data, error } = await supabase.storage
        .from('invoices')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ Error Upload Supabase:', error)
        throw error
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath)

      console.log('✅ Archivo subido exitosamente:', publicUrl)

      return {
        success: true,
        url: publicUrl,
        path: filePath,
        fileName: file.name,
        fileSize: fileToUpload.size,
        fileType: file.type
      }

    } catch (error) {
      console.error('❌ Error al subir archivo:', error)
      return { success: false, message: `Error al subir archivo: ${error.message}` }
    }
  }

  // Eliminar archivo adjunto de Supabase Storage
  async deleteAttachment(filePath) {
    try {
      console.log('🗑️ Eliminando archivo de Supabase Storage:', filePath)

      const { data, error } = await supabase.storage
        .from('invoices')
        .remove([filePath])

      if (error) {
        console.error('❌ Error Delete Supabase:', error)
        throw error
      }

      console.log('✅ Archivo eliminado exitosamente')
      return { success: true }
    } catch (error) {
      console.error('❌ Error al eliminar archivo:', error)
      return { success: false, message: `Error al eliminar archivo: ${error.message}` }
    }
  }

  // Procesar movimientos de inventario basados en la factura
  // isReversal: si es true, invertimos el movimiento (ej: anular factura)
  // options.skipAutoCreate: si es true, no crear productos nuevos (usar en updates, no en creates)
  // Devuelve: { success: boolean, createdProducts: Array<{ productId, description, tempId }> }
  async processInventoryMovements(invoice, isReversal = false, options = {}) {

    console.log('🔍 [INVENTARIO] Procesando movimientos:')
    console.log('- items:', invoice.items?.length || 0)
    console.log('- flow:', invoice.flow)
    console.log('- expense_type:', invoice.expense_type)
    console.log('- isReversal:', isReversal)

    const { skipAutoCreate = false } = options
    const result = { success: true, createdProducts: [], movements: [] }

    try {
      if (!invoice.items || !Array.isArray(invoice.items)) {
        return result
      }

      const isPurchase = invoice.flow === 'COMPRA'
      const isSale = invoice.flow === 'VENTA'

      // Si es COMPRA, debe ser de tipo COMPRA (Mercancía) para afectar inventario
      if (isPurchase && invoice.expense_type !== 'COMPRA') {
        console.log('📦 [INVENTARIO] No es compra de mercancía, saltando inventario')
        return result
      }

      // Si es reversing, invertimos la lógica
      let movementType = ''

      if (isReversal) {
        if (isPurchase) movementType = 'OUT_RETURN' // Devolver compra (sacar)
        if (isSale) movementType = 'IN_RETURN' // Devolver venta (meter)
      } else {
        if (isPurchase) movementType = 'IN_PURCHASE'
        if (isSale) movementType = 'OUT_SALE'
      }

      if (!movementType) {
        console.log('📦 [INVENTARIO] No se determinó tipo de movimiento, saltando')
        return result
      }

      console.log(`📦 [INVENTARIO] Tipo de movimiento: ${movementType}`)

      for (const item of invoice.items) {
        let productId = item.product_id

        // --- Auto-crear producto si viene de texto libre en una compra de mercancía ---
        // Si el ítem de una compra tiene isInventory:true pero no tiene product_id,
        // creamos el producto silenciosamente para que quede disponible en el catálogo.
        if (!productId && item.isInventory && isPurchase && !isReversal && !skipAutoCreate) {
          const itemName = (item.description || 'Producto sin nombre').trim()
          try {
            // ANTI-DUPLICADO: Buscar si ya existe un producto con ese nombre exacto
            // antes de crear uno nuevo. Esto evita que se creen duplicados al guardar
            // la misma factura varias veces o al editar.
            const existingProducts = await inventoryService.getProducts({ search: itemName, limit: 5 })
            const exactMatch = existingProducts?.find(p =>
              p.name.toLowerCase().trim() === itemName.toLowerCase()
            )

            if (exactMatch) {
              // Reutilizar el producto existente
              productId = exactMatch.id
              console.log(`♻️ [INVENTARIO] Producto ya existe, reutilizando: "${itemName}" → ID ${productId}`)
              // Registrar el producto creado (aunque sea existente) para que se pueda asociar al item
              result.createdProducts.push({
                productId: productId,
                description: itemName,
                tempId: item._key || null,
                reused: true
              })
            } else {
              // Solo crear si NO existe — generar SKU automático
              console.log(`🆕 [INVENTARIO] Auto-creando producto nuevo: "${itemName}"`)

              // Generar SKU secuencial (PROD-001, PROD-002, etc.)
              let autoCode = item.code || null
              if (!autoCode) {
                try {
                  autoCode = await inventoryService.getNextProductSku()
                  console.log(`🏷️ [INVENTARIO] SKU auto-generado: ${autoCode}`)
                } catch {
                  autoCode = `PROD-${Date.now().toString().slice(-5)}`
                }
              }

              const newProduct = await inventoryService.createProduct({
                name: itemName,
                code: autoCode,          // SKU auto-generado o del OCR
                stock: 0,                // El movimiento lo actualizará
                cost_price: parseFloat(item.unitPrice) || 0,
                sale_price: parseFloat(item.unitPrice) || 0,
                unit: item.unit || 'UND',
                min_stock: 0,
                status: 'ACTIVE'
              })

              // La función createProduct devuelve { data: [...], error } via insertWithTenant
              if (newProduct?.data && newProduct.data.length > 0) {
                productId = newProduct.data[0].id
                console.log(`✅ [INVENTARIO] Producto auto-creado: ${itemName} → ID ${productId}`)
                // Registrar el producto creado para que se pueda actualizar el item
                result.createdProducts.push({
                  productId: productId,
                  description: itemName,
                  tempId: item._key || null,
                  reused: false
                })
              } else if (newProduct?.id) {
                productId = newProduct.id
                console.log(`✅ [INVENTARIO] Producto auto-creado: ${itemName} → ID ${productId}`)
                result.createdProducts.push({
                  productId: productId,
                  description: itemName,
                  tempId: item._key || null,
                  reused: false
                })
              } else {
                console.warn(`⚠️ [INVENTARIO] No se pudo auto-crear el producto "${itemName}":`, newProduct)
                continue // Saltar este ítem si falla la creación
              }
            }
          } catch (createErr) {
            console.error(`❌ [INVENTARIO] Error auto-creando producto "${itemName}":`, createErr)
            continue
          }
        }

        // Solo procesar si tiene product_id (ya sea original o recién creado)
        if (productId) {
          // Calcular cantidad (siempre positiva para el servicio, él se encarga del signo según tipo)
          const qty = parseFloat(item.quantity) || 0
          if (qty <= 0) continue

          // Costo: en compras usamos el precio unitario. En reversiones no actualizamos costo.
          const cost = (!isReversal && isPurchase) ? (parseFloat(item.unitPrice) || 0) : null

          console.log(`📦 [INVENTARIO] Registrando movimiento: producto=${productId}, qty=${qty}, tipo=${movementType}`)

          await inventoryService.registerMovement({
            product_id: productId,
            movement_type: movementType,
            quantity: qty,
            cost_price: cost,
            reference_id: invoice.id,
            description: `${isReversal ? 'Anulación/Borrado' : ''} ${isPurchase ? 'Compra' : 'Venta'} Ref: ${invoice.invoice_number}`
          })

          result.movements.push({
            productId,
            quantity: qty,
            movementType
          })
        }
      }

      console.log(`✅ [INVENTARIO] Procesamiento completado: ${result.movements.length} movimientos, ${result.createdProducts.length} productos creados/reutilizados`)

    } catch (e) {
      console.error('❌ [INVENTARIO] Error processing inventory movements:', e)
      result.success = false
      result.error = e.message
      // No lanzamos error para no romper el flujo de factura, pero logueamos
    }

    return result
  }

}

export default new InvoiceService()