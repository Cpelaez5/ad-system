# 📸 Tesseract.js - Cheat Sheet

> OCR (Reconocimiento de texto en imágenes)

> 📖 README completo: [TesseractJS-readme.md](./TesseractJS-readme.md)

---

## Uso Básico

```javascript
import { createWorker } from 'tesseract.js'

async function extractText(imageFile) {
  // Crear worker (descarga modelo ~15MB primera vez)
  const worker = await createWorker('spa') // 'spa' = español
  
  // Reconocer texto
  const { data: { text } } = await worker.recognize(imageFile)
  
  // IMPORTANTE: Terminar worker
  await worker.terminate()
  
  return text
}
```

---

## Idiomas Disponibles

```javascript
// Español
const worker = await createWorker('spa')

// Inglés
const worker = await createWorker('eng')

// Múltiples idiomas
const worker = await createWorker(['spa', 'eng'])
```

---

## Con Múltiples Imágenes

```javascript
async function processMultipleImages(images) {
  // Crear worker UNA vez
  const worker = await createWorker('spa')
  
  const results = []
  for (const img of images) {
    const { data: { text } } = await worker.recognize(img)
    results.push(text)
  }
  
  // Terminar al final
  await worker.terminate()
  return results
}
```

---

## Integración con Vue (Patrón del Proyecto)

```vue
<script>
import { createWorker } from 'tesseract.js'

export default {
  data() {
    return {
      loading: false,
      progress: 0,
      extractedText: ''
    }
  },
  
  methods: {
    async processImage(file) {
      this.loading = true
      this.progress = 0
      
      try {
        const worker = await createWorker('spa', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              this.progress = Math.round(m.progress * 100)
            }
          }
        })
        
        const { data: { text } } = await worker.recognize(file)
        this.extractedText = text
        
        await worker.terminate()
      } catch (error) {
        console.error('Error OCR:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
```

---

## Formatos Soportados

- PNG, JPG, JPEG, GIF, BMP
- WebP
- PDF (solo primera página)

---

## Tips de Performance

1. **Pre-procesar imágenes**: Mejor contraste = mejor reconocimiento
2. **Resolución mínima**: 300 DPI para documentos
3. **Reusar worker**: Crear una vez, usar múltiples veces
4. **Cacheo**: El modelo se cachea en el navegador

---

## ⚠️ Limitaciones

- **No soporta PDFs multipágina** nativamente
- Precisión depende de la calidad de imagen
- Primera carga descarga modelo (~15MB)
