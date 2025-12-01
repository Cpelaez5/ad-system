-- ==========================================
-- SISTEMA DE INVITACIONES Y REGISTRO
-- ==========================================

-- 1. Tabla de Invitaciones
CREATE TABLE public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token UUID DEFAULT gen_random_uuid() NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'contador', 'cliente')),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE, -- Solo si es rol 'cliente'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- 2. Políticas RLS para Invitaciones

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública por token (para validar invitación al registrarse)
CREATE POLICY "Invitations are viewable by token" ON public.invitations
    FOR SELECT
    USING (true); -- Se filtra por token en la query del frontend

-- Permitir a admins/contadores ver y crear invitaciones de su organización
CREATE POLICY "Admins/Accountants can manage organization invitations" ON public.invitations
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'contador')
        )
    );

-- 3. Ajuste de RLS para Clientes (Permitir que un cliente edite sus propios datos de empresa)
-- Actualmente solo admins/contadores pueden editar clients. Necesitamos que el usuario 'cliente'
-- pueda completar su perfil (RIF, Dirección) al registrarse.

CREATE POLICY "Clients can update their own company data" ON public.clients
    FOR UPDATE
    USING (
        id IN (
            SELECT client_id FROM public.users 
            WHERE id = auth.uid() AND role = 'cliente'
        )
    )
    WITH CHECK (
        id IN (
            SELECT client_id FROM public.users 
            WHERE id = auth.uid() AND role = 'cliente'
        )
    );

-- 4. Función para aceptar invitación (Opcional, si se usa Edge Function)
-- O se puede manejar en frontend:
-- 1. SignUp
-- 2. Update public.users SET organization_id = ..., client_id = ...
-- 3. Update public.invitations SET status = 'accepted'

-- Asegurar que public.users permita update del propio usuario para estos campos
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);
