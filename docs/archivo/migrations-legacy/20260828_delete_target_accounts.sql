-- ==============================================================================
-- MIGRACIÓN / SCRIPT DE LIMPIEZA EXHAUSTIVA DE 7 CUENTAS DE CLIENTES
-- ==============================================================================
-- Este script elimina por completo todos los registros relacionados a las 7
-- empresas indicadas para que puedan registrarse desde cero como si fuera la primera vez.
--
-- Cuentas objetivo:
-- 1. J500881428 - INSUMOS Y MATERIALES DEL SUR, C.A (insumosymateriales500@gmail.com)
-- 2. J306742816 - CORPORACION CORE 8, C.A (corporacioncore8@gmail.com)
-- 3. J404710183 - CASA DEL ACEITE RB, C.A. (lacasadelaceiterb@gmail.com)
-- 4. J505486829 - EMPRENDIMIENTO CHRISTIAN RODRIGUEZ 4 (cristianchicha95@gmail.com)
-- 5. J505913786 - LOS ALEX 2021, C.A. (losalex2021ca@gmail.com)
-- 6. J507075184 - MANGUERAS Y SUMINISTROS A&G, C.A. (agmanguerasysuministros@gmail.com)
-- 7. J507174433 - METALC 2025, C.A. (metalc2025@hotmail.com)
-- ==============================================================================

DO $$
DECLARE
    target_client_ids UUID[] := ARRAY[
        '88b8167d-386a-42f7-a2a5-d3b59ee8cc5e'::UUID, -- INSUMOS Y MATERIALES DEL SUR
        'f64c5788-a5b6-4b67-b0d9-05698e8e6491'::UUID, -- CORPORACION CORE 8
        '684b996a-dead-4e71-846c-b633f7e1d32d'::UUID, -- CASA DEL ACEITE RB
        'bc1164c0-ad0e-420a-90a3-e3daa010d781'::UUID, -- EMPRENDIMIENTO CHRISTIAN RODRIGUEZ 4
        '1de14509-0ed8-4b01-8119-b780cdf9d0dc'::UUID, -- LOS ALEX 2021
        '107ee02f-4506-40e3-b78e-d7e8bf5499b7'::UUID, -- MANGUERAS Y SUMINISTROS A&G
        '3bc86618-02e0-402a-a3f2-4baefd269c5d'::UUID  -- METALC 2025
    ];
    target_user_ids UUID[] := ARRAY[
        '4615196a-e4de-4905-8f10-be11edc35677'::UUID,
        'ca4d6755-f735-4bfc-8705-5df5e53bd95f'::UUID,
        '5b66851b-0962-46b5-ab8c-0ba713236fe0'::UUID,
        '5ae21407-2623-4d5d-8f33-b4519e48d6fd'::UUID,
        '8f95bc30-b670-4169-9a43-724392bb0df5'::UUID,
        '875a2e60-3164-4805-80e4-57eb2721b858'::UUID,
        '549e92ea-dfa3-4965-9335-065d579b5bc6'::UUID
    ];
    target_emails TEXT[] := ARRAY[
        'insumosymateriales500@gmail.com',
        'corporacioncore8@gmail.com',
        'lacasadelaceiterb@gmail.com',
        'cristianchicha95@gmail.com',
        'losalex2021ca@gmail.com',
        'agmanguerasysuministros@gmail.com',
        'metalc2025@hotmail.com'
    ];
    target_rifs TEXT[] := ARRAY[
        'J500881428', 'J-500881428', 'J-50088142-8', 'J-500881428-0',
        'J306742816', 'J-306742816', 'J-30674281-6', 'J-306742816-0',
        'J404710183', 'J-404710183', 'J-40471018-3', 'J-404710183-0',
        'J505486829', 'J-505486829', 'J-50548682-9', 'J-505486829-0',
        'J505913786', 'J-505913786', 'J-50591378-6', 'J-505913786-0',
        'J507075184', 'J-507075184', 'J-50707518-4', 'J-507075184-0',
        'J507174433', 'J-507174433', 'J-50717443-3', 'J-507174433-0'
    ];
BEGIN
    RAISE NOTICE 'Iniciando eliminación exhaustiva de las 7 cuentas...';

    -- 1. Eliminar retención items y retenciones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retencion_items') THEN
        DELETE FROM public.retencion_items 
        WHERE retencion_id IN (
            SELECT id FROM public.retenciones 
            WHERE client_id = ANY(target_client_ids) 
               OR user_id = ANY(target_user_ids)
        );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retenciones') THEN
        DELETE FROM public.retenciones 
        WHERE client_id = ANY(target_client_ids) 
           OR user_id = ANY(target_user_ids);
    END IF;

    -- 2. Eliminar invoice items e invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') THEN
        DELETE FROM public.invoice_items 
        WHERE invoice_id IN (
            SELECT id FROM public.invoices 
            WHERE client_id = ANY(target_client_ids) 
               OR user_id = ANY(target_user_ids)
        );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        DELETE FROM public.invoices 
        WHERE client_id = ANY(target_client_ids) 
           OR user_id = ANY(target_user_ids);
    END IF;

    -- 3. Eliminar documentos fiscales y documentos subidos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fiscal_docs') THEN
        DELETE FROM public.fiscal_docs 
        WHERE client_id = ANY(target_client_ids) 
           OR created_by = ANY(target_user_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        DELETE FROM public.documents 
        WHERE client_id = ANY(target_client_ids) 
           OR uploaded_by = ANY(target_user_ids);
    END IF;

    -- 4. Eliminar proveedores privados asociados a estos clientes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proveedores') THEN
        DELETE FROM public.proveedores 
        WHERE client_id = ANY(target_client_ids);
    END IF;

    -- 5. Eliminar inventario / productos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN
        DELETE FROM public.inventory_transactions 
        WHERE client_id = ANY(target_client_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_items') THEN
        DELETE FROM public.inventory_items 
        WHERE client_id = ANY(target_client_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        DELETE FROM public.products 
        WHERE client_id = ANY(target_client_ids);
    END IF;

    -- 6. Eliminar gastos y categorías de gastos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        DELETE FROM public.expenses 
        WHERE client_id = ANY(target_client_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_categories') THEN
        DELETE FROM public.expense_categories 
        WHERE client_id = ANY(target_client_ids);
    END IF;

    -- 7. Eliminar conceptos municipales privados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conceptos_municipales') THEN
        DELETE FROM public.conceptos_municipales 
        WHERE client_id = ANY(target_client_ids);
    END IF;

    -- 8. Eliminar preferencias, configuración, logs y locks de IA
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
        DELETE FROM public.user_preferences 
        WHERE user_id = ANY(target_user_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_ocr_locks') THEN
        DELETE FROM public.ai_ocr_locks 
        WHERE user_id = ANY(target_user_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_logs') THEN
        DELETE FROM public.ai_usage_logs 
        WHERE user_id = ANY(target_user_ids);
    END IF;

    -- 9. Eliminar mensajes y conversaciones de chat/soporte
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_chat_messages') THEN
        DELETE FROM public.support_chat_messages 
        WHERE sender_id = ANY(target_user_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_chat_conversations') THEN
        DELETE FROM public.support_chat_conversations 
        WHERE user_id = ANY(target_user_ids) 
           OR client_id = ANY(target_client_ids);
    END IF;

    -- 10. Eliminar suscripciones, pagos e invitaciones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitations') THEN
        DELETE FROM public.invitations 
        WHERE client_id = ANY(target_client_ids) 
           OR email = ANY(target_emails);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        DELETE FROM public.payments 
        WHERE user_id = ANY(target_user_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        DELETE FROM public.subscriptions 
        WHERE user_id = ANY(target_user_ids);
    END IF;

    -- 11. Eliminar usuarios de la tabla public.users
    DELETE FROM public.users 
    WHERE id = ANY(target_user_ids) 
       OR client_id = ANY(target_client_ids) 
       OR email = ANY(target_emails);

    -- 12. Eliminar empresas de la tabla public.clients
    DELETE FROM public.clients 
    WHERE id = ANY(target_client_ids) 
       OR rif = ANY(target_rifs) 
       OR email = ANY(target_emails);

    -- 13. Eliminar usuarios del esquema de autenticación auth.users
    DELETE FROM auth.users 
    WHERE id = ANY(target_user_ids) 
       OR email = ANY(target_emails);

    RAISE NOTICE '✅ Las 7 cuentas han sido eliminadas por completo del sistema exitosamente.';
END $$;
