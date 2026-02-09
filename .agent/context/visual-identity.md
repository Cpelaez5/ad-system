# 🎨 Identidad Visual y Sistema de Diseño

> Documentación de los estilos globales, colores y tipografía del proyecto.

---

## 1. Colores Principales

Están definidos como variables CSS (custom properties) en `src/styles/global.css`.

| Variable | Color | Hex | Uso Principal |
|----------|-------|-----|---------------|
| `--color-primary` | 🔴 Rojo | `#A81C22` | Botones principales, enlaces, bordes activos |
| `--color-secondary` | 🔵 Azul Oscuro | `#1F355C` | Textos secundarios, hovers, elementos de UI |
| `--color-accent` | 🟡 Amarillo | `#E0B04F` | Botones secundarios, alertas, destacados |
| `--color-background` | ⚪ Gris Claro | `#efefef` | Fondo general de la aplicación |
| `--color-surface` | ⚪ Gris Medio | `#E0E0E0` | Bordes, separadores, fondos de cards |

### Estados
- **Error**: `#A81C22` (Igual al primario)
- **Success**: `#4CAF50` (Verde estándar)
- **Warning**: `#E0B04F` (Igual al accent)
- **Info**: `#1F355C` (Igual al secundario)

---

## 2. Tipografía

El proyecto utiliza dos familias tipográficas de Google Fonts:

1. **Montserrat** (Principal)
   - Uso: Títulos, botones, inputs, navegación, y casi todo el sistema.
   - Pesos: 300, 400, 500, 600, 700, 800.
   - Variable CSS: `--font-primary`

2. **Open Sans** (Secundaria)
   - Uso: Párrafos lagos, textos de lectura densa.
   - Pesos: 300, 400, 500, 600, 700, 800.
   - Variable CSS: `--font-secondary`

> **Nota Importante**: Existe una regla CSS global con `!important` que fuerza **Montserrat** en casi todos los componentes de Vuetify para mantener la consistencia de marca.

---

## 3. Componentes y Estilos Globales

### Botones (`.v-btn`)
- **Border Radius**: `10px` (fijo)
- **Padding**: `8px 16px`
- **Sombra**: Ninguna (`box-shadow: none`)

### Cards, Inputs y Elementos UI
- **Border Radius**: `20px` (Mucha curvatura)
  - Aplica a: `.v-card`, `.v-text-field`, `.v-dialog`, `.v-menu`, etc.
- **Sombra**: Eliminada globalmente (`box-shadow: none !important`)
- **Padding**: `20px` generalizado

### Inputs (`.v-text-field`)
- Estilo "Outlined" personalizado
- Borde de 2px
- Color de borde: `--color-surface`
- Focus: Borde color primario y ring de 3px

### Stats Cards
- **Números**: `font-weight: 600` (Semi-Bold) para mejor legibilidad sin ser excesivo.
- **Títulos**: `font-weight: 400` (Regular).

---

## 4. Espaciado (Design Tokens)

| Variable | Valor | Uso |
|----------|-------|-----|
| `--spacing-xs` | 4px | Márgenes mínimos |
| `--spacing-sm` | 8px | Separación entre iconos/texto |
| `--spacing-md` | 16px | Padding estándar |
| `--spacing-lg` | 24px | Separación de secciones |
| `--spacing-xl` | 32px | Márgenes grandes |
| `--spacing-2xl` | 48px | Separadores de layout |

---

## 5. Animaciones

Importadas desde `src/styles/animations.css`:

- **Transiciones**:
  - `fast`: 0.15s
  - `normal`: 0.3s (estándar para hovers)
  - `slow`: 0.5s

- **Clases Disponibles**:
  - `fade-enter-active` / `fade-leave-active`: Desvanecimiento suave
  - `slide-up-enter-active`: Deslizar hacia arriba al aparecer

---

## 6. Reglas para Nuevos componentes

1. **NO usar sombras**: El diseño es "flat" pero con bordes definidos.
2. **Bordes redondeados**: Usar siempre `20px` para contenedores y `10px` para botones.
3. **Fuentes**: No definir `font-family` manualmente, heredar de `body` (Montserrat).
4. **Colores**: Usar siempre las variables CSS (`var(--color-primary)`), nunca hex codes *hardcodeados*.

### Ejemplo de Estilo Correcto
```css
.mi-componente {
  background-color: var(--color-white);
  border: 1px solid var(--color-surface);
  border-radius: var(--radius-lg); /* 20px */
  padding: var(--spacing-md);      /* 16px */
  font-family: var(--font-primary);
}
```
