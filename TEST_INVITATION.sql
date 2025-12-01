-- ==========================================
-- DATOS DE PRUEBA PARA VERIFICAR INVITACIONES
-- ==========================================

-- 1. Crear una organización de prueba (si no existe)
INSERT INTO public.organizations (id, name, rif, email, phone, address)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Empresa Demo S.A.',
    'J-12345678-0',
    'contacto@demo.com',
    '0212-1234567',
    'Caracas, Venezuela'
) ON CONFLICT (id) DO NOTHING;

-- 2. Crear un cliente de prueba (perfil incompleto que se completará al registrarse)
INSERT INTO public.clients (id, organization_id, company_name, rif, address, phone)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Cliente Pendiente C.A.',
    'J-00000000-0', -- RIF temporal
    'Dirección pendiente',
    '0000-0000000'
) ON CONFLICT (id) DO NOTHING;

-- 3. Crear la invitación para ese cliente
-- NOTA: Si vas a probar con un email real, cámbialo aquí abajo.
INSERT INTO public.invitations (email, role, organization_id, client_id, token, status)
VALUES (
    'cliente.prueba@ejemplo.com', 
    'cliente',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    '12345678-1234-1234-1234-123456789012', -- Token fijo para la prueba
    'pending'
);
