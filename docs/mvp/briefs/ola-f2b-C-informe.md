# Informe — Tarea C: OCR más inteligente en el registro simple

Agente: Claude Sonnet 5 (implementador Tarea C, ola Fase 2b). Worktree:
`agent-ad0e2ea8e4ced3d32`.

## Resumen de lo implementado

### 1. Proveedor desde el RIF del OCR (`src/components/forms/client/SimpleInvoiceForm.vue`, `src/services/registroService.js`)

- **Normalización de RIF**: `src/utils/rif.js` → `normalizarRif(valor)`, función
  pura que reescribe cualquier variante (minúsculas, sin guiones, espacios,
  sin letra) al formato canónico `L-12345678-9`. Se usa tanto para comparar
  (OCR vs. BD) como para guardar el RIF del proveedor nuevo. Tests en
  `src/utils/__tests__/rif.test.js` (9 casos).
- **Matching** (`matchProveedorFromOcr`): ahora compara por RIF usando
  `normalizarRif` en ambos lados (antes comparaba solo alfanumérico sin
  reconocer el formato), además de los niveles existentes de nombre exacto y
  parcial. Sin cambios de comportamiento ahí salvo la normalización.
- **Proveedor nuevo pendiente**: cuando no hay match y el OCR sí trajo un RIF
  reconocible, `_ofrecerCrearProveedor` ya no solo abre un snackbar pidiendo
  click en "Nuevo": ahora deja la marca `formData.issuer._proveedorPendiente =
  { nombre, rif, direccion, telefono, email }`. La UI (en los dos lugares
  donde aparece el selector de proveedor: paso 2 del modo simple y la
  sección "¿De quién es esta factura?" de "Ver detalles") reemplaza el
  autocompletar por una tarjeta con el nombre leído y el chip **"Nuevo
  proveedor — se guardará al registrar"**, con un botón "Buscar otro" que
  cancela la marca y vuelve a mostrar el buscador normal (computeds
  `mostrarProveedorPendienteOcr` / `proveedorPendienteOcr`, método
  `cancelarProveedorPendienteOcr`). Si el OCR no trajo RIF (no se puede crear
  un proveedor sin RIF), se mantiene el flujo anterior (snackbar + prellenar
  el modal "Nuevo").
- **Creación real al guardar**: la marca nunca crea nada por sí sola. La
  creación vive en `registroService.guardarRegistro` (nueva función
  `resolverProveedorPendiente`): si hay `_proveedorPendiente` y no hay
  `issuer.id`, busca de nuevo por RIF normalizado (por si se creó entre
  tanto) y, si sigue sin existir, llama a `proveedorService.createProveedor`.
  Si falla, el registro **no se guarda** y se devuelve el mensaje de error en
  lenguaje llano. Esto corre solo dentro de `guardarRegistro` (solo al
  guardar de verdad); si el usuario cancela, no se llama nunca y no se crea
  nada. **No toqué** la parte de `fecha_fiscal` (update de una sola columna)
  ni la decisión RPC vs. `createInvoice`.
- Tests: `src/services/__tests__/registroService.test.js` (4 casos nuevos:
  crea y enlaza, reutiliza por RIF, falla sin guardar la factura, no hace
  nada si ya hay `issuer.id`) y
  `src/components/forms/client/__tests__/ocrProveedorYCategoria.test.js`
  (6 casos de matching/decisión, siguiendo el mismo patrón de
  `retentionCorrelatives.test.js`: no monta el componente completo —pesado,
  con Vuetify y muchos hijos—, sino que reproduce la misma lógica de
  decisión operando sobre los datos, e importa de verdad las funciones puras
  `normalizarRif`/`sugerirCategoria`).

### 2. Categoría sugerida (`src/utils/sugerirCategoria.js`)

- Función pura `sugerirCategoria({ proveedor, items, textoOcr, historial,
  categoriaIA })` → `{ categoria, confianza, motivo }`. Orden exacto del
  brief: (a) última categoría usada con ese proveedor (por RIF normalizado o,
  si no hay RIF, por nombre) con mayor confianza; (b) reglas por palabras
  clave (CORPELEC/electricidad, Inter/internet/telefonía/movistar/digitel/
  cantv, papelería/imprenta, comida, combustible/PDV, alquiler, Amazon/
  Mercado Libre/compras en línea); (c) pista `categoriaIA` si la IA del OCR
  la devolvió. **Nota**: añadí `categoriaIA` como parámetro opcional además
  de los 4 que pide el brief literalmente, porque la función solo recibe
  `textoOcr` como texto libre y necesitaba un canal separado para el tier
  (c) sin mezclarlo con las reglas de palabras clave del tier (b). Documento
  esto como la única desviación de la firma pedida.
- `categoria` es siempre un **nombre**, nunca un id: quien llama decide si
  existe de verdad para ese cliente.
- En `SimpleInvoiceForm.vue`, después de mapear los campos del OCR (solo si
  `flow === 'COMPRA'`): `sugerirYPrellenarCategoria(data)` arma
  `proveedor` (el ya vinculado, o el pendiente, o el `issuer` crudo del OCR),
  `textoOcr` (notas + `expenseCategoryHint`), `historial` (ver abajo) y llama
  a `sugerirCategoria`. Si hay sugerencia, busca una categoría **ya
  existente** del cliente con ese nombre (exacto o parcial, sin tildes —
  `_buscarCategoriaPorNombre`) y solo entonces prellena
  `formData.expense_category_id` + marca `categoriaSugerida = true` (chip
  **"Sugerido"** junto a la etiqueta "¿En qué?" / "Categoría del Gasto", en
  los dos lugares donde aparece `ExpenseCategorySelector`). **Nunca crea una
  categoría nueva sola**: si no existe, el campo queda vacío para que el
  usuario la elija o la cree a mano. El chip desaparece en cuanto el usuario
  toca el selector de verdad (evento `@category-selected`, que
  `ExpenseCategorySelector` solo emite por interacción real, no por el
  `v-model` programático).
- Historial (`_obtenerHistorialCategoriasProveedor`): usa
  `invoiceService.getInvoices({ flow: 'COMPRA', clientId })` (ya existente,
  trae `issuer` y `expense_categories(name)` vía join) y lo reduce a
  `{ proveedorRif, proveedorNombre, categoriaNombre, fecha }`. Es de solo
  lectura y nunca lanza (si falla, se sugiere sin historial).
- **Pista de la IA (tier c)**: añadí el campo `expenseCategoryHint` al JSON
  que pide `ENHANCED_EXTRACTION_PROMPT` en `src/services/clientOcrService.js`
  (una palabra/frase corta con el tipo de gasto, o `null`). Es un cambio
  mínimo y aditivo al prompt existente; no toqué `baseOcrService.js` ni
  `gemini/geminiOcrService.js` (no hizo falta, solo pasan la respuesta de la
  IA tal cual).
- Tests: `src/utils/__tests__/sugerirCategoria.test.js` (9 casos: Corpelec,
  Inter, imprenta digital, Amazon, prioridad del historial por RIF y por
  nombre, pista de IA, sin ninguna señal, no lanza con parámetros vacíos) y
  los 4 casos de resolución contra "categorías del cliente" en
  `ocrProveedorYCategoria.test.js`.

### 3. Ventas con ítems del OCR (C5)

Revisé `handleExtractedData` (PASO 5, mapeo de productos): **ya existía**
código (de antes de esta tarea) que carga `data.items` como líneas de
`formData.items` (descripción, cantidad, precio, total) para **cualquier**
flujo, no solo compras — `isPurchase` solo controla el auto-alta en
inventario (nunca se toca para VENTA). No encontré nada que cambiar aquí: la
venta con OCR ya carga sus ítems en "Ver detalles" sin tocar inventario. No
agregué un test nuevo para esto porque no cambié esa lógica; dejo la
verificación formal (si hace falta) a quien tenga las facturas de prueba
reales para correr `e2e/05-ocr.spec.js`.

### 4. Estado de carga con mensajes rotativos

También ya existía (`simpleReadingMessages`, `simpleReadingMessage`, watcher
de `extracting`) de un trabajo previo a esta tarea: rota 4 mensajes humanos
("Leyendo tu documento...", "Buscando el total...", "Revisando los
datos...", "Ya casi está...") mientras `extracting` es `true`. Es solo texto
interpolado (sin transición/animación), así que no hay nada que "respetar"
de `prefers-reduced-motion` ahí. No lo toqué.

### 5. Pruebas

- Unitarias nuevas: `rif.test.js` (9), `sugerirCategoria.test.js` (9),
  `ocrProveedorYCategoria.test.js` (10), + 4 casos nuevos en
  `registroService.test.js`. Total suite completa: **681 tests, todos en
  verde** (`TZ=America/Caracas npx vitest run`).
- `npm run build`: verde (el aviso de chunks > 500 kB es preexistente, no
  relacionado con esta tarea).
- **E2E (`e2e/05-ocr.spec.js`)**: amplié el spec (función
  `verificarProveedorYCategoriaPrellenados`, llamada en ambos tests antes de
  "Cerrar") para comprobar que, si el documento es COMPRA/GASTO, el bloque de
  proveedor pendiente (si aparece) trae el nombre leído y el chip "Nuevo
  proveedor", y que el chip "Sugerido" de categoría (si aparece) es visible.
  Es deliberadamente tolerante: no exige que el chip de categoría aparezca
  (depende de si el cliente de prueba ya tiene esa categoría creada).
  **No pude ejecutar este spec**: en este worktree no existen ni
  `examples/facturas-prueba/` (los PDF reales que usa el spec) ni
  `e2e/.env.e2e.local`, y copiarlos/ejecutar E2E con llamadas reales a la IA
  queda fuera de lo que puedo verificar yo mismo aquí. Queda para quien corra
  la suite completa con las credenciales y fixtures reales.

## Archivos tocados

- `src/utils/rif.js` (nuevo) + `src/utils/__tests__/rif.test.js` (nuevo)
- `src/utils/sugerirCategoria.js` (nuevo) + `src/utils/__tests__/sugerirCategoria.test.js` (nuevo)
- `src/components/forms/client/SimpleInvoiceForm.vue`
- `src/components/forms/client/__tests__/ocrProveedorYCategoria.test.js` (nuevo)
- `src/services/registroService.js`
- `src/services/__tests__/registroService.test.js`
- `src/services/clientOcrService.js` (solo el prompt: campo `expenseCategoryHint`)
- `e2e/05-ocr.spec.js`

No toqué Facturacion/Compras/Gastos/Ventas.vue ni Proveedores.vue. El único
cambio en un servicio compartido (`proveedorService.js`) es **ninguno**: lo
usé tal cual existía (`getProveedores`, `createProveedor`); todo lo aditivo
quedó en `registroService.js` y `SimpleInvoiceForm.vue`.

## Dudas / para la contadora o el orquestador

1. **Nombres de categorías "oficiales"**: el brief dice "usando las
   categorías que ya existen en el código", pero las categorías de gasto no
   están en un enum fijo del código: viven en `expense_categories` por
   cliente (vía `ExpenseCategorySelector`/`expenseCategoryService`). Decidí
   que las reglas por palabra clave sugieran nombres "canónicos" (p. ej.
   "Electricidad", "Internet y telefonía", "Papelería e imprenta", "Compras
   en línea") y que el prellenado **solo** ocurra si el cliente ya tiene una
   categoría con ese nombre (match exacto o parcial, sin tildes) — nunca creo
   una categoría nueva sola. Si el cliente nombra sus categorías distinto
   (p. ej. "Luz" en vez de "Electricidad"), el chip no aparece. Me parece lo
   más seguro para un MVP sin reglas fiscales involucradas, pero si la idea
   era auto-crear la categoría sugerida cuando no exista, lo ajusto.
2. **RIF sin dígito verificador**: si el OCR solo trae 8 dígitos (sin el
   verificador), `normalizarRif` devuelve `L-12345678` sin el último guión.
   `proveedorService.createProveedor` lo acepta igual (no valida formato),
   pero no sé si para tu operación real conviene bloquear la auto-creación en
   ese caso y pedir siempre confirmación manual del RIF completo.
3. No pude correr `e2e/05-ocr.spec.js` (fixtures/credenciales no están en
   este worktree) — si alguien con acceso a ellas lo corre y el chip/badge no
   aparecen como se espera, probablemente sea el punto 1 (categoría con otro
   nombre) o que el documento de prueba haya resuelto como VENTA en vez de
   COMPRA/GASTO.
