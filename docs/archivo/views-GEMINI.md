---
trigger: always_on
---

# 📁 Reglas de Vistas por Rol

> ⚠️ **IMPORTANTE**: Mantener vistas separadas por rol para facilitar mantenimiento y escalabilidad.

## Estructura de carpetas en views/:
- `shared/`: Vistas accesibles por TODOS los roles (Dashboard general, Login).
- `cliente/`: Vistas SOLO para rol cliente (Dashboard simple, Facturación simplificada).
- `contador/`: Vistas para contador + admin (Dashboard avanzado, Clientes, Auditoría).
- `admin/`: Vistas exclusivas para admin + super_admin.
- `auth/`: Flujos de autenticación.

## 🔑 Regla de Separación de Vistas

**SIEMPRE** crear vistas separadas por rol cuando la funcionalidad difiere:
❌ MAL: Una sola `Facturacion.vue` con `v-if` para cada rol
✅ BIEN: 
   - `views/cliente/Facturacion.vue` (vista simplificada)
   - `views/contador/Facturacion.vue` (vista completa)

### ¿Cuándo crear vista separada?
- Si la vista tiene diferentes columnas en tablas → Vista separada
- Diferentes acciones/botones → Vista separada  
- Diferentes datos (seguridad/RLS) → Vista separada
- Misma UI exacta para todos → Vista en `shared/`
