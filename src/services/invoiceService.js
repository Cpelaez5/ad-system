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

      // Lógica de reintento para conflictos de numéro de factura (código 23505)
      let attempts = 0;
      const maxAttempts = 5; // Aumentamos intentos
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
      await this.processInventoryMovements(newInvoice, false);

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

      // 1. Obtener factura anterior para revertir el inventario antes de guardar los nuevos cambios
      const { data: oldInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('items, flow, expense_type, invoice_number, id, status')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (fetchError) {
        console.warn('⚠️ No se pudo obtener factura anterior para ajustar inventario:', fetchError)
      }

      // Preparar datos para actualización
      // Si el usuario es cliente, no permitir cambiar el client_id
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

      // 2. Actualizar Inventario (Revertir Old -> Aplicar New)
      if (oldInvoice) {
        await this.processInventoryMovements(oldInvoice, true) // Revertir lo que había
      }
      await this.processInventoryMovements(updatedInvoice, false) // Aplicar lo nuevo

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

  // Eliminar factura (enviar a papelera)
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
  async processInventoryMovements(invoice, isReversal = false) {
    try {
      if (!invoice.items || !Array.isArray(invoice.items)) return

      const isPurchase = invoice.flow === 'COMPRA'
      const isSale = invoice.flow === 'VENTA'

      // Si es COMPRA, debe ser de tipo COMPRA (Mercancía) para afectar inventario
      if (isPurchase && invoice.expense_type !== 'COMPRA') return

      // Si es reversing, invertimos la lógica
      let movementType = ''

      if (isReversal) {
        if (isPurchase) movementType = 'OUT_RETURN' // Devolver compra (sacar)
        if (isSale) movementType = 'IN_RETURN' // Devolver venta (meter)
      } else {
        if (isPurchase) movementType = 'IN_PURCHASE'
        if (isSale) movementType = 'OUT_SALE'
      }

      if (!movementType) return

      for (const item of invoice.items) {
        // Solo procesar si tiene product_id (es un producto de inventario)
        if (item.product_id) {
          // Calcular cantidad (siempre positiva para el servicio, él se encarga del signo según tipo)
          const qty = parseFloat(item.quantity) || 0
          if (qty <= 0) continue

          // Costo (Si es compra, usamos el precio unitario como costo. Si es venta, no actualizamos costo pero registramos salida)
          // Si es Reversal, no tocamos el costo del producto usualmente, o sí?
          // Para simplificar, en reversal no actualizamos costo promedio, solo stock.
          const cost = (!isReversal && isPurchase) ? (parseFloat(item.unitPrice) || 0) : null

          await inventoryService.registerMovement({
            product_id: item.product_id,
            movement_type: movementType,
            quantity: qty,
            cost_price: cost,
            reference_id: invoice.id,
            description: `${isReversal ? 'Anulación/Borrado' : ''} ${isPurchase ? 'Compra' : 'Venta'} Ref: ${invoice.invoice_number}`
          })
        }
      }
    } catch (e) {
      console.error('Error processing inventory movements', e)
      // No lanzamos error para no romper el flujo de factura, pero logueamos
    }
  }

}

export default new InvoiceService()