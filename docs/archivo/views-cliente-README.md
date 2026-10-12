# 📁 Vistas del Módulo Cliente

Este directorio contiene las vistas específicas para el rol `cliente`.

## 📋 Estructura

- **ClienteMiArea.vue (Perfil)**: Gestión de datos personales, empresa y seguridad.
- **Dashboard.vue**: Panel principal con estadísticas.
- **Facturacion.vue**: Emisión de documentos y gestión de compras/ventas/gastos.
- **Fiscal360.vue**: Expediente fiscal digital.
- **Inventario.vue**: Gestión de inventario simple.
- **Archivo.vue**: Archivo digital de documentos.

## 👤 Perfil de Cliente (Mi Área)

El componente `ClienteMiArea.vue` ha sido refactorizado para funcionar como el **Módulo de Perfil**.

### Accesos
El perfil es accesible desde dos puntos:
1. **Sidebar Lateral**: Item "Mi Perfil".
2. **Navbar Superior**: Menú de usuario (Avatar) -> "Mi Perfil".

> **Nota de UX**: Se recomienda el acceso desde el Navbar como punto principal para configuraciones personales.

### Funcionalidades
- Edición de nombre y apellido.
- Edición de datos fiscales de la empresa (Razón Social, Dirección, Teléfono, Actividad).
- Cambio de contraseña integrado con Supabase Auth.
