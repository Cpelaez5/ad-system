# 🌐 Axios - Cheat Sheet

> Cliente HTTP basado en promesas

---

## Uso Básico

```javascript
import axios from 'axios'

// GET
const response = await axios.get('https://api.example.com/data')
console.log(response.data)

// POST
const { data } = await axios.post('/api/users', {
  name: 'Juan',
  email: 'juan@email.com'
})

// PUT
await axios.put('/api/users/123', { name: 'Juan Actualizado' })

// DELETE
await axios.delete('/api/users/123')
```

---

## Con Parámetros

```javascript
// Query params: /api/invoices?status=PAGADA&month=2
await axios.get('/api/invoices', {
  params: {
    status: 'PAGADA',
    month: 2
  }
})
```

---

## Headers

```javascript
await axios.post('/api/auth', data, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
})
```

---

## Manejo de Errores

```javascript
try {
  const { data } = await axios.get('/api/data')
  return data
} catch (error) {
  if (error.response) {
    // El servidor respondió con error (4xx, 5xx)
    console.error('Status:', error.response.status)
    console.error('Data:', error.response.data)
  } else if (error.request) {
    // No hubo respuesta (red caída, timeout)
    console.error('No response received')
  } else {
    // Error al configurar la request
    console.error('Error:', error.message)
  }
}
```

---

## Instancia Configurada

```javascript
// src/lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
```

---

## Subir Archivos (FormData)

```javascript
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('name', 'documento.pdf')

await axios.post('/api/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  onUploadProgress: (progressEvent) => {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    )
    console.log(`Subido: ${percent}%`)
  }
})
```

---

## Cancelar Requests

```javascript
const controller = new AbortController()

axios.get('/api/data', {
  signal: controller.signal
})

// Cancelar
controller.abort()
```

---

## ⚠️ Nota del Proyecto

En este proyecto se usa principalmente **Supabase** para datos.
Axios se usa para:
- APIs externas (BCV, DeepSeek)
- Integraciones de terceros
