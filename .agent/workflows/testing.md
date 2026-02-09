---
description: Testing completo antes de entregar feature
---

## Checklist de Testing

### 1. Funcionalidad básica
- [ ] La feature funciona como se espera
- [ ] No hay errores en consola del navegador
- [ ] Los datos se guardan correctamente en Supabase

### 2. Testing por rol

Probar con cada usuario según aplique:

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Cliente | `carlosleonelpelaez@gmail.com` | `cliente123` |
| Contador | `cpelea121@gmail.com` | `contador123` |
| Admin | `cpelaez0811@gmail.com` | `admin123` |
| Super Admin | `carloslpelaezq@gmail.com` | `superadmin123` |

Para cada rol verificar:
- [ ] Ve solo los datos que le corresponden (RLS)
- [ ] Los botones/acciones correctos están visibles
- [ ] No puede acceder a rutas no permitidas

### 3. Edge cases
- [ ] Campos vacíos muestran validación
- [ ] Valores límite (números muy grandes, textos largos)
- [ ] Doble click en botones de submit
- [ ] Comportamiento offline/conexión lenta

### 4. UI/UX
- [ ] Responsive: Probar en desktop y móvil
- [ ] Loading states visibles durante operaciones
- [ ] Mensajes de error claros (AppSnackbar)
- [ ] Mensajes de éxito al completar acciones

### 5. Regresión
- [ ] Features existentes siguen funcionando
- [ ] Navegación no se rompió
- [ ] Login/logout sigue funcionando

## Cómo probar

// turbo
1. Ejecutar `npm run dev`

2. Abrir navegador en http://localhost:5173

3. Probar con cada rol de la tabla

4. Verificar items del checklist

5. Si todo pasa, continuar con deploy
