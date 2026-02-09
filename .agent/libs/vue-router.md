# 🌐 Vue Router - Cheat Sheet

> Navegación y rutas en Vue 3

---

## Configuración Básica

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('@/views/Home.vue') },
  { path: '/about', component: () => import('@/views/About.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
```

---

## Componentes de Router

```vue
<template>
  <nav>
    <!-- Links de navegación -->
    <RouterLink to="/">Inicio</RouterLink>
    <RouterLink to="/clientes">Clientes</RouterLink>
    <RouterLink :to="{ name: 'Factura', params: { id: 123 }}">
      Factura #123
    </RouterLink>
  </nav>
  
  <!-- Donde se renderiza la vista actual -->
  <RouterView />
</template>
```

---

## Rutas con Parámetros

```javascript
const routes = [
  // Parámetro dinámico
  { 
    path: '/factura/:id', 
    name: 'Factura',
    component: () => import('@/views/FacturaDetalle.vue')
  },
  
  // Parámetro opcional
  { path: '/clientes/:clientId?' },
  
  // Catch-all 404
  { path: '/:pathMatch(.*)*', component: NotFound }
]
```

---

## Acceder a Rutas en Componentes

```javascript
// Options API
export default {
  mounted() {
    // Parámetros de la URL
    console.log(this.$route.params.id)
    
    // Query strings (?search=texto)
    console.log(this.$route.query.search)
    
    // Nombre de la ruta actual
    console.log(this.$route.name)
  },
  
  methods: {
    navegar() {
      // Navegar programáticamente
      this.$router.push('/clientes')
      this.$router.push({ name: 'Factura', params: { id: 456 }})
      
      // Reemplazar (sin agregar al historial)
      this.$router.replace('/login')
      
      // Ir atrás
      this.$router.back()
    }
  }
}
```

---

## Guards de Navegación

```javascript
// Guard global (en router/index.js)
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

// Guard por ruta
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAuth: true, roles: ['admin', 'super_admin'] },
    beforeEnter: (to, from, next) => {
      // Verificar rol
      const userRole = getUserRole()
      if (to.meta.roles.includes(userRole)) {
        next()
      } else {
        next('/no-autorizado')
      }
    }
  }
]
```

---

## Meta Fields (Patrón del Proyecto)

```javascript
const routes = [
  {
    path: '/facturacion',
    component: Facturacion,
    meta: {
      requiresAuth: true,
      roles: ['admin', 'contador'],
      title: 'Facturación'
    }
  }
]

// Cambiar título dinámico
router.afterEach((to) => {
  document.title = to.meta.title || 'Sistema Contabilidad'
})
```

---

## Lazy Loading (Recomendado)

```javascript
// ✅ Carga diferida - mejor performance
const routes = [
  { 
    path: '/dashboard', 
    component: () => import('@/views/Dashboard.vue') 
  }
]

// ❌ Carga inmediata - evitar en rutas pesadas
import Dashboard from '@/views/Dashboard.vue'
const routes = [
  { path: '/dashboard', component: Dashboard }
]
```
