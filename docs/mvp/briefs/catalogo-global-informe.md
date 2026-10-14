# Catálogo global conectado a las pantallas — informe

Fecha: 2026-10-14. Rama del worktree: `worktree-agent-abe590345a2802504` (parte de `feat/ola-f2b`). Sin migraciones y sin escrituras en la BD real.

## Qué se construyó
1. `src/services/catalogoService.js` y `src/utils/codigoBarras.js`. El servicio tiene `buscarProveedorPorRif`, `buscarProducto`, `buscarProductosPorCodigos` (un `in` por lote de 200), `urlFotoCatalogo` y `copiarFotoCatalogoAlNegocio` (descarga, reduce y sube con `subirBlob`). Nunca lanzan: devuelven null o [] y registran con `logger`.
2. **Nuevo proveedor** (`ProveedorModalForm.vue`): con RIF "letra + 9 dígitos", consulta tras 400 ms. Llena solo nombre y dirección vacíos. Muestra "Datos de AD System · confirmados por N negocios" o "· verificados", con "No es este" que deshace solo lo llenado. Solo al crear. No toca las retenciones.
3. **OCR de compras** (`registroService.resolverProveedorPendiente`): completa razón social y domicilio con el catálogo cuando el OCR no los trajo. Lo del OCR manda.
4. **Mi mercancía** (`ProductoFormDialog.vue`): búsqueda por código válido (escrito o de la IA), con 400 ms de espera. Llena nombre, marca, categoría, presentación (en `atributos`) y unidad solo si están vacíos. Ofrece "Usar foto del catálogo". Sin código, muestra hasta 3 sugerencias "¿Es alguno de estos?" al escribir 3 o más letras, solo al crear. Botón "Escanear" (`EscanerCodigoBarras.vue` en `DialogoAdaptable`) solo si existe `BarcodeDetector`. Lee EAN-13, EAN-8, UPC-A y UPC-E, apaga la cámara y maneja el permiso rechazado ("Para escanear, permite usar la cámara.").
5. **Importar Excel**: `completarConCatalogo` (utils) y `cargarCatalogo` (servicio, un solo select). Solo completa filas **nuevas**, y solo marca, categoría, presentación y unidad vacías. Las filas que actualizan un producto existente no se tocan. En la vista previa llevan "Completado con el catálogo".
   - **Mejora pendiente:** las fotos del catálogo no se copian en la importación (serían cientos de subidas).

## Pruebas
- Vitest completo: 108 archivos, 1000 pruebas en verde (con `TZ=America/Caracas`). Pruebas nuevas para `codigoBarras`, `catalogoService`, `catalogoProducto`, escáner, proveedor, producto, importación y OCR.
- E2E `e2e/13-catalogo.spec.js` (escritorio y móvil): "Escribirlo yo", código inválido, Cancelar. Pasa.
- Íconos usados verificados a mano en `materialdesignicons.css`.

## Capturas (`docs/mvp/briefs/capturas/`)
`catalogo-proveedor-{escritorio,pixel7}.png`, `catalogo-producto-{escritorio,pixel7}.png` y la ronda de confirmación `catalogo-confirmacion-*.png`.
- El proveedor usa un RIF real del catálogo (solo lectura).
- `catalogo_productos` tiene 0 filas hoy, así que las sugerencias de producto de las capturas usan una respuesta simulada del RPC en el navegador (no se escribió nada).

## Notas
- El puerto 5188 estaba ocupado por la vista previa de otro agente; se usó 5199.
- La foto del catálogo y el escáner no se pudieron probar contra datos reales (no hay fotos ni cámara en el entorno); están cubiertos con pruebas unitarias con mocks.
