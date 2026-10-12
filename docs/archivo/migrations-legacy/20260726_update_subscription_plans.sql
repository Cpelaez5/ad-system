-- migrations/20260726_update_subscription_plans.sql
-- Descripción: Actualizar tabla subscription_plans basándose al 100% en los nuevos precios y características. (Versión con UUID)
-- Autor: AI Agent
-- Fecha: 2026-07-26

-- Limpiar planes existentes
TRUNCATE TABLE subscription_plans CASCADE;

-- Insertar nuevos planes oficiales sin especificar el 'id' para que Supabase asigne UUIDs automáticamente.
INSERT INTO subscription_plans (name, description, price_monthly, price_annual, features, is_active)
VALUES
  (
    'AD Solo Pro',
    'Freelancers: Independientes y nómadas digitales.',
    15.00,
    150.00,
    '["Registro de facturas con IA", "Control de Cartelera Fiscal", "Control de Inventario", "Exporta Libros Fiscales (Compra/Venta)", "Control de Ingresos y Egresos", "Reporte de Ingresos y Egresos", "Rentabilidad Mensual", "Inventario en tiempo real", "Cuentas por cobrar (Cashea)", "+ Servicio contable opcional ($20/mes)"]'::jsonb,
    true
  ),
  (
    'AD Visionary',
    'Emprendedores: Negocios en fase de validación.',
    29.00,
    290.00,
    '["Registro de facturas con IA", "Control de Cartelera Fiscal", "Control de Inventario", "Exporta Libros Fiscales (Compra/Venta)", "Control de Ingresos y Egresos", "Reporte de Ingresos y Egresos", "Rentabilidad Mensual", "Inventario en tiempo real", "Cuentas por cobrar (Cashea)", "+ Servicio contable opcional ($30/mes)"]'::jsonb,
    true
  ),
  (
    'AD Business Momentum',
    'Medianas (5+ empleados): Estructuras en crecimiento activo.',
    59.00,
    590.00,
    '["Registro de facturas con IA", "Control de Cartelera Fiscal", "Control de Inventario", "Exporta Libros Fiscales (Compra/Venta)", "Control de Ingresos y Egresos", "Reporte de Ingresos y Egresos", "Rentabilidad Mensual", "Inventario en tiempo real", "Cuentas por cobrar (Cashea)", "+ Servicio contable opcional ($40/mes)"]'::jsonb,
    true
  ),
  (
    'AD Enterprise Hub',
    'Empresas (10+ empleados): Organizaciones consolidadas.',
    99.00,
    990.00,
    '["Registro de facturas con IA", "Control de Cartelera Fiscal", "Control de Inventario", "Exporta Libros Fiscales (Compra/Venta)", "Control de Ingresos y Egresos", "Reporte de Ingresos y Egresos", "Rentabilidad Mensual", "Inventario en tiempo real", "Cuentas por cobrar (Cashea)", "+ Servicio contable opcional ($60/mes)"]'::jsonb,
    true
  ),
  (
    'AD Corporate Nexus',
    'Empresas (30+ empleados): Grandes corporativos y franquicias.',
    189.00,
    1890.00,
    '["Registro de facturas con IA", "Control de Cartelera Fiscal", "Control de Inventario", "Exporta Libros Fiscales (Compra/Venta)", "Control de Ingresos y Egresos", "Reporte de Ingresos y Egresos", "Rentabilidad Mensual", "Inventario en tiempo real", "Cuentas por cobrar (Cashea)", "+ Servicio contable opcional ($100+/mes)"]'::jsonb,
    true
  );
