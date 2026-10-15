# Sello y firma: ajustar tamaño y posición, y detectar imágenes blancas

Fecha: 2026-10-15. Pedido del usuario:

> que el cliente pudiera también editar cómo se presentan el sello, la firma o ambos, es decir, ajustar tamaño, ubicación, etc. Y si coloco una imagen PNG de un ícono blanco, no se ve en el documento por el fondo; sería bueno que el sistema lo detectara y cambiara el color. Y que al darle al botón de borrar sello o firma, pregunte si está seguro.

**Estado:**
- **Hecho (2026-10-15):** la confirmación antes de borrar ("¿Quitar tu sello?").
- **Ya existe:** la vista previa (`VistaPreviaSelloFirma.vue`).
- **Hecho (2026-10-15):** el punto 2, la detección de imágenes blancas (`src/utils/imagenSello.js`, con pruebas; diálogo en Mi negocio con "Sí, en negro", "Tinta azul" y "Dejarla así").
- **Hecho (2026-10-15):** el punto 1, el ajuste de tamaño y posición (`src/utils/ajustesSello.js` → `cajaImagen`, compartida por el PDF y la vista previa; `seal-service.guardarAjustes`). El arrastre en escritorio queda pendiente: las flechas cubren el caso.

## 1. Ajustar tamaño y posición ✅
- Los ajustes se guardan en la configuración del sello (`seal-service`, junto a `sealUrl` y `signatureUrl`) como `ajustes: { sello: { escala, dx, dy }, firma: { escala, dx, dy } }`:
  - `escala` va de 0,6 a 1,6 (por defecto 1);
  - `dx` y `dy` son milímetros, entre −20 y +20 (por defecto 0).
- **`estamparSelloYFirma`** (`retention-pdf-service.js`) los aplica sobre `MEDIDAS_SELLO_FIRMA`: el alto por la escala y la posición más dx/dy. **`VistaPreviaSelloFirma.vue`** aplica lo mismo con CSS (`--mm`), así que la vista y el PDF siguen idénticos.
- **Pantalla:** dentro del diálogo de vista previa, debajo del documento, un panel "Ajustar" por imagen (Sello / Firma) con:
  - un control deslizante **Tamaño** (pequeño ↔ grande);
  - flechas grandes ← → ↑ ↓ que mueven de 2 en 2 mm, más fáciles que arrastrar para una persona mayor (en escritorio también se puede **arrastrar** la imagen sobre la vista previa);
  - **Restablecer** y **Guardar ajustes**.

  Los cambios se ven en vivo en la vista previa.
- **Límites:** la imagen nunca se sale de la zona de firma del agente; se recorta el movimiento.

## 2. Detectar imágenes que no se verán sobre papel blanco ✅
- Al subir el sello o la firma, el navegador analiza la imagen en un `canvas`: entre los píxeles visibles (alfa > 20 %), cuenta los muy claros (luminancia > 0,85).
- Si más del 80 % son claros, la imagen "no se verá" sobre el papel. Se muestra el aviso: **"Tu imagen es blanca o muy clara y no se verá en el papel. ¿La pasamos a color oscuro?"** con dos botones: **"Sí, oscurecerla"** (recomendado) y "Dejarla así".
- **Oscurecer:** cada píxel visible pasa a **#1E1E1E** (o al azul tinta **#1A3A8A**, opción "Tinta azul", típica de sellos), conservando su transparencia. Se sube la imagen convertida. La original no se guarda.
- Con un JPG con fondo blanco y figura oscura no hace falta nada: ya se ve.
- **Lógica pura con tests** en `src/utils/imagenSello.js`: `analizarClaridad(imageData)` y `oscurecer(imageData, color)`.

## 3. Borrar con confirmación ✅
- La papelera abre "¿Quitar tu sello?" / "¿Quitar tu firma?": "Tus próximos comprobantes saldrán sin sello. Los que ya descargaste no cambian."
- Solo se borra al tocar **"Sí, quitar el sello"**. Hay una prueba en `ClienteMiArea.test.js`.
