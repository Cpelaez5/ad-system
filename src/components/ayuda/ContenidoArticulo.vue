<template>
  <!-- El HTML llega YA saneado por DOMPurify (ver ayudaMarkdown.js): nunca se pasa HTML crudo aquí. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="ayuda-texto" data-testid="ayuda-contenido" @click="alHacerClic" v-html="html" />
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

defineProps({
  /** HTML sanitizado. */
  html: { type: String, default: '' },
})

/** Un solo escuchador para todos los botones "Copiar" de los bloques de código. */
async function alHacerClic(evento) {
  // Enlaces internos (/ayuda/...): se navega sin recargar la página.
  const enlace = evento.target.closest?.('a[href^="/"]')
  if (enlace && !evento.metaKey && !evento.ctrlKey && !evento.shiftKey && evento.button === 0) {
    evento.preventDefault()
    router.push(enlace.getAttribute('href'))
    return
  }
  const boton = evento.target.closest?.('[data-copiar]')
  if (!boton) return
  const codigo = boton.parentElement?.querySelector('code')?.textContent || ''
  try {
    await navigator.clipboard.writeText(codigo)
    boton.textContent = 'Copiado'
  } catch {
    // Sin permiso del portapapeles: se selecciona el texto para que lo copien a mano.
    const rango = document.createRange()
    const nodo = boton.parentElement?.querySelector('code')
    if (nodo) {
      rango.selectNodeContents(nodo)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(rango)
    }
    boton.textContent = 'Selecciónalo y copia'
  }
  setTimeout(() => { boton.textContent = 'Copiar' }, 2000)
}
</script>

<style>
.ayuda-texto {
  font-size: 1.0625rem;
  line-height: 1.7;
  max-width: 72ch;
  overflow-wrap: anywhere;
}
.ayuda-texto h1 { font-size: 1.9rem; line-height: 1.25; margin: 0 0 16px; font-weight: 700; }
.ayuda-texto h2 { font-size: 1.45rem; line-height: 1.3; margin: 40px 0 12px; font-weight: 700; scroll-margin-top: 84px; }
.ayuda-texto h3 { font-size: 1.2rem; margin: 28px 0 8px; font-weight: 700; scroll-margin-top: 84px; }
.ayuda-texto p { margin: 0 0 14px; }
.ayuda-texto ul, .ayuda-texto ol { margin: 0 0 16px; padding-left: 1.5em; }
.ayuda-texto li { margin-bottom: 8px; }
.ayuda-texto li > ul, .ayuda-texto li > ol { margin-top: 8px; margin-bottom: 0; }
.ayuda-texto a { color: rgb(var(--v-theme-primary)); text-underline-offset: 3px; }
.ayuda-texto blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 12px;
}
.ayuda-texto blockquote p:last-child { margin-bottom: 0; }
.ayuda-texto code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
  background: rgba(var(--v-theme-on-surface), 0.07);
  padding: 2px 6px;
  border-radius: 6px;
}
.ayuda-texto .ayuda-codigo { position: relative; margin: 16px 0 20px; }
.ayuda-texto .ayuda-codigo pre {
  margin: 0;
  padding: 44px 16px 16px;
  background: #1f1f23;
  color: #f4f4f5;
  border-radius: 14px;
  overflow-x: auto;
  font-size: 0.9rem;
  line-height: 1.55;
}
.ayuda-texto .ayuda-codigo code { background: none; padding: 0; color: inherit; font-size: inherit; overflow-wrap: normal; white-space: pre; }
.ayuda-texto .ayuda-codigo__lenguaje {
  position: absolute;
  top: 12px;
  left: 16px;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: #c9c9d1;
}
.ayuda-texto .ayuda-codigo__copiar {
  position: absolute;
  top: 6px;
  right: 8px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #5a5a63;
  border-radius: 10px;
  background: transparent;
  color: #f4f4f5;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.ayuda-texto .ayuda-codigo__copiar:hover { background: #33333a; }
.ayuda-texto table { border-collapse: collapse; margin: 16px 0 20px; display: block; overflow-x: auto; max-width: 100%; font-size: 0.97rem; }
.ayuda-texto th, .ayuda-texto td { border: 1px solid rgba(var(--v-theme-on-surface), 0.16); padding: 8px 12px; text-align: left; vertical-align: top; }
.ayuda-texto th { background: rgba(var(--v-theme-on-surface), 0.05); white-space: nowrap; }
.ayuda-texto hr { border: 0; border-top: 1px solid rgba(var(--v-theme-on-surface), 0.14); margin: 28px 0; }
</style>
