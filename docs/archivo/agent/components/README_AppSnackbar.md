# 📢 AppSnackbar - Componente Reutilizable

## 📝 Descripción

Componente reutilizable para mostrar notificaciones tipo snackbar en toda la aplicación. Soporta diferentes tipos de mensajes con colores e iconos automáticos.

---

## 🎨 Tipos de Mensajes

| Tipo | Color | Icono | Uso |
|------|-------|-------|-----|
| `success` | Verde | `mdi-check-circle` | Operaciones exitosas |
| `error` | Rojo | `mdi-alert-circle` | Errores y fallos |
| `warning` | Amarillo | `mdi-alert` | Advertencias |
| `info` | Azul | `mdi-information` | Información general |

---

## 📦 Instalación

El componente está ubicado en:
```
src/components/common/AppSnackbar.vue
```

---

## 🚀 Uso Básico

### 1. Importar el componente

```vue
<script>
import AppSnackbar from '@/components/common/AppSnackbar.vue';

export default {
  components: {
    AppSnackbar
  }
}
</script>
```

### 2. Agregar al template

```vue
<template>
  <div>
    <!-- Tu contenido aquí -->
    
    <!-- Snackbar -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
      :timeout="snackbar.timeout"
    />
  </div>
</template>
```

### 3. Configurar data

```javascript
data() {
  return {
    snackbar: {
      show: false,
      message: '',
      type: 'info',
      timeout: 4000
    }
  }
}
```

### 4. Mostrar mensajes

```javascript
methods: {
  showSuccess() {
    this.snackbar = {
      show: true,
      message: '✅ Operación completada exitosamente',
      type: 'success',
      timeout: 4000
    };
  },
  
  showError() {
    this.snackbar = {
      show: true,
      message: '❌ Ocurrió un error al procesar la solicitud',
      type: 'error',
      timeout: 5000
    };
  },
  
  showWarning() {
    this.snackbar = {
      show: true,
      message: '⚠️ Esta acción no se puede deshacer',
      type: 'warning',
      timeout: 6000
    };
  },
  
  showInfo() {
    this.snackbar = {
      show: true,
      message: 'ℹ️ Procesando solicitud...',
      type: 'info',
      timeout: 3000
    };
  }
}
```

---

## 🎯 Ejemplo Completo

```vue
<template>
  <v-container>
    <v-row>
      <v-col>
        <v-btn color="success" @click="showSuccess">
          Mostrar Éxito
        </v-btn>
        
        <v-btn color="error" @click="showError">
          Mostrar Error
        </v-btn>
        
        <v-btn color="warning" @click="showWarning">
          Mostrar Advertencia
        </v-btn>
        
        <v-btn color="info" @click="showInfo">
          Mostrar Info
        </v-btn>
      </v-col>
    </v-row>
    
    <!-- Snackbar reutilizable -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
      :timeout="snackbar.timeout"
    />
  </v-container>
</template>

<script>
import AppSnackbar from '@/components/common/AppSnackbar.vue';

export default {
  name: 'ExampleComponent',
  
  components: {
    AppSnackbar
  },
  
  data() {
    return {
      snackbar: {
        show: false,
        message: '',
        type: 'info',
        timeout: 4000
      }
    };
  },
  
  methods: {
    showSuccess() {
      this.snackbar = {
        show: true,
        message: 'Operación completada exitosamente',
        type: 'success',
        timeout: 4000
      };
    },
    
    showError() {
      this.snackbar = {
        show: true,
        message: 'Ocurrió un error al procesar la solicitud',
        type: 'error',
        timeout: 5000
      };
    },
    
    showWarning() {
      this.snackbar = {
        show: true,
        message: 'Esta acción no se puede deshacer',
        type: 'warning',
        timeout: 6000
      };
    },
    
    showInfo() {
      this.snackbar = {
        show: true,
        message: 'Procesando solicitud...',
        type: 'info',
        timeout: 3000
      };
    }
  }
};
</script>
```

---

## 🔧 Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `modelValue` | Boolean | `false` | Controla la visibilidad del snackbar |
| `type` | String | `'info'` | Tipo de mensaje: `'success'`, `'error'`, `'warning'`, `'info'` |
| `message` | String | `'Operación completada'` | Mensaje a mostrar |
| `timeout` | Number | `4000` | Tiempo en ms antes de auto-cerrar (0 = no auto-cerrar) |

---

## 🎨 Personalización

### Método Helper (Recomendado)

Crear un método helper para simplificar el uso:

```javascript
methods: {
  showSnackbar(message, type = 'info', timeout = 4000) {
    this.snackbar = {
      show: true,
      message,
      type,
      timeout
    };
  }
}
```

Uso:
```javascript
// Éxito
this.showSnackbar('Factura creada correctamente', 'success');

// Error
this.showSnackbar('Error al guardar', 'error', 5000);

// Advertencia
this.showSnackbar('Revise los datos', 'warning');

// Info
this.showSnackbar('Cargando...', 'info', 2000);
```

---

## 📍 Ubicación

El snackbar aparece en la parte **superior** de la pantalla (`location="top"`).

---

## ✨ Características

- ✅ **Reutilizable** - Úsalo en cualquier componente
- ✅ **Tipado** - 4 tipos predefinidos con colores e iconos
- ✅ **Auto-cierre** - Configurable con timeout
- ✅ **Cierre manual** - Botón X para cerrar
- ✅ **Responsive** - Se adapta a diferentes tamaños
- ✅ **Multi-línea** - Soporta mensajes largos
- ✅ **Iconos automáticos** - Según el tipo de mensaje

---

## 🎯 Casos de Uso

### Formularios
```javascript
async submitForm() {
  try {
    await this.saveData();
    this.showSnackbar('Datos guardados correctamente', 'success');
  } catch (error) {
    this.showSnackbar('Error al guardar: ' + error.message, 'error');
  }
}
```

### Validaciones
```javascript
validateForm() {
  if (!this.formData.email) {
    this.showSnackbar('El email es requerido', 'warning');
    return false;
  }
  return true;
}
```

### Operaciones Asíncronas
```javascript
async loadData() {
  this.showSnackbar('Cargando datos...', 'info', 2000);
  
  try {
    const data = await fetchData();
    this.showSnackbar('Datos cargados correctamente', 'success');
  } catch (error) {
    this.showSnackbar('Error al cargar datos', 'error');
  }
}
```

---

## 🔍 Ejemplo en InvoiceForm

```vue
<template>
  <v-form>
    <!-- Formulario -->
    
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
      :timeout="snackbar.timeout"
    />
  </v-form>
</template>

<script>
import AppSnackbar from '@/components/common/AppSnackbar.vue';

export default {
  components: { AppSnackbar },
  
  data() {
    return {
      snackbar: {
        show: false,
        message: '',
        type: 'info',
        timeout: 4000
      }
    };
  },
  
  methods: {
    showSnackbar(message, type = 'info', timeout = 4000) {
      this.snackbar = { show: true, message, type, timeout };
    },
    
    async createInvoice() {
      if (!this.validateForm()) {
        this.showSnackbar('Complete todos los campos', 'error');
        return;
      }
      
      try {
        await invoiceService.create(this.formData);
        this.showSnackbar('Factura creada exitosamente', 'success');
      } catch (error) {
        this.showSnackbar('Error al crear factura', 'error');
      }
    }
  }
};
</script>
```

---

**Ubicación:** `src/components/common/AppSnackbar.vue`  
**Versión:** 1.0.0  
**Autor:** Antigravity AI
