<template>
  <div class="test-form-container">
    <v-card class="pa-6">
      <v-card-title class="text-center mb-4">
        <h2>Formulario de Prueba</h2>
      </v-card-title>
      
      <v-form ref="testForm" v-model="formValid">
        <!-- Campo de texto simple -->
        <v-text-field
          v-model="testData.texto"
          label="Campo de Texto"
          placeholder="Escribe algo aquí..."
          variant="outlined"
          class="mb-4"
          @input="logInput('texto', $event)"
        ></v-text-field>
        
        <!-- Campo de email -->
        <v-text-field
          v-model="testData.email"
          label="Email"
          type="email"
          placeholder="tu@email.com"
          variant="outlined"
          class="mb-4"
          @input="logInput('email', $event)"
        ></v-text-field>
        
        <!-- Campo de contraseña -->
        <v-text-field
          v-model="testData.password"
          label="Contraseña"
          type="password"
          variant="outlined"
          class="mb-4"
          @input="logInput('password', $event)"
        ></v-text-field>
        
        <!-- Select simple -->
        <v-select
          v-model="testData.select"
          :items="opciones"
          label="Selecciona una opción"
          variant="outlined"
          class="mb-4"
          @update:model-value="logInput('select', $event)"
        ></v-select>
        
        <!-- Checkbox -->
        <v-checkbox
          v-model="testData.checkbox"
          label="Acepto los términos"
          color="primary"
          class="mb-4"
          @update:model-value="logInput('checkbox', $event)"
        ></v-checkbox>
        
        <!-- Radio buttons -->
        <v-radio-group
          v-model="testData.radio"
          label="Selecciona una opción"
          class="mb-4"
          @update:model-value="logInput('radio', $event)"
        >
          <v-radio label="Opción 1" value="opcion1"></v-radio>
          <v-radio label="Opción 2" value="opcion2"></v-radio>
          <v-radio label="Opción 3" value="opcion3"></v-radio>
        </v-radio-group>
        
        <!-- Textarea -->
        <v-textarea
          v-model="testData.textarea"
          label="Comentarios"
          placeholder="Escribe tus comentarios aquí..."
          variant="outlined"
          rows="3"
          class="mb-4"
          @input="logInput('textarea', $event)"
        ></v-textarea>
        
        <!-- Botones -->
        <div class="d-flex gap-2">
          <v-btn
            color="primary"
            @click="submitForm"
            :disabled="!formValid"
          >
            Enviar
          </v-btn>
          
          <v-btn
            color="secondary"
            variant="outlined"
            @click="resetForm"
          >
            Limpiar
          </v-btn>
        </div>
      </v-form>
      
      <!-- Debug info -->
      <v-card class="mt-4" color="grey-lighten-4">
        <v-card-title>Debug Info</v-card-title>
        <v-card-text>
          <pre>{{ JSON.stringify(testData, null, 2) }}</pre>
        </v-card-text>
      </v-card>
    </v-card>
  </div>
</template>

<script>
export default {
  name: 'TestForm',
  data() {
    return {
      formValid: false,
      testData: {
        texto: '',
        email: '',
        password: '',
        select: null,
        checkbox: false,
        radio: null,
        textarea: ''
      },
      opciones: [
        { title: 'Opción 1', value: 'opcion1' },
        { title: 'Opción 2', value: 'opcion2' },
        { title: 'Opción 3', value: 'opcion3' }
      ]
    }
  },
  methods: {
    logInput(field, value) {
      console.log(`Campo ${field} cambió:`, value)
      console.log('Datos completos:', this.testData)
    },
    submitForm() {
      console.log('Enviando formulario:', this.testData)
      alert('Formulario enviado correctamente!')
    },
    resetForm() {
      this.testData = {
        texto: '',
        email: '',
        password: '',
        select: null,
        checkbox: false,
        radio: null,
        textarea: ''
      }
      this.$refs.testForm.reset()
      console.log('Formulario limpiado')
    }
  }
}
</script>

<style scoped>
.test-form-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.gap-2 {
  gap: 8px;
}

pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}
</style>
