-- ==============================================================================
-- FUNCIÓN RPC: delete_user_cascade
-- Permiso Exclusivo: SUPER ADMIN
-- ==============================================================================
-- Esta función permite al Super Administrador eliminar por completo a un usuario,
-- su empresa asociada (si es cliente) y todos los registros relacionados en el
-- sistema, liberando su correo y RIF para permitir un nuevo registro desde cero.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_cascade(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    caller_id UUID;
    caller_role TEXT;
    target_user RECORD;
    target_client_id UUID;
    target_email TEXT;
    target_rif TEXT;
BEGIN
    -- 1. Obtener ID del usuario autenticado actual
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autenticado. Debes iniciar sesión.');
    END IF;

    -- 2. Verificar que el usuario que ejecuta sea estrictamente SUPER ADMIN
    SELECT role INTO caller_role FROM public.users WHERE id = caller_id;
    IF caller_role IS NULL OR caller_role <> 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Acceso denegado. Solo el Super Administrador puede eliminar cuentas en cascada.');
    END IF;

    -- 3. Evitar que el Super Admin se elimine a sí mismo
    IF caller_id = target_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'No puedes eliminar tu propia cuenta de Super Administrador.');
    END IF;

    -- 4. Obtener información del usuario objetivo
    SELECT id, email, role, client_id INTO target_user 
    FROM public.users 
    WHERE id = target_user_id;

    IF target_user.id IS NULL THEN
        -- Si no está en public.users, intentar buscar en auth.users
        SELECT id, email INTO target_user.id, target_user.email 
        FROM auth.users 
        WHERE id = target_user_id;

        IF target_user.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'El usuario especificado no existe.');
        END IF;
    END IF;

    -- Proteger contra la eliminación de otros Super Admins
    IF target_user.role = 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'No está permitido eliminar a otro Super Administrador mediante esta función.');
    END IF;

    target_client_id := target_user.client_id;
    target_email := target_user.email;

    -- Si tiene un client_id asociado, obtener el RIF para limpieza exhaustiva
    IF target_client_id IS NOT NULL THEN
        SELECT rif INTO target_rif FROM public.clients WHERE id = target_client_id;
    END IF;

    -- =========================================================================
    -- BORRADO EN CASCADA ORDENADO
    -- =========================================================================

    -- A. Retenciones y sus items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retencion_items') THEN
        DELETE FROM public.retencion_items 
        WHERE retencion_id IN (
            SELECT id FROM public.retenciones 
            WHERE (target_client_id IS NOT NULL AND client_id = target_client_id)
               OR user_id = target_user_id
        );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retenciones') THEN
        DELETE FROM public.retenciones 
        WHERE (target_client_id IS NOT NULL AND client_id = target_client_id)
           OR user_id = target_user_id;
    END IF;

    -- B. Facturas y sus items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') THEN
        DELETE FROM public.invoice_items 
        WHERE invoice_id IN (
            SELECT id FROM public.invoices 
            WHERE (target_client_id IS NOT NULL AND client_id = target_client_id)
               OR user_id = target_user_id
        );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        DELETE FROM public.invoices 
        WHERE (target_client_id IS NOT NULL AND client_id = target_client_id)
           OR user_id = target_user_id;
    END IF;

    -- C. Documentos fiscales y archivos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fiscal_docs') THEN
        DELETE FROM public.fiscal_docs 
        WHERE (target_client_id IS NOT NULL AND client_id = target_client_id)
           OR created_by = target_user_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        DELETE FROM public.documents 
        WHERE (target_client_id IS NOT NULL AND client_id = target_client_id)
           OR uploaded_by = target_user_id;
    END IF;

    -- D. Proveedores privados del cliente
    IF target_client_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proveedores') THEN
        DELETE FROM public.proveedores 
        WHERE client_id = target_client_id;
    END IF;

    -- E. Inventarios, productos y transacciones
    IF target_client_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN
            DELETE FROM public.inventory_transactions WHERE client_id = target_client_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_items') THEN
            DELETE FROM public.inventory_items WHERE client_id = target_client_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
            DELETE FROM public.products WHERE client_id = target_client_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
            DELETE FROM public.expenses WHERE client_id = target_client_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_categories') THEN
            DELETE FROM public.expense_categories WHERE client_id = target_client_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conceptos_municipales') THEN
            DELETE FROM public.conceptos_municipales WHERE client_id = target_client_id;
        END IF;
    END IF;

    -- F. Logs, Preferencias, Chat y Bloqueos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
        DELETE FROM public.user_preferences WHERE user_id = target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_ocr_locks') THEN
        DELETE FROM public.ai_ocr_locks WHERE user_id = target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_logs') THEN
        DELETE FROM public.ai_usage_logs WHERE user_id = target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_chat_messages') THEN
        DELETE FROM public.support_chat_messages WHERE sender_id = target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_chat_conversations') THEN
        DELETE FROM public.support_chat_conversations 
        WHERE user_id = target_user_id 
           OR (target_client_id IS NOT NULL AND client_id = target_client_id);
    END IF;

    -- G. Invitaciones, Pagos y Suscripciones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitations') THEN
        DELETE FROM public.invitations 
        WHERE (target_client_id IS NOT NULL AND client_id = target_client_id)
           OR email = target_email;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        DELETE FROM public.payments WHERE user_id = target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        DELETE FROM public.subscriptions WHERE user_id = target_user_id;
    END IF;

    -- H. Eliminar de public.users
    DELETE FROM public.users WHERE id = target_user_id;

    -- I. Eliminar de public.clients si no quedan otros usuarios asociados a ese cliente
    IF target_client_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE client_id = target_client_id) THEN
            DELETE FROM public.clients WHERE id = target_client_id;
        END IF;
    END IF;

    -- J. Eliminar de auth.users (libera el email para re-registro)
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Usuario y registros asociados eliminados con éxito.',
        'deleted_user_id', target_user_id,
        'deleted_client_id', target_client_id,
        'email', target_email
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Otorgar permiso de ejecución para usuarios autenticados (la función valida internamente si es super_admin)
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(UUID) TO authenticated;
