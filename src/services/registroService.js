/**
 * registroService.js
 * Servicio reutilizable para guardar un registro de facturación (factura/recibo
 * de venta, compra o gasto) emitido por SimpleInvoiceForm.
 *
 * Extraído de src/views/cliente/Facturacion.vue (handleInvoiceSubmit) para que
 * la lógica de persistencia (decidir update vs. create, RPC de retenciones,
 * notificación por email) viva en un solo lugar reutilizable, sin tocar la
 * parte de UI (refs del formulario, cierre de diálogo, recarga de lista), que
 * sigue siendo responsabilidad de la vista.
 *
 * Principio: nunca lanza. Captura cualquier error y devuelve
 * { success: false, message } en lenguaje llano para mostrar en el snackbar.
 */
import invoiceService from '@/services/invoiceService.js'
import retentionRpcService from '@/services/retentionRpcService.js'
import emailNotificationService from '@/services/email-notification-service.js'
import proveedorService from '@/services/proveedorService.js'
import inventoryService from '@/services/inventoryService.js'
import clientesNegocioService from '@/services/clientesNegocioService.js'
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'
import { buscarProveedorPorRif } from '@/services/catalogoService'
import { normalizarRif, tipoPersonaPorLetra } from '@/utils/rif.js'

/**
 * Si el OCR no encontró el proveedor (emisor) en el directorio del cliente,
 * `SimpleInvoiceForm` deja los datos leídos en `formData.issuer._proveedorPendiente`
 * en vez de un `issuer.id` real (ver Tarea C — OCR). Esta función resuelve esa
 * marca justo antes de guardar: busca de nuevo por si acaso (RIF normalizado)
 * y, si sigue sin existir, lo crea con el servicio de proveedores existente.
 *
 * Nunca se ejecuta si el usuario cancela el registro: solo corre dentro de
 * `guardarRegistro`, que solo se llama al guardar de verdad.
 *
 * @param {{ nombre?: string, rif?: string, direccion?: string, telefono?: string, email?: string }} pendiente
 * @returns {Promise<{ success: boolean, id?: string, rif?: string, creado?: boolean, message?: string }>}
 *   `creado: true` solo cuando esta llamada insertó una fila nueva (no un
 *   match existente) — lo usa `guardarRegistro` para decidir si debe
 *   compensar (borrar) el proveedor si la factura falla justo después (I4).
 */
async function resolverProveedorPendiente(pendiente) {
  const rifNormalizado = normalizarRif(pendiente?.rif)
  if (!rifNormalizado) {
    return { success: false, message: 'El proveedor leído del documento no tiene un RIF reconocible; selecciónalo o créalo manualmente.' }
  }

  // I4: puede que ya exista (otra pestaña, el botón "Nuevo", u otro registro
  // guardado mientras tanto) — nunca duplicar por RIF. A diferencia de
  // `proveedorService.getProveedores` (que devuelve [] ante cualquier
  // error), `buscarPorRifNormalizado` SÍ lanza si la consulta falla: si no
  // podemos comprobar duplicados, NO seguimos a crear uno (podría ser el
  // mismo proveedor que ya existe) y avisamos en vez de arriesgarnos.
  let existente
  try {
    existente = await proveedorService.buscarPorRifNormalizado(rifNormalizado)
  } catch (err) {
    logger.warn('[registroService]', 'No se pudo comprobar si el proveedor ya existía antes de crearlo', err?.message)
    return { success: false, message: 'No pudimos comprobar si este proveedor ya existe (revisa tu conexión). No se creó ni se guardó nada; intenta de nuevo.' }
  }

  if (existente) {
    return { success: true, id: existente.id, rif: existente.rif, creado: false }
  }

  // Catálogo global: completa solo lo que el OCR no trajo (nunca lanza)
  const delCatalogo = await buscarProveedorPorRif(rifNormalizado)

  try {
    const creado = await proveedorService.createProveedor({
      nombre: pendiente.nombre || delCatalogo?.razon_social || '',
      rif: rifNormalizado,
      direccion: pendiente.direccion || delCatalogo?.domicilio_fiscal || null,
      telefono: pendiente.telefono || null,
      email: pendiente.email || null,
      tipo_persona: tipoPersonaPorLetra(rifNormalizado)
    })

    if (creado.success) {
      return { success: true, id: creado.data.id, rif: creado.data.rif, creado: true }
    }

    // Contexto del orquestador: la BD tiene un índice único real sobre
    // (client_id, RIF normalizado) para RIF con formato SENIAT válido
    // (`proveedores_client_rif_unico`). Si el insert choca con él (23505),
    // no es un error — alguien más (otra pestaña, una carrera) lo creó
    // justo antes: lo buscamos de nuevo y lo usamos, en vez de fallar.
    if (/ya existe un proveedor/i.test(creado.error || '')) {
      try {
        const encontradoTrasChoque = await proveedorService.buscarPorRifNormalizado(rifNormalizado)
        if (encontradoTrasChoque) {
          return { success: true, id: encontradoTrasChoque.id, rif: encontradoTrasChoque.rif, creado: false }
        }
      } catch { /* si ni esto funciona, caemos al mensaje de error de abajo */ }
    }

    return { success: false, message: creado.error || 'No se pudo registrar el proveedor nuevo.' }
  } catch (err) {
    logger.warn('[registroService]', 'No se pudo crear el proveedor pendiente del OCR', err.message)
    return { success: false, message: 'No se pudo registrar el proveedor nuevo. Intenta seleccionarlo manualmente.' }
  }
}

/**
 * Determina si el formulario corresponde a un egreso (compra o gasto) que debe
 * registrarse mediante el RPC seguro de retenciones.
 * @param {Object} formData
 * @returns {boolean}
 */
function esCompraConRpc(formData) {
  const hasRetentions = (formData.financial?.ivaRetention > 0) ||
    (formData.financial?.islrRetention > 0) ||
    (formData.financial?.municipalRetention > 0)

  return formData.flow === 'COMPRA' && (
    formData.expense_type === 'COMPRA' ||
    formData.expense_type === 'GASTO' ||
    hasRetentions
  )
}

/**
 * Construye el payload que espera el RPC registrar_compra_con_retenciones.
 * @param {Object} formData
 * @returns {Object}
 */
function construirPayloadRpc(formData) {
  const rpcPayload = {
    p_client_id: formData.client?.id || formData.client_id,
    p_proveedor_id: formData.issuer?.id || formData.proveedor_id,
    p_aplicar_iva: formData.financial?.ivaRetention > 0,
    p_aplicar_islr: formData.financial?.islrRetention > 0,
    p_aplicar_municipal: formData.financial?.municipalRetention > 0,
    p_comprobante_iva: formData.financial?.ivaRetentionNumber || null,
    p_comprobante_islr: formData.financial?.islrRetentionNumber || null,
    p_comprobante_municipal: formData.financial?.municipalRetentionNumber || null,
    p_factura: formData
  }

  if (formData.islr_concept_id) {
    rpcPayload.p_islr_concept_id = formData.islr_concept_id
  }
  if (formData.concepto_municipal_id) {
    rpcPayload.p_concepto_municipal_id = formData.concepto_municipal_id
  }

  return rpcPayload
}

/**
 * Tras guardar una compra por el RPC: llena invoices.proveedor_id y, si es compra de
 * mercancía con efecto (ni BORRADOR ni ANULADA), suma al inventario con la factura
 * guardada (leída por id para tener items/status/flow reales).
 * Nunca lanza. Devuelve un aviso (string) si el inventario falló; null si todo bien.
 * La compra ya está guardada en cualquier caso.
 * @returns {Promise<string|null>}
 */
async function completarCompraGuardada(invoiceId, formData) {
  if (!invoiceId) return null
  const proveedorId = formData.issuer?.id || formData.proveedor_id || null
  if (proveedorId) {
    try {
      const { error } = await supabase.from('invoices').update({ proveedor_id: proveedorId }).eq('id', invoiceId)
      if (error) logger.warn('[registroService]', 'No se pudo vincular la factura con el proveedor', error.message)
    } catch (err) {
      logger.warn('[registroService]', 'No se pudo vincular la factura con el proveedor', err?.message)
    }
  }

  const status = (formData.status || '').toUpperCase()
  if (formData.expense_type !== 'COMPRA' || status === 'BORRADOR' || status === 'ANULADA') return null

  try {
    let factura = null
    try {
      const { data } = await supabase
        .from('invoices')
        .select('id, items, status, invoice_number, flow, expense_type, client_id')
        .eq('id', invoiceId)
        .single()
      factura = data || null
    } catch { /* si no se puede leer, se usan los datos del formulario */ }
    if (!factura || !factura.id) {
      factura = {
        id: invoiceId,
        items: formData.items || [],
        status: formData.status,
        invoice_number: formData.invoiceNumber,
        flow: formData.flow,
        expense_type: formData.expense_type,
        client_id: formData.client?.id || formData.client_id || null
      }
    }
    const res = await invoiceService.aplicarInventarioDeFactura(factura)
    if (res && res.success === false) {
      return `La compra se guardó, pero no pudimos sumar al inventario: ${res.error || res.message || 'error desconocido'}`
    }
    return null
  } catch (err) {
    logger.warn('[registroService]', 'No se pudo sumar la compra al inventario', err?.message)
    return `La compra se guardó, pero no pudimos sumar al inventario: ${err?.message || 'error desconocido'}`
  }
}

/**
 * Guarda un registro (factura/recibo) de venta, compra o gasto.
 *
 * Decide automáticamente:
 * - update si formData.id existe.
 * - registro de compra/gasto vía RPC seguro de retenciones si corresponde.
 * - creación normal en los demás casos.
 *
 * Al crear (no al editar) dispara en background la notificación por email;
 * un fallo de email nunca afecta el resultado del guardado.
 *
 * @param {Object} formData - Datos emitidos por SimpleInvoiceForm.
 * @returns {Promise<{ success: boolean, data?: Object, message: string, isUpdate?: boolean, isCompra?: boolean }>}
 *   Nunca lanza: cualquier error se captura y se devuelve como success: false
 *   con un mensaje en lenguaje llano.
 */
export async function guardarRegistro(formData) {
  // I4: si esta llamada crea un proveedor nuevo y la factura falla justo
  // después, hay que compensar (borrarlo) — todavía no tiene historial, así
  // que no tiene sentido dejarlo huérfano en el directorio.
  let proveedorRecienCreado = null
  try {
    const isUpdate = Boolean(formData?.id)
    let savedResult
    let avisoCompra = null

    // Mis clientes: la venta se enlaza con su cliente (o crea el nuevo, solo
    // ahora que se guarda de verdad). "Consumidor final" deja el id en null.
    if (formData?.flow === 'VENTA') {
      // Si no se pudo enlazar o crear el cliente, la venta se guarda igual (perder
      // la venta es peor que dejarla sin enlace); el aviso llega en `warning`.
      const cliente = await clientesNegocioService.asegurarClienteDeVenta(formData)
      if (cliente.success) {
        formData.cliente_negocio_id = cliente.id
      } else {
        logger.warn('[registroService]', 'No se pudo enlazar el cliente de la venta', cliente.message)
        avisoCompra = `La venta se guardó, pero no pudimos guardar al cliente en Mis clientes: ${cliente.message || 'error desconocido'}`
      }
    }

    // Proveedor nuevo sugerido por el OCR, nunca creado hasta este punto
    // (ver Tarea C — OCR, punto 1: "nada se crea si el usuario cancela").
    if (!isUpdate && formData?.flow === 'COMPRA' && formData.issuer?._proveedorPendiente && !formData.issuer?.id) {
      const resuelto = await resolverProveedorPendiente(formData.issuer._proveedorPendiente)
      if (!resuelto.success) {
        return { success: false, message: resuelto.message }
      }
      formData.issuer.id = resuelto.id
      if (resuelto.rif) formData.issuer.rif = resuelto.rif
      if (resuelto.creado) proveedorRecienCreado = { id: resuelto.id, rif: resuelto.rif }
    }
    // I3: `_proveedorPendiente` NUNCA se guarda dentro de la factura, se haya
    // resuelto arriba o venga de una edición/flujo anterior con una marca
    // vieja (si no se resolvió arriba, ya habríamos retornado antes).
    if (formData.issuer) delete formData.issuer._proveedorPendiente

    // I7: productos de inventario marcados como pendientes por el OCR (ver
    // SimpleInvoiceForm, PASO 5) — igual que el proveedor pendiente, nunca
    // se crean hasta este punto y nunca se guardan dentro de la factura. Si
    // la creación de un producto falla, se avisa en consola y el ítem queda
    // como texto libre (sin product_id), pero no bloquea todo el registro.
    if (!isUpdate && Array.isArray(formData.items)) {
      for (const item of formData.items) {
        if (!item || !item._productoPendiente) continue
        try {
          const nuevoProducto = await inventoryService.createProduct(item._productoPendiente)
          const newId = nuevoProducto?.data?.[0]?.id || nuevoProducto?.id
          if (newId) {
            item.product_id = newId
            item.code = item._productoPendiente.code || item.code
          }
        } catch (err) {
          logger.warn('[registroService]', 'No se pudo crear un producto pendiente del OCR', err?.message)
        }
        delete item._productoPendiente
      }
    }

    if (isUpdate) {
      savedResult = await invoiceService.updateInvoice(formData.id, formData)
    } else if (esCompraConRpc(formData)) {
      const rpcPayload = construirPayloadRpc(formData)
      const rpcData = await retentionRpcService.registrarCompra(rpcPayload)
      // El RPC no recibe la fecha fiscal: si el usuario la fijó, se guarda aparte
      // (si no, el trigger de la BD la calcula con la regla de retención de IVA)
      if (rpcData?.invoice_id && formData.fecha_fiscal) {
        const { error: errFecha } = await supabase
          .from('invoices')
          .update({ fecha_fiscal: formData.fecha_fiscal })
          .eq('id', rpcData.invoice_id)
        if (errFecha) logger.warn('[registroService]', 'No se pudo fijar la fecha fiscal manual', errFecha.message)
      }
      // Compras: vínculo directo factura-proveedor y entrada de mercancía al inventario.
      avisoCompra = await completarCompraGuardada(rpcData?.invoice_id, formData)
      // Simular la respuesta de invoiceService para mantener compatibilidad
      savedResult = { success: true, data: { id: rpcData.invoice_id, ...formData } }
    } else {
      savedResult = await invoiceService.createInvoice(formData)
    }

    if (!savedResult || !savedResult.success) {
      if (proveedorRecienCreado) {
        proveedorService.deleteProveedor(proveedorRecienCreado.id, proveedorRecienCreado.rif)
          .catch(err => logger.warn('[registroService]', 'No se pudo compensar (borrar) el proveedor recién creado tras un guardado fallido', err?.message))
      }
      return {
        success: false,
        message: savedResult?.message || 'Error desconocido al guardar factura en base de datos'
      }
    }

    // Enviar notificación por email en background (solo al crear, no al editar).
    // Un fallo de email nunca debe afectar el resultado del guardado.
    if (savedResult?.data && !isUpdate) {
      emailNotificationService.notifyInvoiceCreated(savedResult.data)
        .catch(err => console.warn('⚠️ Email no enviado:', err))
    }

    return {
      success: true,
      data: savedResult.data,
      // Si el inventario falló, la compra igual quedó guardada: el aviso va en
      // `message` y en `warning` para que la UI lo muestre.
      message: avisoCompra || 'Registro guardado correctamente.',
      ...(avisoCompra ? { warning: avisoCompra } : {}),
      isUpdate,
      isCompra: formData.flow === 'COMPRA'
    }
  } catch (err) {
    console.error('❌ [registroService] Error al guardar registro:', err)
    if (proveedorRecienCreado) {
      proveedorService.deleteProveedor(proveedorRecienCreado.id, proveedorRecienCreado.rif)
        .catch(compErr => logger.warn('[registroService]', 'No se pudo compensar (borrar) el proveedor recién creado tras una excepción al guardar', compErr?.message))
    }
    return {
      success: false,
      message: err?.message || 'Ocurrió un error al guardar. Por favor intenta de nuevo.'
    }
  }
}

export default { guardarRegistro }
