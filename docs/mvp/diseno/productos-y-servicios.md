# Productos y servicios — datos, rubros, fotos e IA

Fecha: 2026-10-14. Pedido del usuario:
- cambiar la vista de Mi mercancía entre lista y cuadrícula con un switch;
- que el cliente cargue fotos de sus productos;
- crear un producto **solo mostrando una foto**;
- mejorar la foto con IA (Nano Banana);
- poder registrar **servicios**;
- analizar qué datos son esenciales y cuáles cambian según el rubro.

Referencias: el formulario de producto y la importación por rubro de Norkut (vistos en su panel el 2026-10-13: tipos producto/servicio/variantes/empaques; código de barras, marca, categoría, pesable, código de balanza, IVA, precio y stock por tienda, atributos personalizados, registro sanitario; plantillas por rubro) y la captura 8 de su POS (productos y servicios en la misma cuadrícula, con ícono de tipo, foto o espacio vacío y precio en Bs y USD).

## 1. Qué es esencial y qué cambia por rubro
| Nivel | Campos | Dónde vive |
|---|---|---|
| Esencial, todos | tipo (producto/servicio), nombre, categoría, precio de venta, moneda, IVA (`tax_type`), foto, descripción, estado | columnas de `inventory_products` |
| Esencial, solo productos | costo, stock, stock mínimo, unidad, código de barras, marca, código interno (`code`) | columnas |
| Esencial, solo servicios | se cobra por (servicio, hora, sesión…), duración, dónde se presta | `atributos` (`CAMPOS_SERVICIO`) |
| Según el rubro | farmacia: principio activo, presentación, laboratorio, lote, vencimiento, registro sanitario, récipe · moda: talla, color, material, para quién · ferretería: medida, material, modelo · electrónica: modelo, serial, garantía, color · bodega: presentación, pesable, vencimiento · comida: porción, alérgenos, vencimiento · mascotas: especie, presentación, vencimiento · belleza: presentación, tono, vencimiento · papelería: presentación, color | `atributos` (jsonb), claves en `src/constants/rubros.js` |

**Decisiones:**
- **No copiamos de Norkut** "precio y stock por tienda", "empaques", "variantes como productos hijos", "código de balanza" ni "referencia de fábrica". Son para cadenas con POS y abruman a una bodega. Las variantes (talla/color) se registran como productos separados con sus atributos. Las variantes de verdad llegan con multi-almacén (Ola 2).
- **El rubro** vive en `clients.rubro` y se elige en Mi negocio. Si no hay rubro, se usan los campos de "otro" y una invitación a elegirlo.
- **Servicios:** no llevan stock, costo ni movimientos de inventario. En la lista se distinguen con un ícono y un chip "Servicio".

## 2. Fotos
- Bucket privado `productos`, ruta `{organization_id}/{client_id}/{archivo}`, máx. 10 MB, jpg/png/webp. Políticas: el cliente solo sube y ve su carpeta. Migración `20261014100000`.
- Columnas `foto_path` (la que se muestra) y `foto_original_path` (la que subió el cliente).
- En pantalla se muestran con URL firmada (`src/services/storageUrlService.js`). Antes de subir, la foto se reduce en el navegador (lado mayor de unos 1600 px, JPEG con calidad 0,85) para que suba rápido con datos móviles.

## 3. IA — función `producto-ia` (desplegada v1)
- `{ accion: 'identificar', foto_path, campos }` → `{ producto: { nombre, marca, categoria, presentacion, unidad, codigo_barras, descripcion, confianza, atributos } }`. Usa el perfil de IA activo (Gemini) y llena los campos del rubro solo si se ven en la foto. No inventa precios.
- `{ accion: 'mejorar', foto_path }` → `{ foto_path }`: foto de estudio (fondo blanco, luz suave, el mismo producto sin cambios) generada con **Nano Banana** (`gemini-2.5-flash-image`; se puede cambiar con el secreto `PRODUCTO_IMAGEN_MODEL`). Se guarda junto a la original; el cliente elige cuál usar.
- Cada uso queda registrado en `ai_usage_logs`.

## 4. Flujo "Crear con una foto" (el principal)
1. **Nuevo → Tomar foto** (en el teléfono abre la cámara: `capture="environment"`) o **Subir foto**.
2. Mensajes mientras la IA trabaja: "Mirando tu producto…", "Leyendo la etiqueta…".
3. **Revisa lo que encontramos:** formulario corto ya lleno (nombre, categoría, marca, presentación y los campos del rubro). La persona solo agrega **precio** y **cuántas tiene**. Si la confianza es baja: "No reconocimos bien el producto, completa el nombre".
4. Opcional: **"Mejorar foto con IA"**. Muestra la original y la mejorada lado a lado; la persona elige cuál usar.
5. **Guardar.**

## 5. Vista lista ↔ cuadrícula
- Switch en la barra de Mi mercancía (íconos lista/cuadrícula, `v-btn-toggle`). La preferencia se recuerda en localStorage (`ad_mercancia_vista`). Por defecto: cuadrícula si hay fotos, lista si no.
- **Cuadrícula:** tarjetas con la foto cuadrada (o un espacio con el ícono del tipo), nombre en 2 líneas, precio, stock con semáforo (o chip "Servicio") y el tipo arriba a la izquierda. En el teléfono, 2 columnas; en escritorio, 4 a 5. Tocar la tarjeta abre el detalle o la edición.
- **Lista:** la fila actual, con miniatura de la foto.
