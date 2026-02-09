# 🎨 Vuetify 3 - Cheat Sheet

> Componentes más usados en este proyecto

---

## Layout y Grid

```vue
<!-- Container -->
<v-container fluid>
  <!-- Row con columnas responsivas -->
  <v-row>
    <v-col cols="12" sm="6" md="4" lg="3">
      <!-- Contenido -->
    </v-col>
  </v-row>
</v-container>

<!-- Spacer -->
<v-row>
  <v-col>Izquierda</v-col>
  <v-spacer></v-spacer>
  <v-col>Derecha</v-col>
</v-row>
```

### Breakpoints
| Código | Tamaño | Ejemplo |
|--------|--------|---------|
| xs | < 600px | Móvil |
| sm | ≥ 600px | Tablet vertical |
| md | ≥ 960px | Tablet horizontal |
| lg | ≥ 1280px | Desktop |
| xl | ≥ 1920px | Desktop grande |

---

## Cards

```vue
<v-card 
  class="pa-4" 
  elevation="2"
  rounded="lg"
>
  <v-card-title>Título</v-card-title>
  <v-card-subtitle>Subtítulo</v-card-subtitle>
  <v-card-text>Contenido</v-card-text>
  <v-card-actions>
    <v-btn>Acción</v-btn>
  </v-card-actions>
</v-card>

<!-- Card clickeable -->
<v-card :to="{ name: 'Detalle', params: { id: item.id } }">
  ...
</v-card>
```

---

## Buttons

```vue
<!-- Variantes -->
<v-btn color="primary">Filled</v-btn>
<v-btn color="primary" variant="outlined">Outlined</v-btn>
<v-btn color="primary" variant="text">Text</v-btn>
<v-btn color="primary" variant="tonal">Tonal</v-btn>

<!-- Con icono -->
<v-btn color="success" prepend-icon="mdi-check">
  Guardar
</v-btn>

<!-- Solo icono -->
<v-btn icon="mdi-delete" color="error" variant="text"></v-btn>

<!-- Loading -->
<v-btn :loading="loading" @click="guardar">
  Guardar
</v-btn>

<!-- Tamaños -->
<v-btn size="small">Pequeño</v-btn>
<v-btn size="large">Grande</v-btn>
```

---

## Formularios

```vue
<v-form ref="form" v-model="valid">
  <!-- Text Field -->
  <v-text-field
    v-model="nombre"
    label="Nombre"
    :rules="[v => !!v || 'Requerido']"
    required
  ></v-text-field>
  
  <!-- Select -->
  <v-select
    v-model="estado"
    :items="estados"
    item-title="text"
    item-value="value"
    label="Estado"
  ></v-select>
  
  <!-- Autocomplete -->
  <v-autocomplete
    v-model="cliente"
    :items="clientes"
    item-title="company_name"
    item-value="id"
    label="Buscar cliente"
    clearable
  ></v-autocomplete>
  
  <!-- Textarea -->
  <v-textarea
    v-model="notas"
    label="Notas"
    rows="3"
  ></v-textarea>
  
  <!-- Date Picker (simplificado) -->
  <v-text-field
    v-model="fecha"
    label="Fecha"
    type="date"
  ></v-text-field>
</v-form>

<!-- Validar formulario -->
<script>
methods: {
  async submit() {
    const { valid } = await this.$refs.form.validate()
    if (!valid) return
    // Procesar...
  }
}
</script>
```

---

## Data Tables

```vue
<v-data-table
  :headers="headers"
  :items="items"
  :loading="loading"
  :search="busqueda"
  items-per-page="10"
>
  <!-- Columna personalizada -->
  <template v-slot:item.estado="{ item }">
    <v-chip :color="getColorEstado(item.estado)">
      {{ item.estado }}
    </v-chip>
  </template>
  
  <!-- Acciones -->
  <template v-slot:item.actions="{ item }">
    <v-btn icon="mdi-pencil" variant="text" @click="editar(item)"></v-btn>
    <v-btn icon="mdi-delete" variant="text" color="error" @click="eliminar(item)"></v-btn>
  </template>
</v-data-table>

<script>
data() {
  return {
    headers: [
      { title: 'Nombre', key: 'nombre' },
      { title: 'Estado', key: 'estado' },
      { title: 'Acciones', key: 'actions', sortable: false }
    ]
  }
}
</script>
```

---

## Dialogs

```vue
<v-dialog v-model="dialog" max-width="600">
  <v-card>
    <v-card-title>Confirmar</v-card-title>
    <v-card-text>¿Está seguro?</v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn @click="dialog = false">Cancelar</v-btn>
      <v-btn color="primary" @click="confirmar">Confirmar</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>

<!-- Activador -->
<v-btn @click="dialog = true">Abrir</v-btn>
```

---

## Chips y Badges

```vue
<!-- Chip -->
<v-chip color="success" size="small">Activo</v-chip>
<v-chip color="error" variant="outlined">Vencido</v-chip>

<!-- Con icono -->
<v-chip prepend-icon="mdi-check" color="success">
  Pagada
</v-chip>
```

---

## Iconos MDI

```vue
<!-- En componentes -->
<v-icon>mdi-magnify</v-icon>
<v-icon color="error">mdi-alert</v-icon>
<v-icon size="large">mdi-home</v-icon>

<!-- En botones -->
<v-btn icon="mdi-plus"></v-btn>
<v-btn prepend-icon="mdi-content-save">Guardar</v-btn>
```

**Iconos comunes**:
- `mdi-magnify` - Buscar
- `mdi-plus` - Agregar
- `mdi-pencil` - Editar
- `mdi-delete` - Eliminar
- `mdi-check` - Confirmar
- `mdi-close` - Cerrar
- `mdi-content-save` - Guardar
- `mdi-download` - Descargar
- `mdi-upload` - Subir
- `mdi-eye` / `mdi-eye-off` - Ver/Ocultar

---

## Progress y Loading

```vue
<!-- Circular -->
<v-progress-circular indeterminate color="primary"></v-progress-circular>

<!-- Linear -->
<v-progress-linear indeterminate color="primary"></v-progress-linear>

<!-- Overlay -->
<v-overlay :model-value="loading" class="align-center justify-center">
  <v-progress-circular indeterminate size="64"></v-progress-circular>
</v-overlay>
```

---

## Snackbar (usar AppSnackbar)

```vue
<!-- Preferir AppSnackbar del proyecto -->
<AppSnackbar
  v-model="snackbar.show"
  :type="snackbar.type"
  :message="snackbar.message"
/>
```

---

## Clases de Espaciado

```
ma-4  → margin all 4 (16px)
pa-4  → padding all 4 (16px)
mt-2  → margin top 2 (8px)
mb-2  → margin bottom 2 (8px)
ml-4  → margin left 4 (16px)
mr-4  → margin right 4 (16px)
mx-4  → margin horizontal (left + right)
my-4  → margin vertical (top + bottom)
```

**Escala**: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16

---

## Colores del Proyecto

```vue
<!-- Usar colores corporativos -->
<v-btn color="#A81C22">Rojo primario</v-btn>
<v-btn color="#1F355C">Azul secundario</v-btn>

<!-- O clases de Vuetify -->
<v-btn color="primary">Primary</v-btn>
<v-btn color="success">Success</v-btn>
<v-btn color="error">Error</v-btn>
<v-btn color="warning">Warning</v-btn>
```
