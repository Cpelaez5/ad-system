---
titulo: API de productos
resumen: Para programadores. Carga y consulta los productos de tu empresa desde tu tienda en línea u otro sistema.
palabras: api, programadores, productos, x-api-key, llave, curl, javascript, fetch, json, integración, tienda en línea, catálogo, post, get, lote, errores, codigo, codigo_barras
orden: 13
---

# API de productos

Esta guía es para el programador que va a conectar tu tienda en línea, tu punto de venta o una hoja de cálculo con **Mi mercancía**. Con la API puedes **consultar** tus productos y **cargar o actualizar** hasta 500 por llamada.

## Dirección base

```
https://<proyecto>.supabase.co/functions/v1/api-productos
```

En la página de ayuda, `<proyecto>` ya aparece reemplazado por el dominio real de AD System. Si lo ves tal cual, es el nombre de tu proyecto en la dirección.

## 1. Crear la llave

La API se autentica con una **llave**, que es como una contraseña de tu empresa. Se crea desde la aplicación:

1. Entra a **Mi negocio**.
2. Abre la sección **Conexiones** (viene cerrada; tócala).
3. Toca **Crear llave** y ponle un nombre, por ejemplo «Mi tienda en línea».
4. Toca **Copiar llave** y guárdala. **Solo se muestra una vez.** Si la pierdes, crea otra y revoca la anterior.

Detalles:

- Las llaves empiezan con `ads_`.
- Puedes tener hasta **5 llaves activas**.
- Para dejar de aceptar una llave, tócala en **Revocar**: deja de funcionar de inmediato.
- Cada llave da acceso solo a **los productos de tu empresa**.

> Trata la llave como una contraseña: no la pongas en una página web ni en una app móvil. Úsala solo desde tu servidor.

## 2. Autenticación

Envía la llave en el encabezado `x-api-key` en cada llamada:

```
x-api-key: ads_tu_llave
```

Sin llave, o con una llave inválida o revocada, la respuesta es `401` con el código `LLAVE`.

## 3. Consultar productos: GET

```
GET /functions/v1/api-productos?pagina=1&por_pagina=100&codigo=ABC123
```

| Parámetro | Tipo | Descripción |
|---|---|---|
| `pagina` | número | Página a leer. Empieza en 1. Por defecto 1. |
| `por_pagina` | número | Productos por página. Por defecto 100, máximo 500. |
| `codigo` | texto | Opcional. Devuelve solo los productos cuyo `codigo` **o** `codigo_barras` sea exactamente ese valor. |

Los productos vienen ordenados por nombre y no incluyen los eliminados.

Respuesta `200`:

```json
{
  "productos": [
    {
      "id": "0b9c4c1e-6f7a-4c3a-9a55-1f2d3c4b5a69",
      "nombre": "Harina de maíz 1 kg",
      "codigo": "HAR-001",
      "codigo_barras": "7591234567890",
      "tipo": "producto",
      "categoria": "Víveres",
      "marca": "Marca X",
      "descripcion": null,
      "precio": 1.5,
      "costo": 1.1,
      "moneda": "USD",
      "iva": "exento",
      "unidad": "UND",
      "existencias": 24,
      "existencias_minimas": 5,
      "atributos": {},
      "actualizado": "2026-10-14T15:30:00.000Z"
    }
  ],
  "pagina": 1,
  "por_pagina": 100
}
```

Para los **servicios**, `existencias` viene en `null`.

La respuesta no trae un total. Para leer todo el catálogo, pide páginas seguidas hasta que una venga con menos productos que `por_pagina`.

## 4. Cargar o actualizar productos: POST

```
POST /functions/v1/api-productos
Content-Type: application/json
```

Cuerpo: un objeto con la lista `productos`, de **1 a 500** elementos.

```json
{
  "productos": [
    { "nombre": "Harina de maíz 1 kg", "codigo": "HAR-001", "precio": 1.5, "moneda": "USD", "iva": "exento", "existencias": 24 },
    { "nombre": "Corte de cabello", "tipo": "servicio", "precio": 5, "moneda": "USD", "iva": "general" }
  ]
}
```

Respuesta `200`:

```json
{
  "creados": 2,
  "actualizados": 0,
  "errores": []
}
```

Cada producto se procesa por separado: si uno falla, **los demás sí se guardan**. Los que fallaron vienen en `errores`, con el número de fila (empieza en 1) y el motivo:

```json
{
  "creados": 1,
  "actualizados": 0,
  "errores": [
    { "fila": 2, "mensaje": "\"iva\" debe ser general, reducido, lujo o exento" }
  ]
}
```

### Crear o actualizar: la regla

Para cada producto, el sistema busca uno **existente de tu empresa** con el mismo `codigo` (sin distinguir mayúsculas de minúsculas) o el mismo `codigo_barras` (exacto):

- **Si lo encuentra, lo actualiza** con los campos que enviaste.
- **Si no, lo crea.**

Si no envías ni `codigo` ni `codigo_barras`, siempre se crea uno nuevo. Por eso conviene enviar siempre un `codigo` propio: así puedes repetir la carga sin duplicar productos.

Al actualizar, solo cambian los campos que envíes; los demás se quedan como estaban. Siempre se toman `nombre` y `tipo` (si no envías `tipo`, se toma como `producto`).

### `existencias` solo se usa al crear

- Al **crear** un producto, `existencias` queda como sus existencias iniciales (con un movimiento de inventario «Existencias iniciales (API)»).
- Al **actualizar**, `existencias` se ignora. Para cambiar las existencias de un producto que ya existe, usa la aplicación (**Mi mercancía**).

Los servicios no llevan `existencias`, `existencias_minimas` ni `costo`: si los envías, se ignoran.

## 5. Campos

Solo `nombre` es obligatorio. Los campos y respuestas van en español.

| Campo | Tipo | Valores válidos y notas |
|---|---|---|
| `nombre` | texto | **Obligatorio.** Hasta 160 caracteres. |
| `codigo` | texto | Código interno o SKU. Hasta 60 caracteres. Se usa para crear o actualizar. |
| `codigo_barras` | texto | Hasta 60 caracteres. También se usa para crear o actualizar. |
| `tipo` | texto | `producto` (por defecto) o `servicio`. |
| `categoria` | texto | Hasta 80 caracteres. |
| `marca` | texto | Hasta 80 caracteres. |
| `descripcion` | texto | Hasta 1.000 caracteres. |
| `precio` | número | Precio de venta, en la `moneda` del producto. No puede ser negativo. |
| `costo` | número | Costo unitario. No puede ser negativo. Solo para productos. |
| `moneda` | texto | `VES`, `USD` o `EUR`. |
| `iva` | texto | `general`, `reducido`, `lujo` o `exento`. |
| `unidad` | texto | `UND`, `KG`, `LT`, `MT`, `PAQ` o `CAJA`. |
| `existencias` | número | Solo al crear. No puede ser negativo. Solo para productos. |
| `existencias_minimas` | número | Aviso de stock bajo. No puede ser negativo. Solo para productos. |
| `atributos` | objeto | Datos extra según el rubro, como `{ "talla": "M" }`. Debe ser un objeto, no una lista. |

Los números pueden venir como número (`1.5`) o como texto (`"1,5"`). Las letras de `moneda` y `unidad` pueden ir en mayúsculas o minúsculas. Un campo de texto vacío se guarda sin valor.

Si no envías un campo al **crear**, se usa el valor por defecto del producto.

## 6. Errores

Los errores de toda la llamada vienen con este formato:

```json
{ "error": { "code": "LLAVE", "message": "La llave de API no es válida o fue revocada." } }
```

| HTTP | `code` | Cuándo ocurre |
|---|---|---|
| 401 | `LLAVE` | Falta la llave, no tiene el formato correcto, es inválida o fue revocada. |
| 405 | `METODO` | Usaste un método distinto de GET o POST. |
| 400 | `CUERPO` | El cuerpo no es JSON válido. |
| 400 | `VACIO` | Falta `productos` o la lista viene vacía. |
| 413 | `LOTE` | Enviaste más de 500 productos en una llamada. |
| 500 | `CONSULTA` | No pudimos leer los productos. Intenta de nuevo. |

Los errores de un producto en particular no hacen fallar la llamada: llegan en la lista `errores` de la respuesta `200`. Los mensajes más comunes son:

- `Falta "nombre"`
- `"precio" debe ser un número` (o `costo`, `existencias`, `existencias_minimas`)
- `"precio" no puede ser negativo`
- `"moneda" debe ser VES, USD o EUR`
- `"iva" debe ser general, reducido, lujo o exento`
- `"unidad" debe ser UND, KG, LT, MT, PAQ, CAJA`
- `"atributos" debe ser un objeto`
- `No pudimos crearlo` / `No pudimos actualizarlo`

## 7. Ejemplos con curl

Leer la primera página:

```bash
curl "https://<proyecto>.supabase.co/functions/v1/api-productos?pagina=1" \
  -H "x-api-key: ads_tu_llave"
```

Buscar por código (o código de barras):

```bash
curl "https://<proyecto>.supabase.co/functions/v1/api-productos?codigo=HAR-001" \
  -H "x-api-key: ads_tu_llave"
```

Cargar un lote:

```bash
curl -X POST "https://<proyecto>.supabase.co/functions/v1/api-productos" \
  -H "x-api-key: ads_tu_llave" \
  -H "Content-Type: application/json" \
  -d '{
    "productos": [
      { "nombre": "Harina de maíz 1 kg", "codigo": "HAR-001", "precio": 1.5, "moneda": "USD", "iva": "exento", "existencias": 24 },
      { "nombre": "Corte de cabello", "tipo": "servicio", "precio": 5, "moneda": "USD", "iva": "general" }
    ]
  }'
```

## 8. Ejemplos con JavaScript (fetch)

Leer todo el catálogo, página por página:

```javascript
const URL_BASE = 'https://<proyecto>.supabase.co/functions/v1/api-productos'
const LLAVE = process.env.AD_SYSTEM_API_KEY // guárdala en una variable de entorno

async function leerTodos() {
  const porPagina = 200
  const todos = []
  for (let pagina = 1; ; pagina++) {
    const res = await fetch(`${URL_BASE}?pagina=${pagina}&por_pagina=${porPagina}`, {
      headers: { 'x-api-key': LLAVE },
    })
    const datos = await res.json()
    if (!res.ok) throw new Error(datos.error?.message || `Error ${res.status}`)
    todos.push(...datos.productos)
    if (datos.productos.length < porPagina) break
  }
  return todos
}
```

Cargar muchos productos en lotes de 500:

```javascript
async function cargar(productos) {
  const resumen = { creados: 0, actualizados: 0, errores: [] }
  for (let i = 0; i < productos.length; i += 500) {
    const lote = productos.slice(i, i + 500)
    const res = await fetch(URL_BASE, {
      method: 'POST',
      headers: { 'x-api-key': LLAVE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos: lote }),
    })
    const datos = await res.json()
    if (!res.ok) throw new Error(datos.error?.message || `Error ${res.status}`)
    resumen.creados += datos.creados
    resumen.actualizados += datos.actualizados
    // La fila es relativa al lote: se suma el desplazamiento para ubicarla en tu lista.
    resumen.errores.push(...datos.errores.map((e) => ({ ...e, fila: e.fila + i })))
  }
  return resumen
}
```

## 9. Límites

- **Máximo 500 productos por llamada POST.** Si envías más, recibes `413` con el código `LOTE`.
- **`por_pagina` máximo 500** en GET (por defecto 100).
- **Hasta 5 llaves activas** por empresa.
- La API no define un límite de llamadas por minuto, pero lo correcto es enviar lotes en lugar de un producto por llamada.
- Cada carga queda anotada como una **importación** de origen API en tu cuenta.

## 10. ¿Dudas?

Escríbenos por el chat dentro de AD System y cuéntanos qué intentas hacer. Para la parte de la aplicación (crear la llave, ver tus productos), mira [Mi negocio](/ayuda/mi-negocio) y [Mi mercancía](/ayuda/mi-mercancia).
