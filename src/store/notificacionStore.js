import { defineStore } from 'pinia'

// Store mínimo para disparar el AppSnackbar global desde cualquier parte,
// incluido código que corre fuera de un componente (router guard, main.js).
// Ver docs/mvp/manuales/02-agente-limpieza-arquitectura.md (L3).
export const useNotificacionStore = defineStore('notificacion', {
  state: () => ({
    visible: false,
    mensaje: '',
    tipo: 'info' // 'success' | 'error' | 'warning' | 'info' (coincide con AppSnackbar)
  }),
  actions: {
    mostrar(mensaje, tipo = 'info') {
      this.mensaje = mensaje
      this.tipo = tipo
      this.visible = true
    },
    cerrar() {
      this.visible = false
    }
  }
})
