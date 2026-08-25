---
trigger: always_on
---

# 📋 RULES - Reglas de Desarrollo Globales para IA

> **Objetivo**: Mantener código limpio, mantenible y escalable para desarrolladores junior.

---

## 1. 🧹 Código Mantenible

### Principios
- **Legibilidad primero**: Código que se explica solo
- **Comentarios en español**: Explicar lógica compleja
- **Nombres descriptivos**: Variables y funciones autoexplicativas

### Principios S.O.L.I.D.
> Aplicar para código escalable y testeable

- **S (Single Responsibility)**: Una clase/función/archivo = UNA responsabilidad.
  *Ej: `InvoiceService` solo maneja facturas, no clientes.*
- **O (Open/Closed)**: Abierto a extensión, cerrado a modificación.
  *Ej: Agregar nuevos reportes sin tocar el código de los existentes.*
- **L (Liskov Substitution)**: Las subclases deben comportarse como sus padres.
- **I (Interface Segregation)**: Interfaces pequeñas y específicas > Interfaces gigantes.
- **D (Dependency Inversion)**: Depender de abstracciones, no de implementaciones concretas.
  *Ej: Componentes dependen de servicios, no de la BD directamente.*

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

---

## 2. 📝 Estructura de Documentación `.agent/`

> ⚠️ **OBLIGATORIO**: Mantener esta documentación actualizada al hacer cambios en el proyecto.

### Estructura de carpetas:

```
.agent/
├── README.md             ← Punto de entrada para IA
├── rules/
│   └── rules.md          ← Este archivo (reglas globales)
├── context/              ← Contexto general del proyecto
├── components/           ← Documentación de componentes
├── database/             ← Documentación de base de datos
├── libs/                 ← Cheat sheets de librerías
└── skills/               ← Skills de automatización nativas
```

### 🔄 Cuándo actualizar cada carpeta:

| Carpeta | Actualizar cuando... |
|---------|----------------------|
| `context/` | Cambios en arquitectura, nuevos módulos, cambios de roles |
| `components/` | Nuevo componente reutilizable, cambios en props/API de componentes |
| `database/` | Nuevas tablas, columnas, políticas RLS, migraciones |
| `libs/` | Nueva librería agregada al proyecto |
| `skills/` | Nuevo proceso automatizado o flujo recurrente |

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

Al cambiar ARQUITECTURA o MÓDULOS:
[ ] Actualizar context/proyecto.md
[ ] Actualizar context/modulos.md si es nuevo módulo
[ ] Actualizar CONTEXTO_PROYECTO.txt (registro histórico)
```

---

**Última actualización**: Agosto 2026
