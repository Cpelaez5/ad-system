# 📁 .agent - Documentación para Desarrollo con IA

> Contexto completo del proyecto para asistentes de IA.

---

## 🚀 Inicio Rápido

```
¿Qué necesitas?                    → Archivo a consultar
─────────────────────────────────────────────────────────
Reglas de desarrollo               → rules/rules.md
Estructura del proyecto            → context/proyecto.md
Cómo usar una librería             → libs/[libreria].md
API de un servicio                 → context/services.md
Estructura de la BD                → database/schema.md
Templates de código                → context/templates.md
Manejo de errores                  → context/error-handling.md
Workflows automatizados            → workflows/
```

---

## 📂 Estructura de Carpetas

```
.agent/
├── README.md              ← ESTE ARCHIVO (punto de entrada)
├── rules/
│   └── rules.md           ← Reglas de desarrollo (LEER SIEMPRE)
├── context/               ← Contexto del proyecto (13 archivos)
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
├── libs/                  ← 21 cheat sheets de librerías
│   └── [ver rules.md sección 9 para lista completa]
└── workflows/             ← Comandos /slash (7 archivos)
    ├── dev.md             → /dev
    ├── deploy.md          → /deploy
    ├── nueva-migracion.md → /nueva-migracion
    ├── nuevo-componente.md→ /nuevo-componente
    ├── nuevo-servicio.md  → /nuevo-servicio
    ├── testing.md         → /testing
    └── exportar.md        → /exportar
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

**Última actualización**: Febrero 2026
