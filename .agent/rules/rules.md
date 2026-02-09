---
trigger: always_on
---

# 📋 RULES - Reglas de Desarrollo para IA

> **Objetivo**: Mantener código limpio, mantenible y escalable para desarrolladores junior.

---

## 1. 🧹 Código Mantenible

### Principios
- **Legibilidad primero**: Código que se explica solo
- **Comentarios en español**: Explicar lógica compleja
- **Nombres descriptivos**: Variables y funciones autoexplicativas

### Nomenclatura
```javascript
// Variables y funciones: camelCase
const totalFacturas = 0
function calcularImpuesto() {}

// Componentes Vue: PascalCase
CustomButton.vue
InvoiceForm.vue

// Archivos: kebab-case
invoice-service.js
bcv-rate-display.vue
```

### Estructura de Componente Vue
```vue
<template>
  <!-- Template simple y claro -->
</template>

<script>
// 1. Imports organizados por tipo
// 2. Props documentados
// 3. Data reactiva
// 4. Computed
// 5. Methods
// 6. Lifecycle hooks
</script>

<style scoped>
/* Estilos específicos del componente */
</style>
```

---

## 2. 🧩 Reglas de Componentes

### ANTES de crear un componente nuevo:

1. **VERIFICAR** si ya existe en `src/components/`
2. **BUSCAR** componentes similares que puedan adaptarse
3. **REVISAR** el índice en `.agent/components/index.md`

### Componentes existentes (NO modificar):

| Carpeta | Uso |
|---------|-----|
| `common/` | Componentes genéricos reutilizables |
| `forms/` | Formularios específicos |
| `chart/` | Gráficos Chart.js |
| `layout/` | Sidebar, AppNavigation, Header |

### Si necesitas personalización:

```
❌ NO modificar componente existente
✅ Crear componente NUEVO basado en el existente
✅ Documentar en .agent/components/ con README
✅ Agregar al índice index.md
```

### Ejemplo de reutilización:
```vue
<!-- Usar StatsCard existente -->
<StatsCard
  title="Total Facturas"
  :value="stats.total"
  bg-color="#02254d"
/>

<!-- NO crear TotalFacturasCard.vue desde cero -->
```

---

## 3. 🗄️ Reglas de Base de Datos

### SIEMPRE documentar cambios:

1. Crear migración en `/migrations/` con nombre descriptivo:
   ```
   migrations/
   ├── 001_initial_schema.sql
   ├── 002_add_client_phone.sql
   └── 003_add_invoice_notes.sql
   ```

2. Actualizar `.agent/database/schema.md`

3. Considerar impacto en RLS (Row Level Security)

### Principios de Schema:
- **Nombres en snake_case**: `invoice_number`, `created_at`
- **UUIDs para IDs**: Evitar auto-increment
- **Soft delete**: `status = 'ANULADA'` en vez de DELETE
- **Multi-tenant**: Siempre incluir `organization_id`

### Ejemplo de migración:
```sql
-- migrations/004_add_invoice_attachment.sql
-- Descripción: Agregar columna para archivos adjuntos
-- Autor: [nombre]
-- Fecha: YYYY-MM-DD

ALTER TABLE invoices 
ADD COLUMN attachment_url TEXT;

COMMENT ON COLUMN invoices.attachment_url IS 'URL del archivo adjunto en Storage';
```

---

## 4. ✅ Reglas de Testing

### Antes de marcar como completado:

1. **Probar CRUD completo**: Create, Read, Update, Delete
2. **Probar por rol**: admin, contador, cliente
3. **Verificar RLS**: Que cada rol vea solo sus datos
4. **Probar edge cases**: Campos vacíos, valores límite

### Checklist de testing:
```
[ ] Funcionalidad nueva funciona correctamente
[ ] NO rompe funcionalidad existente
[ ] Funciona en todos los roles aplicables
[ ] Manejo de errores apropiado
[ ] Mensajes de usuario claros
[ ] Responsive (desktop + mobile)
```

### Probar con usuarios de prueba:
- Cliente: `carlosleonelpelaez@gmail.com` / `cliente123`
- Contador: `cpelea121@gmail.com` / `contador123`
- Admin: `cpelaez0811@gmail.com` / `admin123`
- Super Admin: `carloslpelaezq@gmail.com` / `superadmin123`

---

## 5. 🎨 Reglas de UX/UI y Vuetify

### PRIORIDAD de componentes:

```
1. Componentes Vuetify nativos (v-btn, v-card, v-dialog)
2. Componentes custom existentes (src/components/common/)
3. Crear componente nuevo (ÚLTIMA opción)
```

### Paleta de Colores Corporativa:
```css
/* Usar SIEMPRE estos colores */
--primary: #A81C22;     /* Rojo corporativo */
--secondary: #1F355C;   /* Azul oscuro */
--accent: #E0B04F;      /* Amarillo dorado */
--background: #efefef;  /* Gris claro */

/* Para Stats Cards (ver StatsCard.vue) */
--stats-dark: #02254d;  /* Totales */
--stats-red: #961112;   /* Alertas, egresos */
--stats-gold: #f2b648;  /* Ingresos */
--stats-beige: #f0d29b; /* Secundarios */
```

### Tipografía:
- **Títulos**: Montserrat (font-weight: 600-700)
- **Contenido**: Open Sans (font-weight: 400-500)

### Patrones de diseño a seguir:
- ✅ Cards con border-radius: 20px
- ✅ Sombras sutiles o ninguna
- ✅ Transiciones suaves (0.3s ease)
- ✅ Feedback visual en hover
- ✅ Loading states claros
- ✅ Mensajes de error con AppSnackbar

### Responsive obligatorio:
```vue
<v-col cols="12" sm="6" md="4" lg="3">
  <!-- Siempre definir breakpoints -->
</v-col>
```

---

## 6. 📁 Estructura de Proyecto y Vistas por Rol

> ⚠️ **IMPORTANTE**: Mantener vistas y módulos separados por rol para facilitar mantenimiento y escalabilidad.

### Estructura de carpetas:

```
src/
├── components/
│   ├── common/     ← Reutilizables (ver .agent/components/)
│   ├── forms/      ← Formularios específicos
│   ├── chart/      ← Gráficos
│   └── layout/     ← Sidebar, Header, Navigation
├── views/
│   ├── shared/     ← Vistas accesibles por TODOS los roles
│   │   ├── Dashboard.vue
│   │   ├── Login.vue
│   │   └── SingUp.vue
│   ├── cliente/    ← Vistas SOLO para rol cliente
│   │   ├── Dashboard.vue
│   │   ├── Facturacion.vue   ← Vista simplificada
│   │   ├── Compras.vue
│   │   ├── Ventas.vue
│   │   └── ...
│   ├── contador/   ← Vistas para contador + admin
│   │   ├── Facturacion.vue   ← Vista completa con más opciones
│   │   ├── Clientes.vue
│   │   ├── Contabilidad.vue
│   │   ├── Auditoria.vue
│   │   └── ...
│   ├── admin/      ← Vistas para admin + super_admin
│   └── auth/       ← Flujos de autenticación
├── services/       ← Lógica de negocio + API
├── router/         ← Rutas + guards de roles
└── styles/         ← CSS global + animaciones
```

### 🔑 Regla de Separación de Vistas

**SIEMPRE** crear vistas separadas por rol cuando la funcionalidad difiere:

```
❌ MAL: Una sola Facturacion.vue con v-if para cada rol
✅ BIEN: 
   - views/cliente/Facturacion.vue  (vista simplificada)
   - views/contador/Facturacion.vue (vista completa)
```

### ¿Por qué separar?

| Beneficio | Descripción |
|-----------|-------------|
| **Mantenibilidad** | Cambios en vista de cliente no afectan al contador |
| **Legibilidad** | Código más pequeño y enfocado |
| **Escalabilidad** | Fácil agregar features específicas por rol |
| **Seguridad** | Menor riesgo de exponer datos entre roles |

### ¿Cuándo crear vista separada?

```
Si la vista tiene:
✅ Diferentes columnas en tablas → Vista separada
✅ Diferentes acciones/botones → Vista separada  
✅ Diferentes datos (RLS) → Vista separada
✅ Misma UI exacta para todos → Vista en shared/
```

### Ejemplo: Facturación

```
views/cliente/Facturacion.vue
├── Solo ve SUS facturas
├── Puede crear facturas simples
├── No ve opciones de anulación masiva
└── UI simplificada

views/contador/Facturacion.vue
├── Ve TODAS las facturas de la organización
├── Puede crear, editar, anular
├── Opciones de exportación fiscal
└── UI completa con filtros avanzados
```

---

## 7. 🔐 Multi-Tenancy

### SIEMPRE filtrar por organización:
```javascript
// En servicios, siempre incluir organization_id
const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('organization_id', getCurrentOrganizationId())
```

### Roles y acceso:
| Rol | Ve datos de |
|-----|-------------|
| `cliente` | Solo su empresa (client_id) |
| `contador` | Todos los clientes de su org |
| `admin` | Todos los clientes + usuarios |
| `super_admin` | Todo el sistema |

---

## 8. 📝 Estructura de Documentación `.agent/`

> ⚠️ **OBLIGATORIO**: Mantener esta documentación actualizada al hacer cambios en el proyecto.

### Estructura de carpetas:

```
.agent/
├── README.md             ← Punto de entrada para IA
├── rules/
│   └── rules.md          ← Este archivo (reglas para IA)
├── context/              ← Contexto general del proyecto (13 archivos)
│   ├── proyecto.md       ← Tech stack, arquitectura, roles
│   ├── arquitectura.md   ← Multi-tenancy
│   ├── seguridad.md      ← RLS y seguridad
│   ├── modulos.md        ← Módulos del sistema
│   ├── vistas.md         ← Organización de vistas
│   ├── vistas_por_rol.md ← Permisos por rol
│   ├── plantillas.md     ← Templates Excel
│   ├── services.md       ← API de servicios existentes
│   ├── templates.md      ← Templates de código
│   ├── error-handling.md ← Manejo de errores
│   ├── router.md         ← Rutas y guards
│   ├── env-variables.md  ← Variables de entorno
│   └── utils.md          ← Helpers y utilidades
├── components/           ← Documentación de componentes
│   ├── index.md          ← Índice de todos los componentes
│   └── README_*.md       ← READMEs de componentes específicos
├── database/             ← Documentación de base de datos
│   ├── schema.md         ← Schema de tablas
│   └── row-level-security.mdx  ← Docs oficiales RLS
├── libs/                 ← Cheat sheets de librerías (21 archivos)
│   └── [libreria].md     ← Ver sección 9
└── workflows/            ← Comandos /slash (7 archivos)
    ├── dev.md            → /dev
    ├── deploy.md         → /deploy
    ├── nueva-migracion.md→ /nueva-migracion
    ├── nuevo-componente.md → /nuevo-componente
    ├── nuevo-servicio.md → /nuevo-servicio
    ├── testing.md        → /testing
    └── exportar.md       → /exportar
```

### 🔄 Cuándo actualizar cada carpeta:

| Carpeta | Actualizar cuando... |
|---------|----------------------|
| `context/` | Cambios en arquitectura, nuevos módulos, cambios de roles |
| `components/` | Nuevo componente reutilizable, cambios en props/API de componentes |
| `database/` | Nuevas tablas, columnas, políticas RLS, migraciones |
| `libs/` | Nueva librería agregada al proyecto |
| `workflows/` | Nuevo proceso automatizado o script de despliegue |

### ✅ Checklist de actualización:

```
Al crear/modificar un COMPONENTE:
[ ] Agregar/actualizar entrada en components/index.md
[ ] Crear README si es componente reutilizable

Al modificar la BASE DE DATOS:
[ ] Actualizar database/schema.md
[ ] Documentar nuevas políticas RLS si aplica
[ ] Crear migración en /migrations/

Al agregar nueva LIBRERÍA:
[ ] Crear cheat sheet en libs/[nombre].md
[ ] Actualizar tabla en sección 9 de este archivo

Al cambiar ARQUITECTURA o MÓDULOS:
[ ] Actualizar context/proyecto.md
[ ] Actualizar context/modulos.md si es nuevo módulo
[ ] Actualizar CONTEXTO_PROYECTO.txt (registro histórico)
```

---

## 9. 📚 Documentación de Librerías

### Ubicación: `.agent/libs/`

Toda la documentación de librerías del proyecto está en esta carpeta. **SIEMPRE consultar antes de usar una librería.**

### Librerías documentadas (21 archivos):

| Categoría | Librerías | Archivos |
|-----------|-----------|----------|
| **Core Vue** | Vue 3, Vue Router, Pinia | `vue.md`, `vue-router.md`, `pinia.md` |
| **UI** | Vuetify 3, MDI Icons | `vuetify.md`, `MaterialDesign-Webfont.md` |
| **Backend** | Supabase | `supabase.md` (incluye RLS, Realtime) |
| **Gráficos** | Chart.js | `chartjs.md` |
| **Fechas** | date-fns | `date-fns.md` |
| **Excel** | ExcelJS, SheetJS | `exceljs.md`, `sheetjs.md` + READMEs |
| **PDF** | jsPDF, pdf-lib, pdfjs-dist | `jsPDF.md`, `pdf-lib.md`, `pdfjs-dist.md` |
| **Captura** | html2canvas | `html2canvas.md` |
| **OCR** | Tesseract.js | `tesseract.md` + README |
| **HTTP** | Axios | `axios.md` |
| **UI Utils** | Swapy, Vue Datepicker, file-saver | `swapy.md`, `Vue-datepicker.md`, `file-saver.md` |

### Cómo usar esta documentación:

```
1. ¿Necesitas trabajar con Excel?
   → Revisa .agent/libs/exceljs.md o .agent/libs/sheetjs.md

2. ¿Necesitas formatear fechas?
   → Revisa .agent/libs/date-fns.md

3. ¿Necesitas generar PDF?
   → Revisa .agent/libs/jsPDF.md
```

### Formato de cada cheat sheet:
- Ejemplos prácticos listos para copiar/pegar
- Patrones específicos usados en este proyecto
- Tips de performance cuando aplica

---

**Última actualización**: Febrero 2026


