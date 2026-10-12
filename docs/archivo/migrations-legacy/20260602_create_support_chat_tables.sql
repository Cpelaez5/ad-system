-- migrations/20260602_create_support_chat_tables.sql
-- Descripción: Crear tablas para el chat de soporte IA (Fase 1)
-- Autor: Claude (Arquitectura IA)
-- Fecha: 2026-06-02

-- ═══════════════════════════════════════════════════
-- TABLA: support_conversations
-- Almacena sesiones de conversación del chat de soporte.
-- El campo `mode` prepara la infraestructura para el
-- "switch" futuro donde un Super Admin puede tomar control.
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Estado de la conversación
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'waiting_agent')),

  -- Modo: 'ai' = manejado por DeepSeek, 'human' = manejado por Super Admin (futuro)
  mode TEXT NOT NULL DEFAULT 'ai'
    CHECK (mode IN ('ai', 'human')),

  -- Contexto de la vista donde se inició la conversación
  current_route TEXT,
  current_route_title TEXT,

  -- Metadatos adicionales (plan del usuario, etc.)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id
  ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_org_id
  ON support_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status
  ON support_conversations(status);

COMMENT ON TABLE support_conversations IS 'Sesiones de chat de soporte IA para clientes';
COMMENT ON COLUMN support_conversations.mode IS 'ai = DeepSeek, human = Super Admin (Fase 2)';

-- ═══════════════════════════════════════════════════
-- TABLA: support_messages
-- Mensajes individuales dentro de cada conversación.
-- El campo `role` distingue entre: user, assistant (IA),
-- agent (Super Admin futuro), y system (mensajes del sistema).
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,

  -- Quién envió el mensaje
  role TEXT NOT NULL
    CHECK (role IN ('user', 'assistant', 'agent', 'system')),

  -- Contenido del mensaje
  content TEXT NOT NULL,

  -- Metadatos: ruta actual, tokens usados, etc.
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice principal para cargar mensajes de una conversación
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id
  ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at
  ON support_messages(created_at);

COMMENT ON TABLE support_messages IS 'Mensajes del chat de soporte (usuario, IA, agente)';

-- ═══════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Clientes: solo pueden ver/crear sus propias conversaciones
CREATE POLICY "support_conversations_select_own"
  ON support_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "support_conversations_insert_own"
  ON support_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "support_conversations_update_own"
  ON support_conversations FOR UPDATE
  USING (user_id = auth.uid());

-- Super Admin: puede ver todas las conversaciones (preparación Fase 2)
CREATE POLICY "support_conversations_select_superadmin"
  ON support_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
    )
  );

-- Mensajes: el usuario puede ver/crear mensajes de SUS conversaciones
CREATE POLICY "support_messages_select_own"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations sc
      WHERE sc.id = support_messages.conversation_id
        AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY "support_messages_insert_own"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations sc
      WHERE sc.id = support_messages.conversation_id
        AND sc.user_id = auth.uid()
    )
  );

-- Super Admin: puede ver/insertar mensajes en cualquier conversación (Fase 2)
CREATE POLICY "support_messages_select_superadmin"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
    )
  );

CREATE POLICY "support_messages_insert_superadmin"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
    )
  );
