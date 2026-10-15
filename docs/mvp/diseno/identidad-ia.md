# Identidad visual de la IA

Fecha: 2026-10-15. Pedido del usuario: "para todos los componentes que haya en el sistema donde se use IA, aplicarle una identidad, de manera que el cliente pueda identificarlos visualmente; puede ser una identidad visual sencilla, como iluminar los bloques de forma minimalista, algún efecto con movimiento, etc."

## Propuesta: el "brillo" de la IA
- **Un solo recurso, siempre igual:** todo lo que hace la IA lleva un **borde con un degradado suave** que recorre lentamente el contorno. Usa granate → un rosado claro → granate, de la paleta de AD System y no un violeta genérico de "IA". Va con el ícono `mdi-creation` (destellos).
- **Tres niveles:**
  1. **Botón de IA** (`BotonIA`): "Tomar foto" (Foto y listo), "Mejorar foto con IA", "Llenar con un documento", "Foto del estante", "Leer factura con foto" y el botón del asistente. Lleva destellos y un brillo que se mueve muy lento en el borde.
  2. **Mientras la IA trabaja** (`TrabajandoIA`): el bloque se "ilumina" con un barrido de luz de izquierda a derecha y un mensaje amable ("Mirando tu producto…").
  3. **Resultado de la IA** (`MarcaIA`): los campos o bloques que llenó la IA llevan una marca fina, "Llenado con IA · revisa", con el mismo degradado en un borde de 2 px a la izquierda o en el contorno. Así el cliente sabe qué revisar.
- **Accesibilidad y respeto:** la animación es lenta (6–8 s por vuelta), sin parpadeos, y se apaga con `prefers-reduced-motion`. En modo oscuro el degradado sube de luminosidad. El texto nunca depende solo del color.
- **Implementación:** tokens CSS (`--ad-ia-1`, `--ad-ia-2`) y una clase utilitaria `.ad-ia` / `.ad-ia--trabajando` en `src/styles/`, más tres componentes en `src/components/ui/` (`BotonIA`, `TrabajandoIA`, `MarcaIA`). Después, un barrido para aplicarlos en TODOS los puntos de IA: Mi mercancía (Foto y listo, mejorar, estante), registro con foto (OCR), "Llenar con un documento", el chat del asistente (cuando termine su rediseño) y la barra "Tu asistente".
