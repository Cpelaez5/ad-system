-- migrations/20260712_seed_subscription_plans.sql
-- Descripción: Actualizar tabla subscription_plans con los precios y features oficiales de AD System
-- Autor: AI Agent
-- Fecha: 2026-07-12

-- Primero, nos aseguramos de que la tabla exista
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_annual DECIMAL(10,2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Limpiar planes existentes (si aplica)
TRUNCATE TABLE subscription_plans CASCADE;

-- Insertar nuevos planes oficiales
INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, features, is_active, max_users)
VALUES
  (
    'plan_solo_pro',
    'AD Solo Pro',
    'Para freelancers y emprendedores independientes',
    15.00,
    150.00,
    '["Emisión de facturas y NC (hasta 50/mes)", "Control de gastos básicos", "Manejo Multimoneda (USD, BS, EUR)", "Reporte básico ingresos vs gastos"]'::jsonb,
    true,
    1
  ),
  (
    'plan_visionary',
    'AD Visionary',
    'Para emprendimientos en crecimiento',
    29.00,
    290.00,
    '["Todo lo de Solo Pro", "Facturación ilimitada", "Expediente Fiscal 360", "Acceso para 1 usuario adicional"]'::jsonb,
    true,
    2
  ),
  (
    'plan_business_momentum',
    'AD Business Momentum',
    'Medianas Empresas (5 a 10 empleados)',
    59.00,
    590.00,
    '["Todo lo de Visionary", "Control de inventario básico", "Reportes avanzados", "Acceso para hasta 3 usuarios con roles"]'::jsonb,
    true,
    3
  ),
  (
    'plan_enterprise_hub',
    'AD Enterprise Hub',
    'Empresas establecidas (10 a 30 empleados)',
    99.00,
    990.00,
    '["Todo lo de Business Momentum", "Facturación recurrente", "Integración contable", "Soporte prioritario", "Acceso para hasta 5 usuarios"]'::jsonb,
    true,
    5
  ),
  (
    'plan_corporate_nexus',
    'AD Corporate Nexus',
    'Corporativos (más de 30 empleados)',
    189.00,
    1890.00,
    '["Solución completa personalizada", "Soporte dedicado 24/7", "Usuarios ilimitados"]'::jsonb,
    true,
    999
  );
