# 🔐 Variables de Entorno

> Configuración de variables de entorno del proyecto.

**Archivo**: `.env` (raíz del proyecto)

---

## Variables Requeridas

```env
# Supabase (OBLIGATORIO)
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# DeepSeek API para OCR (OPCIONAL - para extracción de facturas)
VITE_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx
VITE_DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
```

---

## Descripción de Variables

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | ✅ Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase (pública) | ✅ Sí |
| `VITE_DEEPSEEK_API_KEY` | API key de DeepSeek para OCR | ❌ No |
| `VITE_DEEPSEEK_API_URL` | URL de la API de DeepSeek | ❌ No |

---

## Cómo Obtener las Claves

### Supabase

1. Ir a [supabase.com](https://supabase.com)
2. Seleccionar tu proyecto
3. Settings → API
4. Copiar `Project URL` → `VITE_SUPABASE_URL`
5. Copiar `anon public` → `VITE_SUPABASE_ANON_KEY`

### DeepSeek

1. Ir a [platform.deepseek.com](https://platform.deepseek.com)
2. Crear cuenta y obtener API key
3. Copiar API key → `VITE_DEEPSEEK_API_KEY`

---

## Uso en el Código

```javascript
// Las variables se acceden con import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// En src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Archivos de Entorno

| Archivo | Uso | Git |
|---------|-----|-----|
| `.env` | Variables de desarrollo | ⚠️ NO subir |
| `.env.example` | Plantilla (sin valores) | ✅ Subir |
| `.env.production` | Variables de producción | ⚠️ NO subir |

---

## Crear .env.example

Para nuevos desarrolladores, crear `.env.example`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# DeepSeek API (Optional - for OCR)
VITE_DEEPSEEK_API_KEY=your-api-key-here
VITE_DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
```

---

## ⚠️ Seguridad

- **NUNCA** subir `.env` a Git
- Las claves `ANON_KEY` son públicas (seguras para frontend)
- Las claves de DeepSeek son privadas (solo para desarrollo local)
- En producción, usar variables de entorno del hosting (Vercel, Netlify, etc.)
