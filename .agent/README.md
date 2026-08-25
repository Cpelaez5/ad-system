# 📁 .agent - Documentación para Desarrollo con IA

> Contexto completo del proyecto para asistentes de IA optimizado para Antigravity.

---

## 🚀 Inicio Rápido

```
¿Qué necesitas?                    → Archivo a consultar
─────────────────────────────────────────────────────────
Reglas de desarrollo (Globales)    → rules/rules.md
Reglas de BD/Supabase              → ../migrations/GEMINI.md
Reglas de Componentes/UI           → ../src/components/GEMINI.md
Reglas de Vistas por Rol           → ../src/views/GEMINI.md
Estructura del proyecto            → context/proyecto.md
Cómo usar una librería             → libs/[libreria].md
API de un servicio                 → context/services.md
Estructura de la BD                → database/schema.md
Templates de código                → context/templates.md
Manejo de errores                  → context/error-handling.md
Skills y Automatizaciones          → skills/
```

---

## 📂 Estructura de Carpetas

```
.agent/
├── README.md              ← ESTE ARCHIVO (punto de entrada)
├── rules/
│   └── rules.md           ← Reglas de desarrollo globales
├── context/               ← Contexto del proyecto
│   ├── proyecto.md        ← Tech stack, arquitectura
│   ├── arquitectura.md    ← Multi-tenancy
│   ├── modulos.md         ← Módulos del sistema
│   ├── vistas.md          ← Organización de vistas
│   ├── vistas_por_rol.md  ← Permisos por rol
│   ├── seguridad.md       ← RLS y seguridad
│   ├── services.md        ← API de servicios existentes
│   ├── templates.md       ← Templates de código
│   ├── error-handling.md  ← Patrones de manejo de errores
│   ├── router.md          ← Rutas y guards
│   ├── env-variables.md   ← Variables de entorno
│   ├── utils.md           ← Helpers (tenantHelpers)
│   ├── visual-identity.md ← Guía de estilos y diseño
│   └── plantillas.md      ← Templates Excel
├── components/
│   ├── index.md           ← Índice de componentes
│   └── README_*.md        ← Docs de componentes específicos
├── database/
│   ├── schema.md          ← Schema de tablas
│   └── row-level-security.mdx
├── libs/                  ← Cheat sheets de librerías
└── skills/                ← Skills nativas de Antigravity (automatizaciones)
    ├── dev/               → Iniciar entorno
    ├── deploy/            → Deploy a prod
    ├── nueva-migracion/   → Scaffold BD
    ├── nuevo-componente/  → Scaffold UI
    ├── nuevo-servicio/    → Scaffold lógica
    ├── testing/           → QA roles
    └── exportar/          → Docs xls/pdf
```

---

## 🔑 Reglas Clave (Resumen)

1. **Vistas separadas por rol**: `views/cliente/`, `views/contador/`, etc.
2. **Multi-tenancy**: SIEMPRE filtrar por `organization_id`
3. **Soft delete**: Usar `status = 'ANULADA'` en vez de DELETE
4. **Documentar cambios**: Actualizar `.agent/` cuando modifiques el proyecto

---

## 🎨 Colores del Proyecto

```css
--primary: #A81C22;     /* Rojo corporativo */
--secondary: #1F355C;   /* Azul oscuro */
--accent: #E0B04F;      /* Amarillo dorado */
```

---

## 👥 Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Cliente | `carlosleonelpelaez@gmail.com` | `cliente123` |
| Contador | `cpelea121@gmail.com` | `contador123` |
| Admin | `cpelaez0811@gmail.com` | `admin123` |
| Super Admin | `carloslpelaezq@gmail.com` | `superadmin123` |

---

**Última actualización**: Agosto 2026
