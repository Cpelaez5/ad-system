# Mi mercancía: fotos, servicios, "Foto y listo" y "Foto del estante" — informe

## Qué se hizo
- **Cuadrícula / lista** con switch (`ad_mercancia_vista`; por defecto cuadrícula si hay fotos). Tarjetas con foto cuadrada o ícono del tipo, nombre en 2 líneas, precio, chip de stock o "Servicio"; 2 columnas en teléfono, 3 / 4 / 5 al crecer. La lista lleva miniatura. Fotos con URL firmada en lote (`firmarVarias`).
- **Acción principal "Tomar foto"** (cámara, `capture="environment"`), más "Subir foto", "Foto del estante", "Escribirlo yo" y "Nuevo servicio".
- **Foto y listo:** `CrearConFotoDialog` (sube, IA, mensajes amables) → `ProductoFormDialog` ya lleno (solo precio y "¿Cuántas tienes?"), "Mejorar foto con IA" con original y mejorada lado a lado, y al guardar "Tomar otra foto" para cargar en ráfaga. Si la IA falla o duda, el formulario queda editable con un aviso; nunca bloquea.
- **Foto del estante:** `EstanteDialog`; recortes con canvas desde `box_2d`, nombre editable, cantidad con +/−, coincidencia con el inventario ("Nuevo" / "Ya lo tienes…", corregible con "No es este"), switch para incluir. "Crear N productos nuevos" (recorte subido como foto, precio opcional) y "Ajustar existencias de N productos" con pantalla de confirmación antes → después y movimiento `ADJUSTMENT` "Conteo por foto". La foto del estante se borra del bucket tras analizarla.
- **Servicios:** crear y editar (tipo servicio), sin stock ni costo, sin movimientos (`registerMovement` los ignora), campos de `CAMPOS_SERVICIO`, filtro Todo / Productos / Servicios, tipo por defecto según rubro.
- **Rubro:** campos de `camposDe(rubro)` en el formulario; sin rubro, invitación con selector que guarda en `clients.rubro` (`rubroService`). Selector de rubro también en Mi negocio (Datos de la empresa).
- **Siguiente paso:** "N productos sin precio → Ponerles precio" (prioridad sobre stock) y chip de filtro "Sin precio". Las cifras de stock excluyen servicios.
- `inventoryService`: `normalizarCamposCatalogo` (tipo, categoria, marca, codigo_barras, atributos limpios, fotos; servicios con stock 0). El formulario ahora envía campos explícitos (ya no el registro entero).

## Archivos
Nuevos: `src/services/productoFotoService.js`, `src/services/rubroService.js`, `src/utils/estante.js`, `src/utils/fotoYListo.js`, `src/components/inventory/{FotoProducto,ProductoFormDialog,CrearConFotoDialog,EstanteDialog}.vue`.
Cambiados: `src/views/cliente/Inventario.vue`, `src/views/cliente/ClienteMiArea.vue`, `src/services/inventoryService.js`.
Tests: `productoFotoService.test.js`, `inventoryService.test.js` (ampliado), `tests/utils/estante.test.js`, `tests/utils/fotoYListo.test.js`.

## Verificación
- Capturas en `docs/mvp/briefs/capturas/mercancia-{lista,cuadricula,analizando,foto-y-listo,estante}-{escritorio,movil}.png`. La IA, las subidas y las URLs de fotos se simularon con rutas de Playwright (no se escribió nada en la BD ni se llamó a la IA); algunas fotos de la cuadrícula son de ejemplo, solo en pantalla.
- El detector de impeccable no se ejecutó (presupuesto); se evitaron a mano azul marino (las alertas informativas usan `secondary`), tarjetas KPI y bordes laterales.

## Pendiente / notas
- No se probó la IA real ni el recorte con fotos reales de estante (solo imagen sintética y respuesta simulada).
- En el teléfono la cuadrícula queda debajo del avance de stock y los filtros; conviene compactar esa cabecera en una pasada de diseño.
- Subir lista de Excel sigue sin existir (se quitó el botón secundario del estado vacío a favor de "Escribirlo yo").
- Al reemplazar una foto no se borra la anterior del bucket (huérfanas).
- Servicios en ventas/facturas: no se revisó el buscador de productos de facturación.
