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

## 6. Foto del estante (pedido del usuario 2026-10-14)
Una sola foto de un estante, nevera o mostrador sirve para dos cosas:
- **Armar el catálogo:** crear los productos que aún no existen.
- **Contar el inventario:** ajustar la cantidad de los que ya existen.

**IA:** `{ accion: 'estante', foto_path }` → `{ productos: [{ nombre, marca, categoria, presentacion, unidad, cantidad_visible, box_2d, confianza }] }`. `box_2d` = [ymin, xmin, ymax, xmax] en 0–1000, o `null`. Máximo 40 productos (función `producto-ia` v2, desplegada).

**Flujo (pensado para el teléfono):**
1. **Mi mercancía → "Foto del estante"** (cámara). Mensaje: "Contando lo que hay en tu estante…".
2. **Resultado:** "Encontramos 14 productos". Lista de tarjetas, cada una con:
   - el **recorte** de ese producto, hecho en el navegador con `box_2d` sobre la foto original (canvas);
   - el nombre editable y la cantidad vista con +/−;
   - una marca automática: **"Nuevo"** o **"Ya lo tienes: Harina PAN 1 kg (stock 6)"**. La coincidencia con el inventario se busca en el navegador por código de barras, nombre normalizado o marca + presentación. La persona puede corregirla eligiendo otro producto o "Es nuevo".
   - Un switch para incluir u omitir cada tarjeta.
3. **Dos acciones claras abajo, fijas:**
   - **"Crear N productos nuevos":** usa el recorte como foto (se sube al bucket). Precio opcional: los que quedan sin precio se guardan y aparecen en "Tu siguiente paso: N productos sin precio → Ponles precio".
   - **"Ajustar existencias de N productos":** muestra antes → después por producto y registra el ajuste como movimiento de inventario con el servicio existente y el motivo "Conteo por foto". Nunca se pisa el stock en silencio: la persona confirma.
4. Si la confianza es baja o hay más de 40 productos: "Toma la foto más de cerca o por partes".

## 7. Importar desde Excel o CSV (pedido del usuario 2026-10-14)
Referencia: Norkut ofrece una plantilla por rubro (Supermercado, Hogar, Ferretería, Electrónicos, Moda, Farmacia, Librería, Mascotas y Otros) en XLS, XLSX o CSV. **Nuestro diferencial: no obligamos a usar la plantilla.**

**Flujo (pensado para el teléfono, en 3 pasos):**
1. **Subir.** Mi mercancía → ⋮ / "Importar desde Excel". Se acepta `.xlsx`, `.xls` o `.csv` (máx. 5 MB, 2.000 filas). Abajo, el enlace **"Descargar plantilla de mi rubro"**: genera en el navegador un `.xlsx` (con `exceljs`, que ya está en el proyecto) con:
   - una hoja **Productos** con los encabezados esenciales y los del rubro (`camposDe(rubro)`), con 2 o 3 filas de ejemplo propias del rubro;
   - una hoja **Instrucciones** que explica cada columna en lenguaje llano y los valores válidos.
2. **Reconocer columnas.** Se lee el archivo con `xlsx` (SheetJS) y se detecta la fila de encabezados. Cada columna se asocia sola por sinónimos normalizados (sin acentos ni mayúsculas): por ejemplo, "Precio", "P. Venta", "PVP" y "Precio $" van a precio; "Costo", "P. Costo" y "Costo unitario" a costo; "Existencia", "Stock", "Cantidad" e "Inv." a existencias; "Código", "SKU" y "Ref" a código; "Código de barras", "EAN" y "UPC" a código de barras. También reconoce las claves del rubro. La persona ve **"Encontramos estas columnas"** con un selector por columna para corregir o ignorar. Si el precio o el costo traen "$" o "USD", la moneda es USD; si traen "Bs", es VES.
3. **Revisar e importar.**
   - Resumen: "**120 productos**: 98 nuevos · 18 se actualizarán · 4 con problemas".
   - Las filas con problemas se muestran con el error en lenguaje llano ("Fila 14: el precio 'diez' no es un número"). Se pueden corregir ahí mismo u omitir.
   - Botón **"Importar 116 productos"**. Coincidencia con lo existente por código o código de barras (igual que la API).
   - Las existencias de los productos nuevos quedan como movimiento `INITIAL`. A los existentes **no se les pisan las existencias**: se ofrece aparte "Ajustar existencias de N productos" (movimiento `ADJUSTMENT`, motivo "Importación").
   - Se registra en `importaciones_productos` (origen `archivo`, con `ids_creados`).
   - Al terminar: "Listo, importamos 116 productos" y el botón **"Deshacer importación"**, disponible 24 h desde el historial. Mueve a la papelera (`deleted_at`) los creados que aún no tienen movimientos de venta.

Lógica pura en `src/utils/importacionProductos.js`: detección de encabezados, sinónimos, normalización de números ("1.234,56" y "1,234.56"), validación por fila y plan crear/actualizar. Todo con tests.

## 8. API de productos (pedido del usuario 2026-10-14)
- Edge Function **`api-productos`** v1 (desplegada, `verify_jwt=false`; se autentica con `x-api-key`).
  - `GET /functions/v1/api-productos?pagina=&por_pagina=&codigo=` → `{ productos, pagina, por_pagina }`.
  - `POST` con `{ productos: [...] }` (máx. 500 por llamada) → `{ creados, actualizados, errores: [{ fila, mensaje }] }`.
  - Campos en español: `nombre`, `codigo`, `codigo_barras`, `tipo`, `categoria`, `marca`, `descripcion`, `precio`, `costo`, `moneda` (VES/USD/EUR), `iva` (general/reducido/lujo/exento → `IVA_G`/`IVA_R`/`IVA_A`/`EXENTO`), `unidad`, `existencias` (solo al crear), `existencias_minimas`, `atributos`.
- **Llaves:** tabla `api_keys`. Solo se guarda el hash SHA-256, que la app no puede leer. Las RPC son `crear_api_key(nombre)`, que devuelve la llave **una sola vez**, y `revocar_api_key(id)`, con un máximo de 5 activas. Migración `20261014120000`.
- **UI:** Mi negocio → sección **"Conexiones"** (plegada por defecto, para no asustar):
  - texto "Conecta tu tienda en línea u otro sistema";
  - lista de llaves (nombre, `ads_xxxxxxxx…`, último uso, Revocar);
  - "Crear llave": un diálogo que muestra la llave una vez, con Copiar y el aviso "Guárdala, no la volveremos a mostrar";
  - enlace "Cómo usar la API", hacia la documentación pública (fase final).
