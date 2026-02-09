# 📊 Sistema de Contabilidad Multi-Tenant

> **Contexto consolidado para IA** - Versión limpia sin logs históricos

---

## Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Vue 3 | ^3.4.0 |
| UI | Vuetify 3 | ^3.4.0 |
| Backend | Supabase | ^2.75.0 |
| Build | Vite | ^5.0.0 |
| Estado | Pinia | ^2.1.0 |
| Gráficos | Chart.js | ^4.4.1 |
| OCR | Tesseract.js | ^6.0.1 |
| Export | ExcelJS, jsPDF, html2pdf |
| Drag & Drop | Swapy | ^1.0.5 |

---

## Arquitectura Multi-Tenant

### Tipos de Empresas

1. **Organización** (`organizations`)
   - Empresa contadora que presta servicios
   - Tiene usuarios: admin, contador
   - Puede tener múltiples clientes

2. **Cliente** (`clients`)
   - Empresa que recibe servicios contables
   - Asociada a una organización
   - Tiene usuarios: cliente

### Jerarquía de Datos
```
ORGANIZACIÓN (organizations)
  ├── Usuarios admin/contador
  └── CLIENTES (clients)
      ├── Usuarios cliente
      ├── Facturas (invoices)
      └── Documentos (documents)
```

---

## Roles de Usuario

| Rol | Acceso | organization_id | client_id |
|-----|--------|-----------------|-----------|
| `super_admin` | Todo el sistema | NULL | NULL |
| `admin` | Su organización + usuarios | ✅ | NULL |
| `contador` | Todos los clientes de su org | ✅ | NULL |
| `cliente` | Solo sus propios datos | ✅ | ✅ |

---

## Estructura de Carpetas

```
src/
├── components/
│   ├── common/      # 19 componentes reutilizables
│   ├── forms/       # InvoiceForm, ClientInvoiceForm
│   ├── chart/       # BarChart, PieChart
│   └── layout/      # Sidebar, AppNavigation, Header
├── views/
│   ├── shared/      # Login, Dashboard, SignUp
│   ├── cliente/     # Dashboard, MiArea, Compras, Gastos
│   ├── contador/    # Clientes, Facturacion, Archivo, etc.
│   └── admin/       # Usuarios
├── services/        # 15 servicios (API + lógica)
├── router/          # Rutas + guards por rol
└── styles/          # global.css, animations.css
```

---

## Módulos Principales

### Facturación
- CRUD completo de facturas
- OCR con DeepSeek Vision + Tesseract.js fallback
- Multi-moneda: VES, USD, EUR
- Integración BCV para tasas de cambio
- Estados: BORRADOR, EMITIDA, ENVIADA, PAGADA, VENCIDA, ANULADA

### Clientes
- Gestión de empresas cliente
- Asociación a organización
- Historial de facturas

### Archivo Digital
- Supabase Storage
- Upload drag & drop
- Categorización de documentos

### Dashboard
- Estadísticas en tiempo real
- Gráficos interactivos
- Cards arrastrables (Swapy)

---

## Identidad Visual

### Colores Corporativos
```css
--primary: #A81C22;     /* Rojo */
--secondary: #1F355C;   /* Azul oscuro */
--accent: #E0B04F;      /* Amarillo dorado */
--background: #efefef;  /* Gris claro */
```

### Tipografía
- **Montserrat**: Títulos, navegación
- **Open Sans**: Contenido

### Stats Cards
```css
--stats-dark: #02254d;  /* Totales */
--stats-red: #961112;   /* Alertas */
--stats-gold: #f2b648;  /* Ingresos */
--stats-beige: #f0d29b; /* Secundarios */
```

---

## Servicios Clave

| Servicio | Responsabilidad |
|----------|-----------------|
| `userService.js` | Auth, usuarios, roles |
| `invoiceService.js` | CRUD facturas, stats |
| `clientService.js` | CRUD clientes |
| `bcvService.js` | Tasas BCV, conversión |
| `ocrService.js` | OCR con DeepSeek/Tesseract |
| `documentService.js` | Archivos en Storage |
| `exportService.js` | PDF, Excel |

---

## URLs Importantes

- **Producción**: https://ad-businessgroup.netlify.app
- **API BCV**: https://bcv-api.rafnixg.dev/rates/
- **Supabase**: Dashboard en supabase.com

---

## Usuario de Prueba

```
admin@sistema.local / admin123
contador@sistema.local / contador123
```

---

**Ver más detalles en**:
- `arquitectura.md` - Relaciones entre empresas
- `seguridad.md` - Políticas RLS
- `modulos.md` - Gastos vs Compras organización
- `vistas_por_rol.md` - Vistas por tipo de usuario
