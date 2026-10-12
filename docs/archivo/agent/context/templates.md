# 📋 Templates de Código

> Plantillas listas para copiar/pegar al crear nuevos archivos.

---

## 1. Vista por Rol (Página Completa)

```vue
<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4 font-weight-bold">Título de la Vista</h1>
      <v-btn color="primary" @click="openCreateDialog">
        <v-icon left>mdi-plus</v-icon>
        Nuevo
      </v-btn>
    </div>

    <!-- Stats Cards (opcional) -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <StatsCard
          title="Total"
          :value="stats.total"
          icon="mdi-file-document"
          bg-color="#02254d"
        />
      </v-col>
    </v-row>

    <!-- Tabla -->
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar..."
          single-line
          hide-details
          density="compact"
          class="mr-4"
          style="max-width: 300px"
        />
        <v-spacer />
        <v-btn icon @click="fetchData">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="items"
        :search="search"
        :loading="loading"
        loading-text="Cargando..."
      >
        <!-- Acciones -->
        <template #item.actions="{ item }">
          <v-btn icon size="small" @click="editItem(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" color="error" @click="deleteItem(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import StatsCard from '@/components/common/StatsCard.vue'
// import miService from '@/services/miService'

export default {
  name: 'NombreVista',
  
  components: { StatsCard },
  
  data() {
    return {
      loading: false,
      search: '',
      items: [],
      stats: { total: 0 },
      headers: [
        { title: 'Nombre', key: 'name' },
        { title: 'Estado', key: 'status' },
        { title: 'Acciones', key: 'actions', sortable: false }
      ],
      snackbar: { show: false, message: '', color: 'success' }
    }
  },
  
  mounted() {
    this.fetchData()
  },
  
  methods: {
    async fetchData() {
      this.loading = true
      try {
        // this.items = await miService.getAll()
      } catch (error) {
        this.showSnackbar('Error al cargar datos', 'error')
      } finally {
        this.loading = false
      }
    },
    
    showSnackbar(message, color = 'success') {
      this.snackbar = { show: true, message, color }
    },
    
    openCreateDialog() {
      // Abrir dialog de creación
    },
    
    editItem(item) {
      // Editar item
    },
    
    deleteItem(item) {
      // Eliminar item
    }
  }
}
</script>

<style scoped>
.v-container {
  max-width: 1400px;
}
</style>
```

---

## 2. Servicio (CRUD Completo)

```javascript
// src/services/nombreService.js
import { supabase } from '@/lib/supabaseClient'
import {
  getCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant,
  updateWithTenant
} from '@/utils/tenantHelpers'

class NombreService {
  constructor() {
    this.tableName = 'mi_tabla'
  }

  // Listar todos
  async getAll(options = {}) {
    const orgId = getCurrentOrganizationId()
    
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    
    if (options.status) {
      query = query.eq('status', options.status)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  }

  // Obtener por ID
  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  // Crear
  async create(payload) {
    const orgId = getCurrentOrganizationId()
    
    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        ...payload,
        organization_id: orgId,
        status: 'ACTIVO'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Actualizar
  async update(id, payload) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Eliminar (soft delete)
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .update({ status: 'ELIMINADO' })
      .eq('id', id)
    
    if (error) throw error
  }

  // Buscar
  async search(term) {
    const orgId = getCurrentOrganizationId()
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', orgId)
      .neq('status', 'ELIMINADO')
      .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
    
    if (error) throw error
    return data
  }
}

export default new NombreService()
```

---

## 3. Componente Reutilizable

```vue
<template>
  <v-card :class="cardClass" v-bind="$attrs">
    <v-card-title v-if="title">
      <v-icon v-if="icon" :color="iconColor" class="mr-2">{{ icon }}</v-icon>
      {{ title }}
    </v-card-title>
    
    <v-card-text>
      <slot />
    </v-card-text>
    
    <v-card-actions v-if="$slots.actions">
      <slot name="actions" />
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'NombreComponente',
  
  props: {
    title: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    iconColor: {
      type: String,
      default: 'primary'
    },
    elevated: {
      type: Boolean,
      default: false
    }
  },
  
  computed: {
    cardClass() {
      return {
        'elevation-0': !this.elevated,
        'rounded-xl': true
      }
    }
  }
}
</script>

<style scoped>
/* Estilos específicos */
</style>
```

---

## 4. Dialog de Formulario

```vue
<template>
  <v-dialog v-model="dialog" max-width="600" persistent>
    <v-card>
      <v-card-title>
        {{ isEditing ? 'Editar' : 'Nuevo' }} Registro
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="form.name"
            label="Nombre *"
            :rules="[rules.required]"
          />
          
          <v-text-field
            v-model="form.email"
            label="Email"
            :rules="[rules.email]"
          />
          
          <v-select
            v-model="form.status"
            label="Estado"
            :items="['ACTIVO', 'INACTIVO']"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="close">Cancelar</v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!valid"
          @click="save"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'FormDialog',
  
  props: {
    modelValue: Boolean,
    item: Object
  },
  
  emits: ['update:modelValue', 'saved'],
  
  data() {
    return {
      valid: false,
      saving: false,
      form: {
        name: '',
        email: '',
        status: 'ACTIVO'
      },
      rules: {
        required: v => !!v || 'Campo requerido',
        email: v => !v || /.+@.+\..+/.test(v) || 'Email inválido'
      }
    }
  },
  
  computed: {
    dialog: {
      get() { return this.modelValue },
      set(v) { this.$emit('update:modelValue', v) }
    },
    isEditing() {
      return !!this.item?.id
    }
  },
  
  watch: {
    item: {
      immediate: true,
      handler(val) {
        if (val) {
          this.form = { ...val }
        } else {
          this.resetForm()
        }
      }
    }
  },
  
  methods: {
    resetForm() {
      this.form = { name: '', email: '', status: 'ACTIVO' }
      this.$refs.form?.reset()
    },
    
    close() {
      this.dialog = false
      this.resetForm()
    },
    
    async save() {
      const { valid } = await this.$refs.form.validate()
      if (!valid) return
      
      this.saving = true
      try {
        // await service.save(this.form)
        this.$emit('saved')
        this.close()
      } catch (error) {
        console.error(error)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
```

---

## 5. Migración SQL

```sql
-- migrations/XXX_descripcion.sql
-- Descripción: [Qué hace esta migración]
-- Autor: [Tu nombre]
-- Fecha: YYYY-MM-DD

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.mi_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'ACTIVO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_mi_tabla_org ON public.mi_tabla(organization_id);
CREATE INDEX idx_mi_tabla_status ON public.mi_tabla(status);

-- RLS
ALTER TABLE public.mi_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven datos de su org"
ON public.mi_tabla
FOR SELECT
USING (organization_id = auth.jwt() ->> 'organization_id');

-- Comentarios
COMMENT ON TABLE public.mi_tabla IS 'Descripción de la tabla';
COMMENT ON COLUMN public.mi_tabla.status IS 'ACTIVO, INACTIVO, ELIMINADO';
```
