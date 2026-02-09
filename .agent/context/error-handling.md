# 🛡️ Manejo de Errores - Patrones del Proyecto

> Guía de cómo manejar errores de Supabase, validaciones y UI.

---

## 1. Errores en Servicios (Supabase)

### Patrón básico

```javascript
async function getData() {
  try {
    const { data, error } = await supabase
      .from('tabla')
      .select('*')
      .eq('organization_id', getCurrentOrganizationId())

    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error al obtener datos:', error)
    throw error // Re-lanzar para que el componente lo maneje
  }
}
```

### Errores comunes de Supabase

| Código | Significado | Cómo manejar |
|--------|-------------|--------------|
| `PGRST116` | No se encontró el registro | Mostrar "No encontrado" |
| `23505` | Violación de unique (duplicado) | "Este registro ya existe" |
| `23503` | Violación de FK | "No se puede eliminar, tiene datos relacionados" |
| `42501` | Sin permisos (RLS) | "No tienes permisos para esta acción" |
| `23514` | Violación de check constraint | Validar datos antes de enviar |

---

## 2. Manejo en Componentes Vue

### Con AppSnackbar (patrón del proyecto)

```vue
<script>
import invoiceService from '@/services/invoiceService'

export default {
  data() {
    return {
      loading: false,
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    }
  },
  
  methods: {
    async saveInvoice() {
      this.loading = true
      
      try {
        await invoiceService.createInvoice(this.formData)
        
        this.showSnackbar('Factura guardada correctamente', 'success')
        this.$router.push('/facturas')
        
      } catch (error) {
        console.error('Error:', error)
        this.showSnackbar(this.getErrorMessage(error), 'error')
        
      } finally {
        this.loading = false
      }
    },
    
    showSnackbar(message, color = 'success') {
      this.snackbar = { show: true, message, color }
    },
    
    getErrorMessage(error) {
      // Mapeo de errores comunes
      const errorMessages = {
        '23505': 'Este número de factura ya existe',
        '23503': 'No se puede eliminar, tiene datos relacionados',
        '42501': 'No tienes permisos para esta acción',
        'PGRST116': 'El registro no fue encontrado'
      }
      
      const code = error?.code || error?.message
      return errorMessages[code] || 'Ocurrió un error. Intenta de nuevo.'
    }
  }
}
</script>
```

---

## 3. Validaciones de Formulario (Vuetify)

### Rules comunes

```javascript
// En el componente
data() {
  return {
    rules: {
      required: v => !!v || 'Este campo es requerido',
      
      email: v => !v || /.+@.+\..+/.test(v) || 'Email inválido',
      
      rif: v => !v || /^[JGVEP]-\d{8}-\d$/.test(v) || 'Formato: J-12345678-9',
      
      positive: v => !v || v > 0 || 'Debe ser mayor a 0',
      
      minLength: min => v => !v || v.length >= min || `Mínimo ${min} caracteres`,
      
      maxLength: max => v => !v || v.length <= max || `Máximo ${max} caracteres`
    }
  }
}
```

### Uso en template

```vue
<v-text-field
  v-model="form.email"
  label="Email"
  :rules="[rules.required, rules.email]"
/>

<v-text-field
  v-model="form.rif"
  label="RIF"
  :rules="[rules.required, rules.rif]"
  placeholder="J-12345678-9"
/>
```

### Validar antes de submit

```javascript
async submitForm() {
  // Validar formulario
  const { valid } = await this.$refs.form.validate()
  
  if (!valid) {
    this.showSnackbar('Por favor completa todos los campos', 'warning')
    return
  }
  
  // Continuar con guardado...
}
```

---

## 4. Estados de Loading

### Botón con loading

```vue
<v-btn
  :loading="loading"
  :disabled="loading"
  color="primary"
  @click="save"
>
  {{ loading ? 'Guardando...' : 'Guardar' }}
</v-btn>
```

### Tabla con loading

```vue
<v-data-table
  :items="invoices"
  :loading="loading"
  loading-text="Cargando facturas..."
>
```

### Skeleton loader

```vue
<template v-if="loading">
  <v-skeleton-loader type="table-heading, table-tbody" />
</template>
<template v-else>
  <v-data-table :items="items" />
</template>
```

---

## 5. Errores de Red / Offline

```javascript
async fetchData() {
  try {
    const data = await invoiceService.getInvoices()
    this.invoices = data
  } catch (error) {
    if (!navigator.onLine) {
      this.showSnackbar('Sin conexión a internet', 'error')
    } else if (error.message?.includes('Failed to fetch')) {
      this.showSnackbar('Error de conexión con el servidor', 'error')
    } else {
      this.showSnackbar('Error al cargar datos', 'error')
    }
  }
}
```

---

## 6. Confirmación de Acciones Destructivas

```vue
<template>
  <v-dialog v-model="deleteDialog" max-width="400">
    <v-card>
      <v-card-title>¿Eliminar factura?</v-card-title>
      <v-card-text>
        Esta acción no se puede deshacer.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" @click="confirmDelete">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
methods: {
  openDeleteDialog(item) {
    this.itemToDelete = item
    this.deleteDialog = true
  },
  
  async confirmDelete() {
    try {
      await invoiceService.deleteInvoice(this.itemToDelete.id)
      this.showSnackbar('Factura eliminada', 'success')
      this.fetchInvoices()
    } catch (error) {
      this.showSnackbar('Error al eliminar', 'error')
    } finally {
      this.deleteDialog = false
    }
  }
}
</script>
```

---

## Resumen

| Situación | Qué hacer |
|-----------|-----------|
| Error de Supabase | Mapear código a mensaje amigable |
| Validación de form | Usar rules de Vuetify |
| Loading | Mostrar estado en botón/tabla |
| Acción destructiva | Confirmar con dialog |
| Sin conexión | Detectar y mostrar mensaje |
