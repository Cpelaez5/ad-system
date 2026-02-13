import { supabase } from '@/lib/supabaseClient';

/**
 * Servicio de Facturación de Suscripción
 * 
 * Responsabilidades:
 * - Facturas del sistema (system_invoices): CRUD + consultas
 * - Métodos de pago (payment_methods): CRUD para super_admin
 * - Reportes de pago (payment_reports): envío por cliente + validación por admin
 * - Balance y estadísticas
 * 
 * NOTA: Este servicio es INDEPENDIENTE de invoiceService.js
 * (que maneja facturas de compra/venta del negocio del cliente).
 */
export default {

    // ==========================================================================
    // FACTURAS DEL SISTEMA (system_invoices)
    // ==========================================================================

    /**
     * Obtiene el historial de facturas del sistema para un cliente.
     * @param {string} clientId - ID del cliente
     */
    async getInvoices(clientId) {
        try {
            const { data, error } = await supabase
                .from('system_invoices')
                .select('*, subscription:client_subscriptions(*, plan:subscription_plans(name))')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo facturas del sistema:', error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene TODAS las facturas del sistema (para super_admin).
     * Incluye datos del cliente para mostrar en la tabla.
     */
    async getAllInvoices() {
        try {
            const { data, error } = await supabase
                .from('system_invoices')
                .select('*, client:clients(company_name, rif, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo todas las facturas:', error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene una factura por su ID.
     */
    async getInvoiceById(invoiceId) {
        try {
            const { data, error } = await supabase
                .from('system_invoices')
                .select('*, client:clients(company_name, rif, email), subscription:client_subscriptions(*, plan:subscription_plans(name))')
                .eq('id', invoiceId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo factura:', error);
            return { success: false, error };
        }
    },

    /**
     * Crea una nueva factura del sistema (super_admin).
     * @param {Object} invoiceData - Datos de la factura
     */
    async createInvoice(invoiceData) {
        try {
            const { data, error } = await supabase
                .from('system_invoices')
                .insert([{
                    client_id: invoiceData.client_id,
                    subscription_id: invoiceData.subscription_id || null,
                    invoice_number: invoiceData.invoice_number,
                    amount: invoiceData.amount,
                    currency: invoiceData.currency || 'USD',
                    status: 'pending',
                    period_start: invoiceData.period_start,
                    period_end: invoiceData.period_end,
                    due_date: invoiceData.due_date,
                    notes: invoiceData.notes || null
                }])
                .select('*, client:clients(company_name, rif)')
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error creando factura:', error);
            return { success: false, error };
        }
    },

    /**
     * Actualiza el estado de una factura (super_admin).
     */
    async updateInvoiceStatus(invoiceId, status) {
        try {
            const updateData = { status, updated_at: new Date().toISOString() };
            if (status === 'paid') updateData.paid_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('system_invoices')
                .update(updateData)
                .eq('id', invoiceId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error actualizando estado de factura:', error);
            return { success: false, error };
        }
    },

    /**
     * Genera el próximo número de factura correlativo.
     */
    async getNextInvoiceNumber() {
        try {
            const year = new Date().getFullYear();
            const prefix = `SYS-${year}-`;

            const { data, error } = await supabase
                .from('system_invoices')
                .select('invoice_number')
                .like('invoice_number', `${prefix}%`)
                .order('invoice_number', { ascending: false })
                .limit(1);

            if (error) throw error;

            let nextNum = 1;
            if (data && data.length > 0) {
                const lastNum = parseInt(data[0].invoice_number.replace(prefix, ''));
                nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
            }

            return { success: true, data: `${prefix}${String(nextNum).padStart(4, '0')}` };
        } catch (error) {
            console.error('❌ Error generando número de factura:', error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene clientes con suscripción activa (para selector de factura).
     */
    async getClientsForBilling() {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, company_name, rif, email, subscriptions:client_subscriptions(id, status, plan:subscription_plans(name, price_monthly))')
                .order('company_name', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo clientes para facturación:', error);
            return { success: false, error };
        }
    },

    /**
     * Calcula el resumen de facturación (estadísticas).
     * @param {string|null} clientId - Si es null, calcula para todos (super_admin)
     */
    async getBalance(clientId = null) {
        try {
            let query = supabase
                .from('system_invoices')
                .select('amount, status, due_date')
                .neq('status', 'canceled');

            if (clientId) query = query.eq('client_id', clientId);

            const { data, error } = await query;
            if (error) throw error;

            const now = new Date();
            const balance = {
                totalFacturado: 0,
                totalPagado: 0,
                totalPendiente: 0,
                totalVencido: 0,
                proximoVencimiento: null,
                cantidadFacturas: data?.length || 0
            };

            (data || []).forEach(inv => {
                const amount = parseFloat(inv.amount);
                balance.totalFacturado += amount;

                if (inv.status === 'paid') {
                    balance.totalPagado += amount;
                } else if (inv.status === 'pending') {
                    balance.totalPendiente += amount;
                    const dueDate = new Date(inv.due_date);
                    if (dueDate >= now && (!balance.proximoVencimiento || dueDate < new Date(balance.proximoVencimiento))) {
                        balance.proximoVencimiento = inv.due_date;
                    }
                } else if (inv.status === 'overdue') {
                    balance.totalVencido += amount;
                }
            });

            return { success: true, data: balance };
        } catch (error) {
            console.error('❌ Error calculando balance:', error);
            return { success: false, error };
        }
    },

    // ==========================================================================
    // MÉTODOS DE PAGO (payment_methods)
    // ==========================================================================

    /**
     * Obtiene todos los métodos de pago (super_admin ve todos, cliente ve solo habilitados).
     */
    async getPaymentMethods() {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo métodos de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene solo los métodos de pago habilitados (para el cliente).
     */
    async getActivePaymentMethods() {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('is_enabled', true)
                .order('name', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo métodos de pago activos:', error);
            return { success: false, error };
        }
    },

    /**
     * Crea un nuevo método de pago (super_admin).
     */
    async createPaymentMethod(methodData) {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .insert([{
                    name: methodData.name,
                    type: methodData.type,
                    description: methodData.description || null,
                    is_enabled: methodData.is_enabled !== false,
                    charge_igtf: methodData.charge_igtf || false,
                    require_proof: methodData.require_proof || false,
                    details: methodData.details || {},
                    support_phone_prefix: methodData.support_phone_prefix || null,
                    support_phone: methodData.support_phone || null
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error creando método de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Actualiza un método de pago (super_admin).
     */
    async updatePaymentMethod(methodId, methodData) {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .update({
                    name: methodData.name,
                    type: methodData.type,
                    description: methodData.description || null,
                    is_enabled: methodData.is_enabled,
                    charge_igtf: methodData.charge_igtf || false,
                    require_proof: methodData.require_proof || false,
                    details: methodData.details || {},
                    support_phone_prefix: methodData.support_phone_prefix || null,
                    support_phone: methodData.support_phone || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', methodId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error actualizando método de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Activa/desactiva un método de pago (super_admin).
     */
    async togglePaymentMethod(methodId, isEnabled) {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
                .eq('id', methodId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error toggling método de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Elimina un método de pago (super_admin).
     */
    async deletePaymentMethod(methodId) {
        try {
            const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', methodId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Error eliminando método de pago:', error);
            return { success: false, error };
        }
    },

    // ==========================================================================
    // REPORTES DE PAGO (payment_reports)
    // ==========================================================================

    /**
     * Verifica si ya existe un reporte activo (pending_review o approved) para una factura.
     * Retorna true si ya hay un reporte activo (no se puede reportar de nuevo).
     */
    async checkExistingReport(invoiceId) {
        try {
            const { data, error } = await supabase
                .from('payment_reports')
                .select('id, status')
                .eq('invoice_id', invoiceId)
                .in('status', ['pending_review', 'approved'])
                .limit(1);

            if (error) throw error;
            return { success: true, exists: (data && data.length > 0), report: data?.[0] || null };
        } catch (error) {
            console.error('❌ Error verificando reporte existente:', error);
            return { success: false, exists: false, error };
        }
    },

    /**
     * Obtiene los reportes de pago de un cliente (para que pueda ver el estado).
     * @param {string} clientId - ID del cliente
     */
    async getClientReports(clientId) {
        try {
            const { data, error } = await supabase
                .from('payment_reports')
                .select('*, invoice:system_invoices(invoice_number, amount, currency), payment_method:payment_methods(name, type)')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo reportes del cliente:', error);
            return { success: false, error };
        }
    },

    /**
     * Envía un reporte de pago (cliente).
     * Verifica que no exista un reporte activo para la misma factura.
     * @param {Object} reportData - Datos del reporte
     * @param {File|null} proofFile - Archivo de comprobante (imagen/PDF)
     */
    async submitPaymentReport(reportData, proofFile = null) {
        try {
            // Validar que no exista un reporte activo para esta factura
            const existingCheck = await this.checkExistingReport(reportData.invoice_id);
            if (existingCheck.exists) {
                return {
                    success: false,
                    error: { message: 'Ya existe un reporte de pago activo para esta factura. No puedes enviar otro hasta que el actual sea procesado.' }
                };
            }

            let proofUrl = null;

            // Subir comprobante si se proporcionó
            if (proofFile) {
                const fileExt = proofFile.name.split('.').pop();
                const fileName = `${reportData.client_id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('payment-proofs')
                    .upload(fileName, proofFile);

                if (uploadError) throw uploadError;

                // Guardar solo el path relativo (no URL pública)
                proofUrl = fileName;
            }

            const { data, error } = await supabase
                .from('payment_reports')
                .insert([{
                    invoice_id: reportData.invoice_id,
                    client_id: reportData.client_id,
                    payment_method_id: reportData.payment_method_id,
                    reference: reportData.reference,
                    amount: reportData.amount,
                    proof_url: proofUrl,
                    sender_details: reportData.sender_details || {},
                    status: 'pending_review'
                }])
                .select('*, payment_method:payment_methods(name, type)')
                .single();

            if (error) throw error;

            // Actualizar estado de la factura a "paid" (pendiente de validación)
            await supabase
                .from('system_invoices')
                .update({
                    payment_reference: reportData.reference,
                    payment_method: reportData.payment_method_type,
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', reportData.invoice_id);

            return { success: true, data };
        } catch (error) {
            console.error('❌ Error enviando reporte de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene todos los reportes de pago (super_admin).
     * @param {string} statusFilter - 'all', 'pending_review', 'approved', 'rejected'
     */
    async getPaymentReports(statusFilter = 'all') {
        try {
            let query = supabase
                .from('payment_reports')
                .select('*, invoice:system_invoices(invoice_number, amount, currency, client:clients(company_name, rif)), payment_method:payment_methods(name, type)')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error obteniendo reportes de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Aprueba un reporte de pago (super_admin).
     * Marca la factura como pagada.
     */
    async approvePayment(reportId, reviewerId) {
        try {
            // 1. Actualizar reporte
            const { data: report, error: reportError } = await supabase
                .from('payment_reports')
                .update({
                    status: 'approved',
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', reportId)
                .select('*, invoice_id')
                .single();

            if (reportError) throw reportError;

            // 2. Marcar la factura como pagada
            const { error: invoiceError } = await supabase
                .from('system_invoices')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', report.invoice_id);

            if (invoiceError) throw invoiceError;

            return { success: true, data: report };
        } catch (error) {
            console.error('❌ Error aprobando pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Elimina un reporte de pago (solo si está en pending_review).
     * También elimina el comprobante del storage si existe.
     */
    async deletePaymentReport(reportId) {
        try {
            const { data: report, error: fetchError } = await supabase
                .from('payment_reports')
                .select('id, status, proof_url, client_id')
                .eq('id', reportId)
                .single();

            if (fetchError) throw fetchError;
            if (report.status !== 'pending_review') {
                return { success: false, error: { message: 'Solo puedes eliminar reportes en revisión.' } };
            }

            // Borrar comprobante del storage
            if (report.proof_url) {
                try {
                    const path = report.proof_url.split('/payment-proofs/').pop();
                    if (path) await supabase.storage.from('payment-proofs').remove([path]);
                } catch (e) { console.warn('No se pudo borrar comprobante:', e); }
            }

            const { error } = await supabase
                .from('payment_reports')
                .delete()
                .eq('id', reportId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Error eliminando reporte de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Actualiza un reporte de pago (solo si está en pending_review).
     * Permite cambiar referencia, monto, sender_details, y reemplazar/quitar comprobante.
     */
    async updatePaymentReport(reportId, reportData, newProofFile = null) {
        try {
            const { data: existing, error: fetchError } = await supabase
                .from('payment_reports')
                .select('id, status, proof_url, client_id')
                .eq('id', reportId)
                .single();

            if (fetchError) throw fetchError;
            if (existing.status !== 'pending_review') {
                return { success: false, error: { message: 'Solo puedes modificar reportes en revisión.' } };
            }

            let proofUrl = existing.proof_url;

            // Si se proporciona nuevo archivo, reemplazar
            if (newProofFile) {
                if (existing.proof_url) {
                    try {
                        // Compatibilidad: si es URL completa, extraer path; si es path, usarlo directo
                        const oldPath = existing.proof_url.includes('/payment-proofs/')
                            ? existing.proof_url.split('/payment-proofs/').pop()
                            : existing.proof_url;
                        if (oldPath) await supabase.storage.from('payment-proofs').remove([oldPath]);
                    } catch (e) { console.warn('No se pudo borrar comprobante anterior:', e); }
                }
                const fileExt = newProofFile.name.split('.').pop();
                const fileName = `${existing.client_id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('payment-proofs')
                    .upload(fileName, newProofFile);
                if (uploadError) throw uploadError;
                // Guardar solo el path relativo
                proofUrl = fileName;
            } else if (reportData.removeProof) {
                if (existing.proof_url) {
                    try {
                        const oldPath = existing.proof_url.split('/payment-proofs/').pop();
                        if (oldPath) await supabase.storage.from('payment-proofs').remove([oldPath]);
                    } catch (e) { console.warn('No se pudo borrar comprobante:', e); }
                }
                proofUrl = null;
            }

            const { data, error } = await supabase
                .from('payment_reports')
                .update({
                    payment_method_id: reportData.payment_method_id,
                    reference: reportData.reference,
                    amount: reportData.amount,
                    sender_details: reportData.sender_details || {},
                    proof_url: proofUrl
                })
                .eq('id', reportId)
                .select('*, payment_method:payment_methods(name, type)')
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error actualizando reporte de pago:', error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene una URL firmada para ver el comprobante (ya que el bucket es privado).
     * @param {string} proofPath - Path relativo o URL antigua
     */
    async getProofSignedUrl(proofPath) {
        if (!proofPath) return null;
        try {
            // Compatibilidad: si es URL completa antigua, devolverla (aunque fallará si es privado, pero por si acaso)
            if (proofPath.startsWith('http')) {
                // Si es del bucket payment-proofs, intentar extraer path
                if (proofPath.includes('/payment-proofs/')) {
                    const path = proofPath.split('/payment-proofs/').pop();
                    const { data, error } = await supabase.storage
                        .from('payment-proofs')
                        .createSignedUrl(path, 3600); // 1 hora
                    if (data?.signedUrl) return data.signedUrl;
                }
                return proofPath;
            }

            // Es un path relativo
            const { data, error } = await supabase.storage
                .from('payment-proofs')
                .createSignedUrl(proofPath, 3600); // 1 hora

            return data?.signedUrl || null;
        } catch (error) {
            console.error('Error generando signed URL:', error);
            return null;
        }
    },

    /**
     * Rechaza un reporte de pago (super_admin).
     */
    async rejectPayment(reportId, reviewerId, reason) {
        try {
            const { data, error } = await supabase
                .from('payment_reports')
                .update({
                    status: 'rejected',
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: reason
                })
                .eq('id', reportId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error rechazando pago:', error);
            return { success: false, error };
        }
    }
};
