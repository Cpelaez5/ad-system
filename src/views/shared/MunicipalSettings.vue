<template>
  <v-container fluid class="pa-6 municipal-settings-page">
    <div class="mb-6 d-flex justify-space-between align-center flex-wrap ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold" style="color:#1F355C;">Retenciones Municipales</h1>
        <p class="text-body-1 text-medium-emphasis">Gestiona tus Códigos de Actividad Económica y Porcentajes de Retención de Alcaldía</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()" rounded="lg" elevation="2">
        Nuevo Código
      </v-btn>
    </div>

    <v-card class="rounded-xl border" elevation="0">
      <v-data-table
        :headers="headers"
        :items="conceptos"
        :loading="loading"
        hover
        class="bg-transparent"
      >
        <template v-slot:item.codigo="{ item }">
          <span class="font-weight-bold">{{ item.codigo }}</span>
        </template>
        <template v-slot:item.porcentaje="{ item }">
          <v-chip color="info" size="small" variant="flat">
            {{ item.porcentaje }}%
          </v-chip>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn icon="mdi-pencil" variant="text" size="small" color="primary" @click="openDialog(item)"></v-btn>
          <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)"></v-btn>
        </template>
        
        <template v-slot:no-data>
          <div class="pa-6 text-center text-grey">
            No tienes códigos de actividad económica registrados.
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog for Create / Edit -->
    <v-dialog v-model="dialog" max-width="500px" persistent scrollable>
      <v-card rounded="xl">
        <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between">
          <span>{{ editedItem.id ? 'Editar Código' : 'Nuevo Código Municipal' }}</span>
          <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeDialog"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-form ref="form" v-model="valid" @submit.prevent="save">
            <v-text-field
              v-model="editedItem.codigo"
              label="Código de Actividad"
              placeholder="Ej: 1.01.00"
              variant="outlined"
              :rules="[v => !!v || 'Requerido']"
              prepend-inner-icon="mdi-identifier"
              class="mb-2"
            ></v-text-field>

            <v-textarea
              v-model="editedItem.descripcion"
              label="Descripción de la Actividad"
              placeholder="Ej: Comercio al por menor de artículos..."
              variant="outlined"
              rows="3"
              :rules="[v => !!v || 'Requerido']"
              prepend-inner-icon="mdi-text"
              class="mb-2"
            ></v-textarea>

            <v-text-field
              v-model="editedItem.porcentaje"
              label="Porcentaje de Retención (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              variant="outlined"
              suffix="%"
              :rules="[
                v => !!v || 'Requerido',
                v => v >= 0 || 'No puede ser negativo',
                v => v <= 100 || 'Máximo 100%'
              ]"
              prepend-inner-icon="mdi-percent"
            ></v-text-field>
          </v-form>
        </v-card-text>
        
        <v-card-actions class="pa-4 border-t bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="closeDialog" :disabled="saving">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" @click="save" :loading="saving" :disabled="!valid">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="bottom right" :timeout="3000" rounded="lg">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import municipalConceptsService from '@/services/municipalConceptsService'

export default {
  name: 'MunicipalSettings',
  data() {
    return {
      conceptos: [],
      loading: false,
      dialog: false,
      valid: true,
      saving: false,
      headers: [
        { title: 'Código', key: 'codigo', align: 'start' },
        { title: 'Descripción', key: 'descripcion' },
        { title: 'Porcentaje', key: 'porcentaje' },
        { title: 'Acciones', key: 'actions', align: 'end', sortable: false }
      ],
      editedItem: {
        id: null,
        codigo: '',
        descripcion: '',
        porcentaje: ''
      },
      defaultItem: {
        id: null,
        codigo: '',
        descripcion: '',
        porcentaje: ''
      },
      snackbar: { show: false, text: '', color: 'success' }
    }
  },
  async mounted() {
    await this.loadConceptos();
  },
  methods: {
    async loadConceptos() {
      this.loading = true;
      try {
        this.conceptos = await municipalConceptsService.getConcepts();
      } catch (e) {
        this.showSnackbar('Error al cargar códigos: ' + e.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    openDialog(item = null) {
      if (item) {
        this.editedItem = { ...item };
      } else {
        this.editedItem = { ...this.defaultItem };
      }
      this.dialog = true;
    },
    closeDialog() {
      this.dialog = false;
      setTimeout(() => {
        this.editedItem = { ...this.defaultItem };
        if (this.$refs.form) this.$refs.form.resetValidation();
      }, 300);
    },
    async save() {
      if (!this.$refs.form.validate()) return;
      
      this.saving = true;
      try {
        const payload = {
          codigo: this.editedItem.codigo,
          descripcion: this.editedItem.descripcion,
          porcentaje: parseFloat(this.editedItem.porcentaje)
        };

        if (this.editedItem.id) {
          await municipalConceptsService.updateConcept(this.editedItem.id, payload);
          this.showSnackbar('Código actualizado exitosamente');
        } else {
          await municipalConceptsService.createConcept(payload);
          this.showSnackbar('Código registrado exitosamente');
        }
        await this.loadConceptos();
        this.closeDialog();
      } catch (e) {
        this.showSnackbar('Error al guardar: ' + e.message, 'error');
      } finally {
        this.saving = false;
      }
    },
    async confirmDelete(item) {
      if (confirm(`¿Estás seguro de que deseas eliminar el código ${item.codigo}?`)) {
        try {
          await municipalConceptsService.deleteConcept(item.id);
          this.showSnackbar('Código eliminado');
          await this.loadConceptos();
        } catch (e) {
          this.showSnackbar('Error al eliminar: ' + e.message, 'error');
        }
      }
    },
    showSnackbar(text, color = 'success') {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    }
  }
}
</script>

<style scoped>
.municipal-settings-page {
  max-width: 1000px;
  margin: 0 auto;
}
.border-t {
  border-top: 1px solid rgba(0,0,0,0.08);
}
</style>
