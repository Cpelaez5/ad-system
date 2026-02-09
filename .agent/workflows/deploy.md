---
description: Build y deploy a producción
---

## Pre-requisitos

1. Verificar que todos los cambios estén guardados
2. Verificar que no hay errores en consola de desarrollo

## Pasos

// turbo
1. Ejecutar `npm run build`

2. Verificar que la carpeta `dist/` se generó correctamente

3. Revisar que no hay errores ni warnings críticos en el build

4. Hacer commit y push a GitHub:
   ```bash
   git add .
   git commit -m "feat: [descripción del cambio]"
   git push origin main
   ```

5. Verificar deploy automático en hosting (Vercel/Netlify)

6. Probar la aplicación en producción con usuarios de prueba

## Si hay errores de build

1. Revisar imports faltantes
2. Verificar que no hay variables no definidas
3. Revisar que todos los componentes usados están importados
