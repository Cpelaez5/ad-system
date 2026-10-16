# Análisis de capturas de Norkut (competidor) — insumos para AD System

Fuente: 27 capturas en `examples/nk-captures/` tomadas el 13/10/2026 sobre Norkut, SaaS de retail venezolano (ERP + POS + marketing). No son pantallas contables puras (Norkut es más retail/POS que fiscal), pero su sistema de diseño, sus asistentes paso a paso y su uso de IA dan ideas aprovechables para AD System.

---

## 1. Inventario de capturas

| # | Archivo | Módulo / pantalla | Qué se ve |
|---|---|---|---|
| 1 | `134142.png` | Onboarding / Inicio | Tarjeta "Completa tu información" con checklist acordeón de 4 pasos (empresa, locales, productos, descargar POS), 3 ya completados (check verde en fondo durazno), banner inferior promocionando la app POS con ilustración y botones "Descargar POS" / "Ver instructivo". |
| 2 | `134214.png` | Tienda > POS > Tokens | Shell completo de la app: sidebar con grupos colapsables (Resumen, Cuentas, Tesorería, Tienda, POS activo), top bar con indicador de tasa de cambio (0%), saldo en VES, campana de notificaciones, chat, usuario. Contenido: tarjeta "¿Listo para facturar?" con botones de descarga por SO (MacOS/Windows/Android) y código de activación; tabla "Lista de tokens" debajo. |
| 3 | `134425.png` | App POS de escritorio — activación paso 1 | Ventana standalone con logo, stepper de 4 círculos horizontales, campo para pegar el token de suscripción, link de ayuda, botón "Siguiente" grande. |
| 4 | `134435.png` | Web > POS > Tokens (lista) | Tabla de tokens con columnas Token/Estación de trabajo/Estatus/Fecha; chip de estado verde "Asignado"; al pasar el mouse por una fila aparece menú contextual flotante "···" con acción "Desvincular". |
| 5 | `134507.png` | App POS — activación paso 2 | Selección de tienda/sucursal vía dropdown ("Tiendas disponibles") con 3 opciones listadas; stepper muestra paso 1 completado (punto relleno) y paso 2 activo. |
| 6 | `134525.png` | App POS — activación paso 3 | Pantalla de sincronización inicial: 4 filas con ícono + etiqueta (Descargando productos/usuarios/tasas de cambio/clientes), barra de progreso individual y porcentaje a la derecha; botón "Completado" deshabilitado hasta terminar. |
| 7 | `134551.png` | App POS — login | Tarjeta simple "Bienvenido/a", campos Correo y Pin/contraseña (con ícono ojo para mostrar/ocultar), botón "Iniciar sesión" deshabilitado en gris hasta llenar campos. |
| 8 | `134808.png` | App POS — pantalla de venta | Grid de productos (imagen, ícono etiqueta/inventario, nombre, precio dual Bs/USD) con buscador y "Filtros"; panel derecho de carrito con campo de documento de cliente, totales y botón "Pagar"; rail de íconos a la izquierda con tooltip al hover; aviso "Abrir turno" requerido antes de vender. |
| 9 | `135002.png` | App POS — Configuración > Dispositivos | Tarjetas radio-seleccionables agrupadas por categoría: "Dispositivos fiscales" y "Impresoras" (detecta automáticamente impresoras del sistema operativo, incluidas virtuales como "Microsoft Print to PDF"); link de ayuda "Ver dispositivos compatibles". |
| 10 | `140233.png` | App POS — modal "Cambio de precio" | Modal contextual al tocar el lápiz de un producto en el carrito: nombre de producto, precio actual vs. campo "Precio nuevo", texto de advertencia de alcance ("solo afectará la factura actual"), botones Volver/Confirmar. |
| 11 | `140531.png` | App POS — modal de IA ("Sugerencia norkut IA") | Modal con borde degradado violeta/celeste, ícono de marca IA; sugiere pedirle al cliente un dato de segmentación ("¿Con qué frecuencia haces las compras?") mediante chips de opción rápida, con un chip de contexto de rubro ("Supermercado"); Cancelar/Guardar. |
| 12 | `140817.png` | App POS — pantalla de pago (resumen) | Resumen de compra con toggle VES/USD, línea de cliente con cédula y correo, líneas de producto con precio tachado cuando hay descuento; panel derecho "Métodos de pago" con botones ícono (Débito/Crédito/Efectivo/Pago móvil/Otros) y lista vacía "Pagos ingresados"; desglose de totales (Descuento, Impuesto IVAG, Recibido, Restante) en ambas monedas. |
| 13 | `140900.png` | App POS — pago con método "Efectivo" | Mismo layout con pestaña Efectivo activa; chip "20% off" junto al monto; selector de moneda (US Dollar) + campo de monto con nota inline de impuesto incluido; botón "Agregar" para registrar el pago parcial (pagos múltiples/mixtos). |
| 14 | `142237.png` | App POS — Arqueo de caja | Pantalla de cierre de turno: panel "General" (usuario, tienda, documentos emitidos, fecha), tabla "Pagos" por método/moneda con columnas Sistema/Conteo/Diferencia (diferencias en rojo), panel derecho "Detalle de recolección" con totales y textarea "Observaciones"; botones Guardar/Cerrar turno. |
| 15 | `143341.png` | Web > Finanzas — detalle de factura | Vista de documento: cabecera con fecha/identificador, tabla "Pagos" (método/moneda/importe/ajuste/tasa de cambio), tabla "Detalle de Productos" (cantidad/precio/ajuste/impuestos/total), columna derecha con "Contacto" y "Resumen" (subtotal, descuentos, impuestos, total). Sidebar completo visible (Marketing, Reportes, Finanzas, Tienda). |
| 16 | `144708.png` | Marketing > Campañas — asistente nueva campaña, paso 1 | Stepper horizontal de 5 pasos con íconos (Campaña/Clientes/Promoción/Configuración/Difusión); formulario "Planificación" (nombre, uso máximo con stepper +/-, fechas con selector, tienda, descripción); panel derecho persistente "Resumen" (vacío) + zona de arrastrar imagen con ilustraciones de fondo relacionadas al rubro. |
| 17 | `144859.png` | Asistente de campaña, paso 2 "Clientes" | Paso 1 con check de completado; caja de segmentación con IA en lenguaje natural ("Escribe lo que quieres buscar...", placeholder de ejemplo), botón "Generar"; el panel "Resumen" ya muestra datos acumulados de pasos previos (nombre, duración, tiendas, clientes, otros detalles). |
| 18 | `145259.png` | Asistente de campaña, paso 3 "Promoción" | Configuración de beneficio: tipo de descuento, porcentaje y cantidades mínimas con inputs stepper +/-, radio "Al producto de mayor/menor precio", tabla de productos elegibles con buscador y paginación; link "Generar" con ícono de IA junto a la carga de imagen. |
| 19 | `145444.png` | Asistente de campaña, paso 4 "Configuración" | Condición de compra con dropdown de validación resaltado en naranja (campo requerido), toggle "Aplicar en todos los productos", toggle "Sin límite/Con límite" para tickets por factura, estado vacío ilustrado antes de agregar productos a la promo. |
| 20 | `150252.png` | Marketing > Campañas > Chat IA | Interfaz de chat completa con "Norkut AI": historial de conversaciones a la izquierda (título + resumen autogenerado tipo ChatGPT), el usuario pide una campaña en lenguaje natural, la IA responde con un párrafo explicando su razonamiento y entrega una tarjeta estructurada ("Favoritos de la Semana") con campos iconográficos (Promoción/Duración/Clientes/Productos) y acciones "editar"/"Ver más"; input inferior "Describe tu campaña". |
| 21 | `150721.png` | Marketing > Campañas > Calendario | Vista de calendario mensual tipo Google Calendar: cada campaña es un chip de color en el/los días que dura, filtro por tienda, botón "Nueva campaña", toggle de vista lista/calendario. |
| 22 | `150809.png` | Reportes > Reportes personalizados (catálogo) | Grid de tarjetas de reportes prearmados, cada una con título, chip de categoría coloreado (Finanzas/Compras/Ventas/Productos/Inventario), descripción de 2-3 líneas, metadatos "Creado por: Sistema/Usuario" y chips "Propio/Compartido"; paginación (27 reportes). |
| 23 | `150827.png` | Reportes > Editor de reporte personalizado | Formulario de cabecera (nombre, módulo, descripción) con toggle "Compartir reporte"; sección "Vista previa" con tabs ("Todo" + agregar), buscador y estado vacío guiando a configurar antes de previsualizar. |
| 24 | `151039.png` | Reportes > Constructor drag-and-drop | Modal de 3 columnas: "Campos" (buscador + lista con tipo de dato y descripción), "Columnas" (zona de destino al arrastrar), "Valores a calcular" (selector de agregación SUM/AVG/MIN/MAX); botones Salir/Generar reporte. |
| 25 | `153802.png` | Finanzas > Cuentas por pagar — registrar pago | Formulario de pago (cuenta bancaria, método, número de documento con validación roja "Es requerido", fecha); panel "Totales" dual-moneda (Total facturas, Total pagado, Saldo pendiente, Monto a pagar, Nuevo saldo pendiente); tabla de facturas con columna editable "Monto a pagar" y chip automático "Ajuste de tasa" cuando cambia el tipo de cambio. |
| 26 | `154233.png` | Finanzas > Retención de impuestos > Retención de compras > Crear comprobante | Breadcrumb profundo (4 niveles); buscador de proveedor con botón "Buscar" deshabilitado hasta completar; panel "Facturas pendientes" en estado vacío con copy instructivo ("Selecciona una tienda y un proveedor, luego presiona Buscar…"); panel "Totales" (facturas seleccionadas, total retenido). |
| 27 | `154355.png` | Finanzas > Tesorería > Cuentas bancarias | Grid de tarjetas por cuenta: saldo grande, chip de moneda coloreado (ARS azul, VES naranja, USD verde), número de cuenta enmascarado con ícono de copiar, sección "Métodos de pago" en estado vacío; agrupación por banco con logo-badge; acciones superiores Importar cuentas / Registrar cuenta / Transferir. |

*(No se incluyeron nombres, correos, cédulas ni teléfonos de personas reales visibles en las capturas; se describen de forma genérica.)*

---

## 2. Sistema de diseño observado

**Layout y navegación**
- Shell clásico de ERP web: sidebar izquierdo fijo con grupos colapsables por dominio (Marketing, Reportes, Finanzas, Tienda) y breadcrumbs de 2 a 4 niveles en la parte superior de cada pantalla — útil para orientarse en flujos profundos como "Retención de compras".
- La app POS de escritorio usa un **rail de íconos vertical** (sin texto, con tooltip al hover) en vez de sidebar completo: layout denso pensado para operación rápida en caja, distinto del ERP de back-office.
- Los asistentes multipaso (campañas, activación de POS) usan un **stepper horizontal con íconos + números**, con estado claro: pendiente (círculo vacío), activo (relleno naranja) y completado (check). Se repite igual en el wizard de 4 pasos del POS de escritorio y en el de 5 pasos de campañas — mismo componente reutilizado en dos productos.

**Jerarquía y densidad**
- Tarjetas (cards) como unidad base en casi todo: resumen de cuenta bancaria, producto de catálogo, dispositivo, reporte prearmado. Encabezado corto + 1-3 datos + metadatos secundarios en gris.
- Las pantallas financieras (pagos, retenciones, arqueo de caja) usan **dos columnas**: formulario/tabla operativa a la izquierda, panel de "Totales"/"Resumen" fijo a la derecha que se actualiza en vivo. Patrón muy aprovechable para nuestras pantallas de facturación.
- Densidad alta en tablas de reportes y facturas (Reportes personalizados, Facturas), densidad baja y más ilustrada en pantallas de onboarding/campaña (mucho espacio en blanco, mascotas/íconos decorativos de fondo).

**Tipografía y color**
- Marca Norkut: naranja (#F58220 aprox.) como color de acción primaria, flor/mariposa como isotipo, tipografía redondeada sans-serif. Fondo general gris muy claro, tarjetas blancas, texto gris oscuro/negro para contenido, gris medio para metadatos.
- Uso consistente de **chips de color por categoría** (moneda ARS/VES/USD, categoría de reporte, estatus de token) — ayuda a escanear visualmente tablas largas sin leer cada celda.
- Multi-moneda es un eje central del diseño: casi toda cifra de dinero se muestra en dos líneas, monto grande en moneda local y monto secundario menor en USD/otra divisa.

**Componentes recurrentes**
- Tablas con: checkbox de selección, columnas ordenables, menú contextual "···" que aparece al hover, chip de estado (verde=ok, rojo=diferencia/error), paginación con "Filas por página" + números.
- Chips de estado y de descuento ("20% off", "Asignado", "Propio/Compartido").
- Inputs numéricos con stepper +/- (cantidades, porcentajes, límites) en vez de solo campo de texto — reduce errores de tipeo en montos y facilita ajustes finos con el dedo/mouse.
- Validación inline en rojo/naranja con mensaje corto debajo del campo ("Es requerido") y borde de color en el campo mismo.
- Estados vacíos con copy instructivo accionable ("Selecciona una tienda y un proveedor, luego presiona Buscar para ver las facturas pendientes", "Configurá el reporte para ver una vista previa") — nunca una tabla vacía muda.
- Botones deshabilitados (gris) hasta cumplir condiciones (login, activar POS, Crear comprobante) como guía implícita de qué falta.
- Ayuda contextual puntual: links "Ver instructivo", "¿No sabes cómo obtenerlo? Ayuda", "Ver dispositivos compatibles" — ayuda in-place sin salir del flujo.
- Asistente IA con **identidad visual propia** (borde degradado violeta/celeste, nombre "norkut IA") diferenciado del resto de la UI naranja — se nota cuándo una sugerencia viene de IA vs. es contenido del sistema.
- Medidor de consumo/estado del sistema en el top bar: indicador circular de tasa de cambio (%), saldo de caja en VES, visibles permanentemente en cualquier pantalla.

**Microinteracciones**
- Hover en filas de tabla revela acciones contextuales (menú "···", "Desvincular") — mantiene la tabla limpia por defecto.
- Tooltips al pasar sobre íconos del rail de POS.
- Progreso en tiempo real con barras individuales por tipo de dato durante la sincronización inicial (mejor que una sola barra genérica, porque comunica qué está pasando).
- Toggle de moneda (VES/USD) que recalcula todo el resumen al vuelo.
- Ajuste automático con etiqueta visible ("Ajuste de tasa") cuando el tipo de cambio cambia entre la emisión y el pago de una factura — transparencia sobre un problema real en economías con inflación/devaluación, muy relevante para Venezuela.

---

## 3. Arquitectura de información

- **Agrupación por dominio de negocio**, no por tipo de pantalla: Marketing (Clientes, Campañas), Reportes, Finanzas (Resumen, Cuentas, Tesorería), Tienda (Gestión de tienda, POS, Configuración). Cada grupo se expande/colapsa independientemente — similar a como nosotros agrupamos "Mis movimientos", "Mis papeles", etc., pero ellos tienen más profundidad (sub-ítems dentro de sub-ítems, ej. Cuentas > Cuentas por pagar / Cuentas por cobrar / Retención de impuestos > Retención de compras).
- **Flujos multipaso con resumen vivo**: tanto crear una campaña (5 pasos) como activar el POS (4 pasos) usan un stepper + un panel de resumen que se va llenando con lo capturado en pasos anteriores, visible incluso mientras se trabaja en un paso posterior. Esto evita que el usuario "pierda de vista" lo ya decidido.
- **Onboarding guiado por checklist de tareas** en la pantalla de inicio (configurar empresa → locales → productos → descargar POS), con progreso visual (check verde) y una oferta contextual (descargar app POS) que aparece solo cuando tiene sentido para el usuario.
- **Guía para usuario nuevo**: estados vacíos siempre explican la siguiente acción concreta en lenguaje imperativo corto ("Selecciona... luego presiona Buscar"); hay links puntuales de "Ayuda" y "Ver instructivo" en los puntos de fricción (activación de token, dispositivos), no un manual separado.
- **Estado del sistema** se comunica de forma ambiental y constante: tasa de cambio arriba a la derecha, saldo de caja, notificaciones y chat siempre visibles; en arqueo de caja, la diferencia entre lo esperado por el sistema y lo contado se resalta en rojo apenas aparece, no hay que calcularlo.
- **Doble entrada de datos (lenguaje natural + estructurado)**: el módulo de campañas permite lograr lo mismo por dos caminos — wizard tradicional paso a paso, o chat conversacional con IA que termina generando la misma tarjeta estructurada. Dos audiencias servidas con un solo resultado.

---

## 4. Qué hacen bien y vale la pena adaptar a AD System

1. **Panel de "Resumen/Totales" fijo y en vivo al lado del formulario** (capturas 16-19, 25, 26). Aplicación directa: en **Mis movimientos** (factura de venta/compra/gasto), mostrar siempre a un lado (o debajo en móvil, pegado tipo sticky) el total, impuestos y retenciones calculados en tiempo real, antes de guardar. Para un usuario mayor, ver "lo que va a pagar o cobrar" sin tener que desplazarse reduce errores de carga y ansiedad ("¿quedó bien el cálculo?").

2. **Estepper numerado con estado visual claro (vacío/activo/completado) para flujos largos** (capturas 3, 5, 6, 16-19). Aplicación: registrar una factura con retención, o el flujo de **Registro de gasto/venta por foto (OCR)** — partirlo en pasos cortos (1. Foto → 2. Revisar datos OCR → 3. Confirmar impuestos/retención → 4. Guardar) con el mismo stepper visual, en vez de un formulario largo de una sola pantalla. Ayuda mucho a usuarios poco digitales porque reduce la carga cognitiva por pantalla.

3. **Estados vacíos con instrucción accionable en vez de tabla en blanco** (capturas 23, 26). Aplicación: en **Mis papeles** y **Mi mercancía**, cuando no hay vencimientos o no hay productos cargados aún, decir explícitamente "Agrega tu primer producto para empezar a controlar tu inventario" con un botón, no solo un ícono gris.

4. **Botones deshabilitados que se activan solo cuando los requisitos están completos** (capturas 7, 26). Aplicación: formularios de **Mi negocio** (perfil fiscal) y alta de proveedor — evita que el usuario mayor presione "Guardar" y reciba un error después; el sistema le indica visualmente que aún falta algo antes de intentarlo.

5. **Validación inline con color + mensaje corto bajo el campo** ("Es requerido") (capturas 19, 25). Aplicación: todos nuestros formularios fiscales (RIF, montos, fechas de vencimiento) — mensajes cortos y en el lugar exacto del error, no alertas genéricas arriba de la pantalla, que a usuarios mayores les cuesta relacionar con el campo correcto.

6. **Inputs numéricos con stepper +/-** para cantidades, porcentajes y límites (capturas 17-18). Aplicación: cantidades en **Mi mercancía** (inventario) y montos de retención en **Mis movimientos** — en móvil, tocar +/- es más fácil y preciso que escribir con el teclado numérico para alguien con poca destreza digital.

7. **Chips de color por categoría/estado para escanear tablas rápido** (capturas 4, 22, 27). Aplicación: en **Mis movimientos**, chips de color para tipo de documento (venta/compra/gasto) y estatus (pagada/pendiente/vencida); en **Mis papeles**, chips de color por tipo de obligación fiscal (IVA, ISLR, Municipal) — coherente con la barra de avance y "Tu siguiente paso" ya implementados.

8. **Ajuste automático y visible de tipo de cambio entre fecha de emisión y fecha de pago** ("Ajuste de tasa", captura 25). Aplicación directa y de alto valor para Venezuela: en **Mis movimientos**, cuando una factura se cobra/paga días después de emitida, mostrar automáticamente la diferencia cambiaria con un chip explicativo, en vez de dejar que el usuario lo calcule a mano. Es un dolor real de nuestro mercado que Norkut ya resolvió bien.

9. **Checklist de onboarding con progreso visual en la pantalla de inicio** (captura 1). Aplicación: en **Inicio**, checklist de primeros pasos para el cliente nuevo ("Completa tu perfil fiscal", "Carga tu primer gasto o venta", "Agrega tu sello y firma", "Revisa tus próximos vencimientos"), con checks que se van marcando solos — motiva a explorar el sistema sin depender de un video o manual.

10. **Ayuda contextual puntual en el momento de fricción** (links "Ayuda"/"Ver instructivo" junto al campo difícil, capturas 3, 9). Aplicación: junto al número de control fiscal o al cargar el sello/firma en **Mi negocio**, un link corto "¿No sabes dónde encontrarlo?" con una imagen de ejemplo — mucho más efectivo para un público mayor que un manual en PDF aparte.

11. **Resumen vivo que persiste a través de un wizard multipaso** (capturas 16-19). Aplicación: en el flujo de alta de producto en **Mi mercancía** o alta de proveedor en **Mis proveedores**, mostrar un panel lateral (o tarjeta superior en móvil) que acumule lo ya cargado, para que el usuario vea el avance sin tener que "confiar" en que el paso anterior se guardó bien.

12. **Dato de "¿Cómo voy?" ambiental en el top bar** (tasa de cambio, saldo). Aplicación: en **¿Cómo voy?** y en el header general, mostrar siempre un indicador mínimo (ej. "próximo vencimiento en X días" o "flujo de caja del mes") visible desde cualquier pantalla, no solo dentro del dashboard.

---

## 5. Qué hacen mal o no nos sirve

- **Jerga técnica de retail/ERP que no aplica a un dueño de bodega o comercio pequeño**: "Tokens", "Estación de trabajo", "Punto de venta", "SUM/AVG/MIN/MAX", "Arqueo de caja" sin explicación. Para nuestro público (dueños mayores, poco digitales), cualquier término así necesita lenguaje llano o un tooltip de apoyo; evitar introducir jerga nueva sin anclarla a una acción conocida.
- **Densidad alta y tablas largas sin resumen visual en pantallas como "Reportes personalizados" o "Cuentas bancarias"**: útil para un administrador de retail con varias tiendas, pero abrumador para un dueño de un solo negocio. No conviene copiar la densidad tal cual; conviene resumir antes de tabular (ej. 3 cifras grandes arriba, tabla detallada opcional/colapsada abajo).
- **Constructor de reportes drag-and-drop con agregaciones (SUM/AVG/MIN/MAX)** (captura 24): es una herramienta para power users/analistas, no para el dueño del negocio que necesita respuestas simples ("¿cuánto debo de IVA este mes?"). No es prioritario y podría confundir a nuestro usuario si se expone igual de crudo.
- **Multiplicidad de monedas en cada cifra (VES + USD + a veces ARS)** en todas las pantallas: para Norkut tiene sentido porque opera multi-país; para nosotros, mostrar siempre dos monedas en cada número puede saturar a un usuario que solo piensa en bolívares (o en su moneda de referencia). Conviene ofrecerlo como opción secundaria/discreta, no como default en todas las cifras.
- **Pasos de más en la activación del POS** (4 pantallas secuenciales: token → tienda → sincronización → login) para algo que podría resolverse en 1-2 pantallas si el dispositivo ya está vinculado a la cuenta. No replicar fricción de activación en nuestro OCR o en altas simples.
- **Mezcla de breadcrumbs muy profundos** (4 niveles en "Retención de compras") que obliga a navegar por jerga ("Cuentas > Retención de impuestos > Retención de compras > Crear comprobante") — para AD System, mantener rutas de máximo 2-3 niveles con nombres en lenguaje cotidiano.
- **No se observó modo oscuro** en ninguna captura (todo es tema claro) — no es un problema que resolver, pero confirma que no hay nada que "rescatar" de dark theme aquí; seguimos priorizando alto contraste en tema claro para el público mayor.
- **El asistente de IA de campañas es poderoso pero orientado a marketing/promociones**, un caso de uso que no es núcleo para un negocio pequeño formalizándose fiscalmente; replicarlo tal cual en campañas de venta no es prioritario hoy, aunque el patrón conversacional sí sirve (ver sección 7).

---

## 6. Ideas concretas por pantalla nuestra

### Inicio — Impacto: Alto
- Checklist de primeros pasos con progreso (inspirado en captura 1): "Completa tu perfil fiscal", "Registra tu primer movimiento", "Configura tu sello y firma", "Revisa tus vencimientos". Checks verdes automáticos + banner final cuando se completa el 100%, con un pequeño "logro" (mensaje de felicitación, no gamificación compleja).
- Indicador ambiental fijo (tipo chip en el header) con el dato más urgente: "Tu próximo vencimiento es en 5 días" — igual que la tasa de cambio de Norkut siempre visible.

### Mis movimientos — Impacto: Alto
- Al crear una factura, panel/tarjeta de totales en vivo (subtotal, IVA, retención, total) siempre visible, igual al patrón de pago de Norkut (capturas 12-13, 25).
- Ajuste automático de tipo de cambio entre emisión y cobro/pago, con chip explicativo "Ajuste de tasa" (captura 25) — alto impacto porque es un dolor real en Venezuela.
- Chips de color por tipo de documento y por estatus de la factura (pagada/pendiente/vencida) para escanear la lista rápido.
- Modal de edición contextual simple al tocar un ítem (como "Cambio de precio", captura 10): mostrar siempre "esto solo afecta este movimiento" para dar confianza a usuarios que temen "romper algo".

### ¿Cómo voy? — Impacto: Medio-Alto
- Tarjeta resumen arriba con 2-3 cifras grandes (ingresos del mes, impuesto estimado a pagar, próximo vencimiento) + gráfico/tabla simple abajo, replicando el patrón "tarjeta resumen + tabla" observado en reportes y pagos.
- Evitar el patrón de reportes drag-and-drop de Norkut; en cambio, ofrecer 3-5 reportes prearmados con nombre simple y descripción de 1 línea (sin categorías tipo Finanzas/Ventas), similar a las tarjetas de "Reportes personalizados" (captura 22) pero en lenguaje llano ("Cuánto vendí este mes", "Cuánto debo de impuestos").

### Mis papeles — Impacto: Medio (ya rediseñado recientemente)
- Reforzar con ayuda contextual puntual junto a cada obligación poco conocida ("¿Qué es esto?" con ejemplo visual), siguiendo el patrón de "Ayuda"/"Ver instructivo" de Norkut.
- Chips de color consistentes por tipo de obligación (ya hay barra de avance; sumar color por categoría fiscal ayuda a escanear el expediente completo de un vistazo).

### Mi mercancía — Impacto: Medio
- Estado vacío instructivo con CTA claro cuando no hay productos aún ("Agrega tu primer producto para controlar tu inventario" + botón), en vez de tabla en blanco.
- Inputs de cantidad con stepper +/- para ajustes de inventario, más fácil en móvil que escribir.
- Wizard corto de alta de producto con resumen lateral/superior que se va llenando (patrón de campañas, capturas 16-19), si el alta tiene varios campos (nombre, precio, impuesto, stock inicial).

### Mis proveedores — Impacto: Bajo-Medio
- Buscador de proveedor con botón "Buscar" que se habilita solo con texto ingresado (patrón captura 26) para evitar búsquedas vacías.
- Al vincular facturas pendientes a un proveedor, usar el mismo patrón de "Facturas pendientes" + "Totales" en paralelo (captura 25-26) si se automatiza el pago a proveedores a futuro.

### Mi negocio (perfil fiscal, sello y firma) — Impacto: Alto
- Botón "Guardar" deshabilitado hasta completar campos obligatorios, con mensajes de validación inline cortos y en rojo pegados al campo.
- Ayuda contextual con imagen de ejemplo junto a campos difíciles (RIF, número de control, carga de sello/firma) — "¿No sabes dónde encontrarlo?" con muestra visual, como el link de ayuda del token en Norkut.
- Carga de imagen con zona de arrastrar y soltar + validación de formato/tamaño visible (patrón "Imagen de promoción", capturas 16-19) para el sello y la firma.

### Mi plan (suscripción y pagos) — Impacto: Medio
- Tarjeta de cuenta/saldo con cifra grande + estado de pago con chip de color (patrón "Cuentas bancarias", captura 27), mostrando próximo cobro y método de pago asociado de forma clara.

### Registro de gasto o venta por foto (OCR) — Impacto: Alto
- Partir el flujo en pasos cortos con stepper visual (1. Tomar/cargar foto → 2. Revisar datos detectados → 3. Confirmar impuesto/retención → 4. Guardar), igual al patrón de activación de POS pero mucho más corto (2-3 pasos, no 4 pantallas separadas).
- Mostrar un resumen lateral/superior con lo que la IA ya detectó (monto, fecha, proveedor) que se va confirmando campo por campo, dándole al usuor mayor control de corregir antes de guardar — así reduce el miedo a "que la IA se equivoque y no me dé cuenta".

### Chat de soporte con IA — Impacto: Alto
- Adoptar el patrón de **respuesta en dos capas**: primero un párrafo breve explicando qué va a hacer el asistente (en lenguaje simple, sin tecnicismos), luego una tarjeta estructurada con los datos clave y una acción clara ("Confirmar", "Editar") — igual al patrón de "Favoritos de la Semana" en el chat de campañas de Norkut (captura 20).
- Guardar un historial de conversaciones con título y resumen autogenerado (como la lista de chats de Norkut) para que el usuario pueda volver a una consulta fiscal anterior sin tener que re-explicar el contexto.

---

## 7. Ideas para módulos futuros inspiradas en las capturas

1. **Arqueo de caja / conciliación diaria** (captura 14): para negocios que manejan efectivo, un módulo simple de "cuánto debería tener vs. cuánto tengo" al cerrar el día, con diferencia resaltada. Viabilidad: alta a mediano plazo; encaja bien con "Mis movimientos" y ayuda a detectar faltantes sin ser un POS completo.

2. **Cuentas por pagar/cobrar con ajuste cambiario automático** (captura 25): hoy registramos movimientos, pero un módulo que trackee saldos pendientes por proveedor/cliente con recálculo automático de diferencia cambiaria sería un diferenciador fuerte para Venezuela. Viabilidad: media — requiere definir bien la lógica de tasa de cambio "a la fecha de pago" vs. "a la fecha de emisión", pero el valor percibido es alto.

3. **Retenciones como comprobante formal generable** (captura 26): un flujo dedicado "Generar comprobante de retención" (no solo registrar el dato) que el dueño pueda entregar al proveedor/cliente. Viabilidad: alta, ya que tenemos el dato de retenciones en Mis movimientos; falta la plantilla de comprobante imprimible/descargable.

4. **Importación masiva por rubro** (inspirado en "Importa tus productos" del onboarding, captura 1): plantillas de importación preconfiguradas según el tipo de negocio (bodega, ferretería, farmacia) para cargar inventario inicial rápido. Viabilidad: media — requiere definir plantillas por rubro, pero reduce muchísimo la fricción de alta inicial para el "usuario mayor" que no quiere cargar producto por producto.

5. **Calendario visual de vencimientos fiscales** (inspirado en el calendario de campañas, captura 21): en vez de solo lista con barra de avance en Mis papeles, ofrecer una vista de calendario mensual con cada vencimiento como chip de color en su fecha. Viabilidad: alta, complementa (no reemplaza) el rediseño reciente de Mis papeles.

6. **Asistente conversacional para generar documentos** (inspirado en el chat de campañas con IA, captura 20): "Genérame la factura de venta de hoy a Juan por $50" y que el sistema prellene el formulario y pida confirmación. Viabilidad: media-alta a futuro — es coherente con el Chat de soporte con IA ya planeado, pero conviene primero consolidar el soporte conversacional antes de sumar generación de documentos por chat.

7. **Segmentación simple de clientes** (inspirado en segmentación de campañas, captura 17): no para marketing sofisticado, sino para identificar rápido "mis mejores clientes" o "clientes con facturas vencidas" con lenguaje natural simple. Viabilidad: baja-media por ahora — es una extensión natural de Mis proveedores/clientes pero no es núcleo fiscal; dejar para después de consolidar MVP.

8. **Reportes prearmados por categoría con metadatos de autoría** (captura 22): catálogo pequeño y curado (no drag-and-drop) con 5-8 reportes fiscales/contables comunes, mostrando cuáles son del sistema y cuáles personalizó el usuario. Viabilidad: alta, es una extensión natural de "¿Cómo voy?" sin la complejidad del constructor avanzado.

---

**Archivo:** `docs/mvp/estrategia/norkut-capturas-analisis.md`
