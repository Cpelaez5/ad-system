# 🍍 Pinia - Cheat Sheet

> Estado global en Vue 3

---

## Crear un Store

```javascript
// src/stores/userStore.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  // Estado (como data() en componentes)
  state: () => ({
    user: null,
    isLoggedIn: false,
    organizationId: null
  }),
  
  // Getters (como computed)
  getters: {
    userFullName: (state) => {
      if (!state.user) return ''
      return `${state.user.first_name} ${state.user.last_name}`
    },
    
    isAdmin: (state) => state.user?.role === 'admin'
  },
  
  // Actions (como methods)
  actions: {
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password
      })
      if (!error) {
        this.user = data.user
        this.isLoggedIn = true
      }
      return { data, error }
    },
    
    logout() {
      this.user = null
      this.isLoggedIn = false
      this.organizationId = null
    },
    
    setOrganization(orgId) {
      this.organizationId = orgId
    }
  }
})
```

---

## Usar Store en Componentes

```vue
<script>
import { useUserStore } from '@/stores/userStore'

export default {
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },
  
  // O en Options API:
  computed: {
    userName() {
      return this.userStore.userFullName
    }
  },
  
  methods: {
    async handleLogin() {
      const { error } = await this.userStore.login(
        this.email, 
        this.password
      )
      if (!error) {
        this.$router.push('/dashboard')
      }
    }
  }
}
</script>

<template>
  <div>
    <!-- Acceso directo al estado -->
    <span>{{ userStore.userFullName }}</span>
    
    <!-- Acceso a getters -->
    <span v-if="userStore.isAdmin">Admin</span>
  </div>
</template>
```

---

## Sintaxis Setup (Alternativa)

```javascript
// src/stores/invoiceStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import invoiceService from '@/services/invoiceService'

export const useInvoiceStore = defineStore('invoice', () => {
  // State con ref()
  const invoices = ref([])
  const loading = ref(false)
  
  // Getters con computed()
  const totalInvoices = computed(() => invoices.value.length)
  const pendingInvoices = computed(() => 
    invoices.value.filter(i => i.status === 'EMITIDA')
  )
  
  // Actions como funciones
  async function fetchInvoices() {
    loading.value = true
    try {
      invoices.value = await invoiceService.getAll()
    } finally {
      loading.value = false
    }
  }
  
  function addInvoice(invoice) {
    invoices.value.push(invoice)
  }
  
  // Retornar todo lo que se expone
  return {
    invoices,
    loading,
    totalInvoices,
    pendingInvoices,
    fetchInvoices,
    addInvoice
  }
})
```

---

## Configurar Pinia

```javascript
// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

---

## Patrones Útiles

### Persistencia (localStorage)
```javascript
actions: {
  saveToLocalStorage() {
    localStorage.setItem('userStore', JSON.stringify(this.$state))
  },
  
  loadFromLocalStorage() {
    const saved = localStorage.getItem('userStore')
    if (saved) {
      this.$patch(JSON.parse(saved))
    }
  }
}
```

### Reset del Store
```javascript
actions: {
  resetStore() {
    this.$reset() // Vuelve al estado inicial
  }
}
```

### Suscribirse a Cambios
```javascript
const userStore = useUserStore()

userStore.$subscribe((mutation, state) => {
  console.log('State changed:', state)
  localStorage.setItem('user', JSON.stringify(state))
})
```

---

## Cuándo Usar Pinia

✅ **Usar para**:
- Datos de usuario/sesión
- Configuración global
- Datos compartidos entre vistas

❌ **No usar para**:
- Estado local de un componente
- Datos que solo usa una vista
