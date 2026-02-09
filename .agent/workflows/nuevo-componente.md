---
description: Crear nuevo componente reutilizable
---

## Antes de crear

1. Revisar `.agent/components/index.md` para verificar que no existe algo similar
2. Revisar `src/components/common/` por componentes que puedan adaptarse

## Pasos

1. Crear archivo en `src/components/common/NombreComponente.vue`

2. Seguir estructura estándar:
   ```vue
   <template>
     <!-- Template -->
   </template>

   <script>
   export default {
     name: 'NombreComponente',
     
     props: {
       // Documentar cada prop
       title: {
         type: String,
         required: true,
         default: ''
       }
     },
     
     emits: ['evento'],
     
     // data, computed, methods...
   }
   </script>

   <style scoped>
   /* Estilos usando variables del proyecto */
   </style>
   ```

3. Si el componente es complejo, crear README:
   `src/components/common/README_NombreComponente.md`

4. Copiar README a `.agent/components/`:
   `.agent/components/README_NombreComponente.md`

5. Agregar entrada en `.agent/components/index.md`:
   ```markdown
   ### NombreComponente
   **Archivo**: `src/components/common/NombreComponente.vue`
   **Props**: title (String), ...
   **Uso**: Descripción breve
   ```

## Colores a usar

```css
--primary: #A81C22;
--secondary: #1F355C;
--accent: #E0B04F;
```
