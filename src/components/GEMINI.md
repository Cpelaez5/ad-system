---
trigger: always_on
---

# 🎨 Reglas de UX/UI y Componentes Vue

## PRIORIDAD de componentes:

1. Componentes Vuetify nativos (v-btn, v-card, v-dialog)
2. Componentes custom existentes (`src/components/common/`)
3. Crear componente nuevo (ÚLTIMA opción)

## Componentes existentes (NO modificar directamente):
- `common/`: Componentes genéricos reutilizables
- `forms/`: Formularios específicos
- `chart/`: Gráficos Chart.js
- `layout/`: Sidebar, AppNavigation, Header

**Si necesitas personalización:**
❌ NO modificar componente existente
✅ Crear componente NUEVO basado en el existente
✅ Documentar en `.agent/components/` con README
✅ Agregar al índice `index.md`

## Paleta de Colores Corporativa:
```css
/* Usar SIEMPRE estos colores */
--primary: #A81C22;     /* Rojo corporativo */
--secondary: #1F355C;   /* Azul oscuro */
--accent: #E0B04F;      /* Amarillo dorado */
--background: #efefef;  /* Gris claro */

/* Para Stats Cards */
--stats-dark: #02254d;
--stats-red: #961112;
--stats-gold: #f2b648;
--stats-beige: #f0d29b;
```

## Tipografía y Patrones:
- **Títulos**: Montserrat (font-weight: 600-700)
- **Contenido**: Open Sans (font-weight: 400-500)
- Cards con border-radius: 20px
- Sombras sutiles o ninguna
- Transiciones suaves (0.3s ease)
- Mensajes de error con AppSnackbar

## Estructura Base:
```vue
<template>
  <!-- Template simple y claro -->
</template>

<script>
// Imports, Props, Data, Computed, Methods, Lifecycle
</script>

<style scoped>
/* Estilos específicos */
</style>
```

## Responsive obligatorio:
```vue
<v-col cols="12" sm="6" md="4" lg="3">
  <!-- Siempre definir breakpoints -->
</v-col>
```
