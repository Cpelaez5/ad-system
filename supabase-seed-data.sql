-- =====================================================
-- DATOS DE PRUEBA PARA SISTEMA DE CONTABILIDAD
-- =====================================================
-- 
-- Este archivo contiene datos de ejemplo para poblar
-- la base de datos con información real para testing
-- 
-- IMPORTANTE: Ejecutar DESPUÉS del schema principal
-- =====================================================

-- =====================================================
-- 1. INSERTAR CLIENTES DE PRUEBA
-- =====================================================

-- Clientes para la primera organización (TECNOLOGÍA AVANZADA VENEZOLANA C.A.)
INSERT INTO clients (
  id,
  organization_id,
  company_name,
  rif,
  taxpayer_type,
  address,
  phone,
  email,
  contact_person,
  website,
  status
) VALUES 
(
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111111',
  'CONSTRUCTORA DEL CARIBE S.A.',
  'J-30123456-7',
  'JURIDICA',
  'Zona Industrial de Valencia, Edificio Principal, Valencia',
  '+58 241 555-0200',
  'compras@constructoracaribe.com',
  'María González',
  'www.constructoracaribe.com',
  'ACTIVO'
),
(
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111111',
  'DISTRIBUIDORA NACIONAL DE ALIMENTOS C.A.',
  'J-40123456-9',
  'JURIDICA',
  'Carretera Panamericana, Km 15, Maracay',
  '+58 243 555-0300',
  'administracion@dinalimentos.com',
  'Carlos Rodríguez',
  'www.dinalimentos.com',
  'ACTIVO'
),
(
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111111',
  'CLÍNICA ESPECIALIZADA DEL ESTE C.A.',
  'J-30123456-8',
  'JURIDICA',
  'Av. Libertador, Edificio Médico Los Palos Grandes, Caracas',
  '+58 212 555-0400',
  'administracion@clinicaeste.com',
  'Dra. Ana Martínez',
  'www.clinicaeste.com',
  'ACTIVO'
),
(
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111111',
  'HOTEL PLAYA DORADA C.A.',
  'J-40123456-0',
  'JURIDICA',
  'Playa El Agua, Isla de Margarita, Nueva Esparta',
  '+58 295 555-0500',
  'gerencia@hotelplayadorada.com',
  'Roberto Silva',
  'www.hotelplayadorada.com',
  'ACTIVO'
),
(
  '11111111-1111-1111-1111-111111111105',
  '11111111-1111-1111-1111-111111111111',
  'TRANSPORTE RÁPIDO DEL CENTRO C.A.',
  'J-30123456-9',
  'JURIDICA',
  'Terminal de Pasajeros, Maracay, Aragua',
  '+58 243 555-0600',
  'administracion@transrapido.com',
  'Luis Herrera',
  'www.transrapido.com',
  'ACTIVO'
);

-- Clientes para la segunda organización (CONSULTORÍA EMPRESARIAL DEL CARIBE C.A.)
INSERT INTO clients (
  id,
  organization_id,
  company_name,
  rif,
  taxpayer_type,
  address,
  phone,
  email,
  contact_person,
  website,
  status
) VALUES 
(
  '22222222-2222-2222-2222-222222222201',
  '22222222-2222-2222-2222-222222222222',
  'COLEGIO SANTA MARÍA C.A.',
  'J-30123456-0',
  'JURIDICA',
  'Av. Universidad, Edificio Educativo, Caracas',
  '+58 212 555-0700',
  'administracion@colegiosantamaria.com',
  'Prof. Elena Vargas',
  'www.colegiosantamaria.com',
  'ACTIVO'
),
(
  '22222222-2222-2222-2222-222222222202',
  '22222222-2222-2222-2222-222222222222',
  'RESTAURANTE EL BUEN SABOR C.A.',
  'J-40123456-1',
  'JURIDICA',
  'Centro Comercial, Local 15, Valencia',
  '+58 241 555-0800',
  'gerencia@buensabor.com',
  'Chef Miguel Torres',
  'www.buensabor.com',
  'ACTIVO'
),
(
  '22222222-2222-2222-2222-222222222203',
  '22222222-2222-2222-2222-222222222222',
  'FARMACIA SALUD TOTAL C.A.',
  'J-30123456-1',
  'JURIDICA',
  'Av. Bolívar, Edificio Farmacéutico, Maracay',
  '+58 243 555-0900',
  'ventas@saludtotal.com',
  'Lic. Carmen López',
  'www.saludtotal.com',
  'ACTIVO'
);

-- =====================================================
-- 2. INSERTAR FACTURAS DE PRUEBA
-- =====================================================

-- Facturas para la primera organización
INSERT INTO invoices (
  id,
  organization_id,
  client_id,
  invoice_number,
  control_number,
  document_type,
  issue_date,
  due_date,
  status,
  issuer,
  client_info,
  financial,
  items,
  attachments,
  notes,
  created_by
) VALUES 
(
  '11111111-1111-1111-1111-111111111201',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111101',
  'F-2024-001',
  '00-0008966',
  'FACTURA',
  '2024-01-15',
  '2024-02-15',
  'PAGADA',
  '{
    "companyName": "TECNOLOGÍA AVANZADA VENEZOLANA C.A.",
    "rif": "J-41234567-8",
    "taxpayerType": "JURIDICA",
    "address": "Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas",
    "phone": "+58 212 555-0100",
    "email": "ventas@tav.com.ve",
    "website": "www.tav.com.ve"
  }',
  '{
    "companyName": "CONSTRUCTORA DEL CARIBE S.A.",
    "rif": "J-30123456-7",
    "taxpayerType": "JURIDICA",
    "address": "Zona Industrial de Valencia, Edificio Principal, Valencia",
    "phone": "+58 241 555-0200",
    "email": "compras@constructoracaribe.com",
    "contactPerson": "María González"
  }',
  '{
    "totalSales": 125000.00,
    "nonTaxableSales": 0,
    "taxableSales": 107758.62,
    "taxDebit": 17241.38,
    "ivaRetention": 0,
    "islrRetention": 0,
    "municipalRetention": 0,
    "igtf": 0,
    "currency": "VES",
    "exchangeRate": 1
  }',
  '[
    {
      "description": "Servicios de Consultoría Tecnológica",
      "quantity": 40,
      "unitPrice": 2500.00,
      "total": 100000.00
    },
    {
      "description": "Licencias de Software Empresarial",
      "quantity": 5,
      "unitPrice": 5000.00,
      "total": 25000.00
    }
  ]',
  '[]',
  'Proyecto de digitalización empresarial - Fase 1',
  '11111111-1111-1111-1111-111111111111'
),
(
  '11111111-1111-1111-1111-111111111202',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111102',
  'F-2024-002',
  '00-0008967',
  'FACTURA',
  '2024-01-20',
  '2024-02-20',
  'EMITIDA',
  '{
    "companyName": "TECNOLOGÍA AVANZADA VENEZOLANA C.A.",
    "rif": "J-41234567-8",
    "taxpayerType": "JURIDICA",
    "address": "Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas",
    "phone": "+58 212 555-0100",
    "email": "ventas@tav.com.ve",
    "website": "www.tav.com.ve"
  }',
  '{
    "companyName": "DISTRIBUIDORA NACIONAL DE ALIMENTOS C.A.",
    "rif": "J-40123456-9",
    "taxpayerType": "JURIDICA",
    "address": "Carretera Panamericana, Km 15, Maracay",
    "phone": "+58 243 555-0300",
    "email": "administracion@dinalimentos.com",
    "contactPerson": "Carlos Rodríguez"
  }',
  '{
    "totalSales": 85000.00,
    "nonTaxableSales": 0,
    "taxableSales": 73275.86,
    "taxDebit": 11724.14,
    "ivaRetention": 0,
    "islrRetention": 0,
    "municipalRetention": 0,
    "igtf": 0,
    "currency": "VES",
    "exchangeRate": 1
  }',
  '[
    {
      "description": "Sistema de Gestión de Inventarios",
      "quantity": 1,
      "unitPrice": 50000.00,
      "total": 50000.00
    },
    {
      "description": "Capacitación del Personal",
      "quantity": 20,
      "unitPrice": 1750.00,
      "total": 35000.00
    }
  ]',
  '[]',
  'Implementación de sistema de inventarios',
  '11111111-1111-1111-1111-111111111111'
),
(
  '11111111-1111-1111-1111-111111111203',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111103',
  'F-2024-003',
  '00-0008968',
  'FACTURA',
  '2024-01-25',
  '2024-02-25',
  'BORRADOR',
  '{
    "companyName": "TECNOLOGÍA AVANZADA VENEZOLANA C.A.",
    "rif": "J-41234567-8",
    "taxpayerType": "JURIDICA",
    "address": "Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas",
    "phone": "+58 212 555-0100",
    "email": "ventas@tav.com.ve",
    "website": "www.tav.com.ve"
  }',
  '{
    "companyName": "CLÍNICA ESPECIALIZADA DEL ESTE C.A.",
    "rif": "J-30123456-8",
    "taxpayerType": "JURIDICA",
    "address": "Av. Libertador, Edificio Médico Los Palos Grandes, Caracas",
    "phone": "+58 212 555-0400",
    "email": "administracion@clinicaeste.com",
    "contactPerson": "Dra. Ana Martínez"
  }',
  '{
    "totalSales": 200000.00,
    "nonTaxableSales": 0,
    "taxableSales": 172413.79,
    "taxDebit": 27586.21,
    "ivaRetention": 0,
    "islrRetention": 0,
    "municipalRetention": 0,
    "igtf": 0,
    "currency": "VES",
    "exchangeRate": 1
  }',
  '[
    {
      "description": "Sistema de Historia Clínica Digital",
      "quantity": 1,
      "unitPrice": 150000.00,
      "total": 150000.00
    },
    {
      "description": "Módulo de Citas Médicas",
      "quantity": 1,
      "unitPrice": 50000.00,
      "total": 50000.00
    }
  ]',
  '[]',
  'Sistema integral de gestión médica',
  '11111111-1111-1111-1111-111111111111'
);

-- Facturas para la segunda organización
INSERT INTO invoices (
  id,
  organization_id,
  client_id,
  invoice_number,
  control_number,
  document_type,
  issue_date,
  due_date,
  status,
  issuer,
  client_info,
  financial,
  items,
  attachments,
  notes,
  created_by
) VALUES 
(
  '22222222-2222-2222-2222-222222222201',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222201',
  'F-2024-001',
  '00-0009001',
  'FACTURA',
  '2024-01-10',
  '2024-02-10',
  'PAGADA',
  '{
    "companyName": "CONSULTORÍA EMPRESARIAL DEL CARIBE C.A.",
    "rif": "J-30123456-9",
    "taxpayerType": "JURIDICA",
    "address": "Av. Libertador, Edificio Empresarial, Piso 8, Caracas",
    "phone": "+58 212 555-0200",
    "email": "info@consultoriacaribe.com",
    "website": "www.consultoriacaribe.com"
  }',
  '{
    "companyName": "COLEGIO SANTA MARÍA C.A.",
    "rif": "J-30123456-0",
    "taxpayerType": "JURIDICA",
    "address": "Av. Universidad, Edificio Educativo, Caracas",
    "phone": "+58 212 555-0700",
    "email": "administracion@colegiosantamaria.com",
    "contactPerson": "Prof. Elena Vargas"
  }',
  '{
    "totalSales": 75000.00,
    "nonTaxableSales": 0,
    "taxableSales": 64655.17,
    "taxDebit": 10344.83,
    "ivaRetention": 0,
    "islrRetention": 0,
    "municipalRetention": 0,
    "igtf": 0,
    "currency": "VES",
    "exchangeRate": 1
  }',
  '[
    {
      "description": "Consultoría en Gestión Educativa",
      "quantity": 30,
      "unitPrice": 2000.00,
      "total": 60000.00
    },
    {
      "description": "Capacitación Docente",
      "quantity": 10,
      "unitPrice": 1500.00,
      "total": 15000.00
    }
  ]',
  '[]',
  'Proyecto de mejora educativa',
  '22222222-2222-2222-2222-222222222222'
),
(
  '22222222-2222-2222-2222-222222222202',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222202',
  'F-2024-002',
  '00-0009002',
  'FACTURA',
  '2024-01-18',
  '2024-02-18',
  'ENVIADA',
  '{
    "companyName": "CONSULTORÍA EMPRESARIAL DEL CARIBE C.A.",
    "rif": "J-30123456-9",
    "taxpayerType": "JURIDICA",
    "address": "Av. Libertador, Edificio Empresarial, Piso 8, Caracas",
    "phone": "+58 212 555-0200",
    "email": "info@consultoriacaribe.com",
    "website": "www.consultoriacaribe.com"
  }',
  '{
    "companyName": "RESTAURANTE EL BUEN SABOR C.A.",
    "rif": "J-40123456-1",
    "taxpayerType": "JURIDICA",
    "address": "Centro Comercial, Local 15, Valencia",
    "phone": "+58 241 555-0800",
    "email": "gerencia@buensabor.com",
    "contactPerson": "Chef Miguel Torres"
  }',
  '{
    "totalSales": 45000.00,
    "nonTaxableSales": 0,
    "taxableSales": 38793.10,
    "taxDebit": 6206.90,
    "ivaRetention": 0,
    "islrRetention": 0,
    "municipalRetention": 0,
    "igtf": 0,
    "currency": "VES",
    "exchangeRate": 1
  }',
  '[
    {
      "description": "Consultoría en Gestión de Restaurante",
      "quantity": 20,
      "unitPrice": 2000.00,
      "total": 40000.00
    },
    {
      "description": "Análisis de Costos",
      "quantity": 1,
      "unitPrice": 5000.00,
      "total": 5000.00
    }
  ]',
  '[]',
  'Optimización de operaciones gastronómicas',
  '22222222-2222-2222-2222-222222222222'
);

-- =====================================================
-- 3. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Datos de prueba insertados exitosamente';
    RAISE NOTICE '📊 Clientes creados: 8 (5 para Org 1, 3 para Org 2)';
    RAISE NOTICE '📄 Facturas creadas: 5 (3 para Org 1, 2 para Org 2)';
    RAISE NOTICE '💰 Total facturado Org 1: Bs. 410,000.00';
    RAISE NOTICE '💰 Total facturado Org 2: Bs. 120,000.00';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Próximos pasos:';
    RAISE NOTICE '1. Probar login con usuarios creados';
    RAISE NOTICE '2. Verificar dashboard muestra estadísticas reales';
    RAISE NOTICE '3. Probar CRUD de clientes y facturas';
    RAISE NOTICE '4. Verificar aislamiento entre organizaciones';
END $$;
