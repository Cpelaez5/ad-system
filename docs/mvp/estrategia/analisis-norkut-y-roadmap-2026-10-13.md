# Norkut a fondo + análisis de las 16 ideas nuevas → roadmap

Fecha: 2026-10-13. Fuentes: sitio público de Norkut (norkut.com: inicio, precios, capacidades, comparaciones, Network, partners, lanzamientos, rubros, empresa), el panel `core.norkut-cloud.com` recorrido en **solo lectura** (cuenta de prueba vacía; no se guardó nada), búsqueda web, y el estado actual de AD System (código + base de datos). Fina Partner: ver `docs/mvp/auditorias/competencia.md` y `competencia-fina-profundo.md`.

> Ojo: lo que dice Norkut de sí mismo es marketing y no se pudo verificar con datos reales (la cuenta está vacía). Lo marcado "visto en el panel" sí se vio funcionando.

---

## 1. Quién es Norkut

| | |
|---|---|
| Empresa | Norkut, **venezolana** (Porlamar, Nueva Esparta), fundada en 2014, 51-200 empleados. Viene de "Sigo", con +50 años en retail venezolano. Afiliada a Consecomercio. |
| Productos | **Melé ERP** (nube, retail; dicen +12.000 usuarios en cadenas de supermercados, electrodomésticos, farmacias y cosmética) y **Norkut**, la capa nueva de IA sobre Melé. El panel se presenta como "Mele, tu espacio de trabajo". |
| Posicionamiento | "IA operativa para retail. **No reporta. Opera.**" Detecta quiebres de stock, sobreinventario y fugas, y propone o ejecuta acciones: órdenes de compra, precios, promociones. Lema interno: "El sistema sugiere. El dueño confirma." |
| A quién apunta | **Solo retail**: bodegas y quioscos (plan One), tiendas y farmacias (Smart), cadenas, franquicias, mayoristas y fabricantes (Enterprise). Venezuela y Argentina. |
| Precios | **One $20/mes**: 1 tienda, 1 POS, 3 usuarios, 2.500 SKU, 50 "señales". **Smart $35/mes**: usuarios ilimitados, 10.000 SKU, 100 señales; +$30 por tienda y +$10 por POS, hasta 10 tiendas. **Enterprise**: a consultar. Prueba de 30 días sin tarjeta (en el panel, la prueba renueva a los ~15 días) y devolución en 14 días. **IA por créditos** (25 en la prueba, se compran más). |
| Cumplimiento | Dice estar **homologado con el SENIAT** (POS con impresión fiscal), calcular el **IGTF** y facturar **sin conexión**. |
| Distribución | Programa de partners con **comisión recurrente del 20 % (micro), 25 % (implementadores) y 28 % (enterprise)**. |
| Ecosistema | **Norkut Network**: el comercio autoriza a sus proveedores a ver la venta de *sus* productos; órdenes de compra automáticas (Q4 2026); sincronización con Mercado Libre (Q3 2026). |
| Ritmo | 3-4 lanzamientos al mes (may-jul 2026), sobre todo estabilidad, POS e impresión fiscal: producto todavía madurando. |

### 1.1 Lo visto en el panel (módulo por módulo)

- **Inicio**: saludo, código para entrar a la **app POS**, "Tareas pendientes" sugeridas por la IA (reponer licores, iniciar conteo, dar de alta colaborador; con botones *Reponer / Descartar*, marcadas "Próximamente"), últimos movimientos, guía de uso y **cronograma semanal** (calendario).
- **Dashboard general**: filtros por tienda, moneda y período. KPIs: productos vendidos, clientes activos, campañas activas, precisión del inventario, transferencias abiertas. Bloques de ventas (por tienda y por método de pago), CRM (conversión de campañas, distribución de clientes), operaciones (eficiencia de proveedores, conteos, quiebres y sobreinventario) y finanzas (por cobrar vs. por pagar, saldo por banco).
- **Productos**: tipos *físico / servicio / variantes / empaques*; código de barras, marca, categoría, proveedores, **pesable + código de balanza**, SKU, referencia interna, IVA (8 %, 0 %, 16 %, 31 % lujo), impuestos adicionales, **precio, costo y stock por tienda**, **variantes (color, talla, material)**, empaques, registro sanitario, CPE, imágenes, y "atributos personalizados" donde cae lo que **la IA encontró al crear el producto** (creación de productos con IA).
- **Importar productos**: **plantilla por rubro** (Otros, Supermercado, Hogar, Ferretería, Equipos electrónicos, Moda, Farmacia, Librería, Tienda de mascotas…), elección de tienda, XLS/XLSX/CSV, videos y guía de campos.
- **Inventario** por tienda con semáforo (óptimo, excedente, bajo, crítico). **Conteos** con flujo de estados (borrador → planificado → en progreso → revisado → cerrado, más retrasado y cancelado) y supervisor. **Transferencias** entre tiendas (borrador → enviada → recibida).
- **Compras**: órdenes de compra, proveedores (con importación) y **recepción de mercancía** con datos de la factura (número de control, vencimiento) y un botón **"Analizar"** (lectura de la factura con IA).
- **Marketing**: clientes con **segmentos RFM automáticos** (Campeón, Leal, Valioso, Potencial, Reciente, Atención, Dormido, Perdido), importación con historial. **Campañas** en 5 pasos: campaña → clientes → promoción → configuración → difusión, con fechas, tiendas, uso máximo, acumulable e imagen.
- **Reportes** personalizados (p. ej. "Comportamiento de producto por tienda").
- **Finanzas**: estado de resultados con comparación de períodos; cuentas por pagar (por proveedor y gastos generales).
- **Configuración**: perfil, empresa (contribuyente ordinario o especial), **sistema** (moneda base VES, moneda de intercambio USD, **una tasa de cambio** y **en qué moneda queda fijo el margen**: "si sube la tasa, los precios en VES se recalculan solos"), equipo con roles, sucursales, **franquicia** (relación con el franquiciante), notificaciones y suscripción con **medidores de consumo** (usuarios, POS, tiendas, productos, créditos de IA).
- **Cabecera**: medidor de créditos de IA, tasa del día visible (VES), campana de notificaciones, botón **Ayuda** y menú de usuario.

### 1.2 Lo que Norkut NO muestra (ni en el sitio ni en el panel)

- **Retenciones** de IVA, ISLR o municipales, comprobantes de retención, **libros de compras y ventas**, declaraciones, calendario fiscal SENIAT ni expediente fiscal (RIF, licencias, solvencias y sus vencimientos).
- **Rol del contador** o firma contable: no existe la relación "contador ↔ cartera de clientes".
- Negocios de **servicios** o profesionales sin inventario: todo gira alrededor de la tienda.
- **Lenguaje llano**: su copy usa "señales", "inferencia", "vectorización optimizada de 4 bits" y "capa operativa"; es jerga para alguien no digital.
- Testimonios y casos reales en el sitio.

### 1.3 Lectura estratégica

Norkut es **fuerte donde AD System no está**: POS fiscal homologado, inventario multitienda, conteos, transferencias, variantes, campañas y una red B2B, con 40 años de experiencia en retail y un equipo de 51-200 personas. Competirle de frente en POS e inventario es pelear en su cancha con un equipo de una persona.

Norkut es **débil donde AD System ya es fuerte**: cumplimiento fiscal venezolano completo (retenciones, libros, fecha fiscal, comprobantes, expediente con vencimientos), el contador dentro del sistema y la simplicidad para gente mayor. Fina tampoco cubre eso: su propio copy dice "Lo ves. **Se lo pasas a tu contador**".

**Posicionamiento propuesto:**
> *Norkut opera tu tienda. Fina ordena tu negocio. **AD System te mantiene en regla con el SENIAT, y tu contador lo ve todo en tiempo real.***

Corolario: **convivir con los POS en lugar de reemplazarlos.** Importar las ventas de cualquier caja (Norkut, Fina, reporte Z de la máquina fiscal o Excel) y convertirlas en libros, retenciones y "¿cómo voy?". Eso nos vuelve complemento de Norkut, no su rival.

---

## 2. Las 16 ideas, una por una

Escala de esfuerzo para un desarrollador más agentes: **S** (días), **M** (1-2 semanas), **L** (3-6 semanas), **XL** (meses).
Fases: **Pre-lanzamiento** = entra antes de vender; **Ola 1/2/3** = después del lanzamiento, en ese orden.

### 1) Tasa BCV opcional — **Pre-lanzamiento · S-M · prioridad ALTA**
- **Hoy:** `bcvService.js` toma la tasa de un **proxy de terceros en Render** (`bcv-api-proxy-…onrender.com`; los servidores gratuitos de Render se duermen y pueden desaparecer), con respaldo en dolarapi.com, una Edge Function y la tabla `exchange_rates`. El cliente no puede elegir.
- **Propuesta:**
  1. **Fuente propia**: Edge Function con pg_cron (ya tenemos ambos) que lea la tasa del BCV cada día hábil y la guarde en `exchange_rates`. Los terceros quedan solo como respaldo. Fuera la dependencia de Render.
  2. **Preferencia por cliente** en Configuración: *"Usar la tasa oficial del BCV (recomendado)"*, *"Escribir mi propia tasa cada día"* o *"Tasa fija mía hasta que la cambie"*.
  3. **Cambio por factura**: el formulario ya admite la tasa de cada factura; mostrar la fuente con un chip ("BCV 13/10" o "Tu tasa").
  4. Guardar `fuente_tasa` en cada registro, para auditoría.
  5. Adoptar lo bueno de Norkut: **en qué moneda queda fijo tu margen** (VES o USD) al actualizar precios.
- **Cuidado fiscal:** para los libros y las retenciones en Bs, la referencia legal suele ser la tasa del BCV del día de la operación. Si el cliente usa otra tasa, mostrar un aviso amable y que la contadora confirme la regla antes de construir.

### 2) Notificaciones, días de suscripción y botón de ayuda — **Pre-lanzamiento · M · ALTA**
- **Hoy:** existen los avisos por correo de vencimientos (pausados hasta el lanzamiento) y el `TrialBanner`. No hay centro de notificaciones ni ayuda.
- **Propuesta:**
  - **Campana** en la cabecera, con la tabla `notificaciones` (tipo, título, texto, enlace, leída) y tiempo real de Supabase. Fuentes:
    - "tu plan vence en N días";
    - pago aprobado o rechazado;
    - papeles por vencer;
    - mensaje de tu contador;
    - retención generada;
    - tasa actualizada.
  - **Preferencias por canal** (app, correo y, más adelante, WhatsApp).
  - **Suscripción con medidores** de consumo (usuarios, registros con IA, empresas), como Norkut. Aviso a los 7, 3 y 1 días, más un banner suave.
  - **Botón Ayuda (?)** en la cabecera que abre una hoja **contextual a la pantalla**: 3-5 preguntas frecuentes de esa vista, un video corto y "Pregúntale al asistente". El contenido vive en un archivo de ayuda por ruta. Reutiliza `AyudaTermino` y el glosario.

### 3) Segmentos: startups, emprendedores, pequeñas y grandes empresas — **Pre-lanzamiento (planes y landing) · S**
- Tiene sentido como **lenguaje de planes y de landing**, no como cuatro productos distintos.
- **Recomendación para lanzar:** Emprendedor, Negocio (pequeña empresa) y **Contador / Firma** (varias empresas; es nuestro canal único). "Grandes empresas" queda como "Empresas: conversemos", porque exige multisucursal, permisos finos, API y SLA (olas 2-3).
- Precio de referencia de la competencia: Norkut $20-35/mes, Fina ≈ $23-31/mes. La decisión de precios sigue en la Fase 4.

### 4) Carga de productos por Excel/CSV y por API del cliente — **CSV: Ola 1 · M — API: Ola 2 · L**
- **Hoy:** el inventario es de una tabla (`inventory_products`) y ya existe la librería `xlsx` en el proyecto (exportaciones). Hay OCR de inventario (`inventoryOCRService`).
- **Importación con asistente:** subir el archivo → mapear columnas (sugerido automáticamente; la IA reconoce encabezados raros) → vista previa con errores en lenguaje llano → confirmar → **historial de importaciones con opción de deshacer**. Mismo motor para productos, proveedores y clientes.
- **API pública:** llaves por cliente desde Configuración (crear y revocar), límites de uso, endpoints de productos, precios y stock, y documentación. Es delicada en seguridad (llaves cifradas, alcance por cliente vía RLS), así que va después del lanzamiento. Alternativa intermedia, más barata: **webhook entrante + importación programada desde un Google Sheet**.

### 5) Locales comerciales y almacenes — **Ola 2 · L**
- **Cambio de modelo:** hoy el stock es una columna del producto. Hace falta `ubicaciones` (tipo: local o almacén) y `stock_por_ubicacion`. Los movimientos llevan origen y destino.
- **Recomendación:** **diseñar el modelo ya** (migración aditiva con una ubicación "Principal" por defecto) aunque la interfaz llegue después. Así no hay que migrar datos dos veces. Habilita los puntos 9 (transferencias y conteos) y 13.

### 6) Proveedores, clientes y recordatorios de cobro automáticos — **Pre-lanzamiento / Ola 1 · M · ALTA**
- **Hoy:** proveedores completos (con datos fiscales). **No existe la entidad "cliente del negocio"**: la tabla `clients` es la empresa cliente del contador. Las ventas guardan el nombre del comprador en la factura, sin ficha. Hay cuentas por cobrar vía estado de factura y cuotas Cashea.
- **Propuesta:**
  - Entidad nueva **`contactos`**, con un nombre distinto para no chocar con `clients`: tipo cliente, proveedor o ambos, con RIF/cédula, teléfono y correo.
  - **"Me deben"**: lista de cuentas por cobrar por antigüedad.
  - **Recordatorios automáticos** de cobro por correo (Resend y pg_cron ya existen), en tono amable y configurable (3 días antes, el día del vencimiento, 7 días después), con un enlace de "ya pagué" y su comprobante.
  - Después, el mismo recordatorio **por WhatsApp**.
- Gran valor para el flujo de caja de una pyme; Fina lo tiene y Norkut lo tiene a medias (cuentas por pagar).

### 7) Marketing, campañas, Meta y Klaviyo — **Ola 3 · XL · prioridad BAJA para el MVP**
- Es otro producto (CRM y marketing). Norkut y Fina ya lo tienen, y no es nuestro diferenciador.
- **Camino barato:**
  1. Segmentos automáticos tipo RFM sobre `contactos` y ventas: "clientes que no compran hace 60 días".
  2. Exportarlos a CSV o enviarlos a **Klaviyo/Meta Custom Audiences** con su API.
  3. Campañas propias solo por WhatsApp y correo, con plantillas.
- No construir un editor de campañas propio antes de tener tracción.

### 8) Automatizaciones por WhatsApp y Telegram — **WhatsApp: Ola 1 · L — Telegram: opcional · M**
- Ya planificado en la Fase 3: **registrar facturas enviando una foto por WhatsApp**, avisos de vencimiento y recordatorios de cobro.
  - Requiere la cuenta de Meta Business del usuario y la API de WhatsApp Cloud (cobra por conversación; las plantillas de "utilidad" son baratas).
- **Telegram** es gratis y rápido de integrar: sirve de **piloto** del mismo flujo (foto → registro) mientras se aprueba Meta. En Venezuela manda WhatsApp, así que Telegram no debe ser el canal principal.
- Base técnica común: una Edge Function "mensajería" con adaptadores por canal, más una cola.

### 9) Inventario avanzado: conteos, transferencias, variantes, productos desde imagen o video — **Ola 1-2 · L-XL**
- **Conteos** (sesión → conteo en el teléfono, con lector de código de barras de la cámara → diferencias → ajuste aprobado) y **transferencias** dependen del punto 5.
- **Variantes** (talla, color, material): modelo `producto` → `variantes` con atributos. Imprescindible para el rubro moda.
- **Productos desde imagen: Ola 1, quick win.** Ya existen el OCR de inventario y la visión de Gemini. Flujo: "tómale foto al producto o a la factura del proveedor" → se crea con nombre, marca, categoría, presentación y precio sugerido. Norkut lo tiene ("si usaste la IA para crearlo…").
- **Productos desde video** (Gemini acepta video): "graba tu anaquel y te armamos el inventario". Es un **diferenciador de demo muy vendible** para redes. Alcance a validar (precisión en el conteo); empezar como "lista sugerida para revisar".

### 10) Plantilla de importación por rubro — **Ola 1 · S-M (encima del punto 4)**
- Norkut ya la tiene: Supermercado, Hogar, Ferretería, Electrónicos, Moda, Farmacia, Librería, Mascotas y Otros.
- Nosotros: columnas según `clients.activity_type`.
  - Moda: talla, color, material.
  - Farmacia: principio activo, lote, vencimiento, registro sanitario.
  - Alimentos: pesable, unidad, vencimiento.
  - Ferretería: medida, marca.
  - Servicios: sin stock.
- El mapeo inteligente del punto 4 acepta cualquier Excel aunque no use la plantilla. Eso es mejor que Norkut, que exige su plantilla.

### 11) IA con contexto de todo el negocio, recomendaciones y tendencias — **Pre-lanzamiento (v1) / Ola 1-2 · M → L · ALTA (diferenciador)**
- **Hoy:** `ai-chat` es un chat de soporte con visión, sin acceso a los datos del cliente.
- **Arquitectura recomendada:** no "meter toda la base de datos en la IA". Darle **herramientas** (function calling), cada una una consulta SQL segura con RLS: ventas del período, gastos por categoría, IVA estimado del mes, retenciones pendientes, papeles por vencer, top de productos y clientes, cuentas por cobrar. La IA decide qué consultar y **cita los números que devolvió la consulta**. Así no inventa cifras.
- **Diferenciador frente a Nina (Fina) y Norkut:** conocimiento **fiscal venezolano** ("¿debo retenerle a este proveedor?", "¿cuánto IVA voy a pagar este mes?", "¿qué se me vence?").
- **Tendencias:** búsqueda web con *grounding* (Gemini con Google Search) para "¿qué se está vendiendo en mi rubro?" e ideas de promoción. Mostrar las fuentes y advertir que es orientativo.
- **Control de costo:** créditos de IA por plan (`ai_usage_logs` ya existe), como hace Norkut.

### 12) Vectorización de la base de datos — **Ola 2 · M · solo donde aporta**
- **Para números (ventas, montos, IVA), los vectores NO sirven.** Las consultas SQL exactas son más precisas y baratas, y eso es lo que usa el punto 11. Lo de "vectorización de 4 bits" de Norkut es marketing técnico.
- **Donde sí aporta** (pgvector en Supabase; la extensión hoy no está activa):
  1. **Centro de ayuda y normativa** (RAG sobre artículos de ayuda, providencias del SENIAT y el glosario).
  2. **Emparejar** un ítem de factura con un producto existente y **sugerir la categoría** por similitud.
  3. Detectar **productos o proveedores duplicados**.
  4. Búsqueda semántica ("la factura de la luz de agosto").

### 13) POS — **Decisión estratégica: NO construir un POS fiscal ahora**
- Un POS que imprima facturas fiscales en Venezuela exige software o equipos **homologados o autorizados por el SENIAT** (Norkut dice estarlo). Es un proceso regulatorio largo y caro, con soporte de hardware (impresoras fiscales, balanzas) y modo sin conexión. Ahí Norkut lleva décadas.
- **Recomendación:**
  - (a) **Importar ventas** de cualquier POS o máquina fiscal (reporte Z, Excel o API) → libros y "¿cómo voy?". **Ola 1.**
  - (b) **"Venta rápida"** no fiscal (nota de entrega o pedido) para emprendedores sin máquina fiscal, con cobro en Bs/USD, pago móvil y Cashea. **Ola 2.**
  - (c) Evaluar una **alianza** con un POS homologado (incluso Norkut) en lugar de competir. **Ola 3.**
- Confirmar con la contadora qué exige hoy la normativa (imprenta digital, máquina fiscal) antes de prometer nada.

### 14) Insights con IA — **Pre-lanzamiento (reglas) / Ola 1 (IA) · M · ALTA**
- **v1 sin IA** (barato y exacto): tarjetas en "¿Cómo voy?" y un **resumen semanal por correo** con reglas sobre los datos:
  - "Vendiste 12 % menos que el mes pasado";
  - "Tu gasto en X subió";
  - "Este mes declaras IVA el día N: llevas aprox. Bs Y";
  - "Te deben $Z de hace más de 30 días";
  - "Tu RIF vence en 7 días".
- **v2 con IA:** redacción en lenguaje llano, causas probables y una acción sugerida, siempre con botón (*Registrar*, *Cobrar*, *Subir papel*). Es "el sistema sugiere, el dueño confirma", como Norkut, pero con **insights fiscales** que nadie más da.

### 15) Actualización masiva de precios con registro — **Ola 1 · M**
- Seleccionar productos (filtro por categoría, proveedor o todos) → regla (**+X %**, monto fijo, **recalcular en Bs con la tasa nueva manteniendo el margen en USD**) → **vista previa** antes/después → aplicar.
- Tabla `cambios_precio` (quién, cuándo, regla, precio anterior y nuevo) con **deshacer**.
- Va de la mano con el punto 1. Se puede disparar al cambiar la tasa: "La tasa subió 3 %. ¿Actualizo tus precios en Bs?".

### 16) Diferenciadores frente a Norkut y Fina

| Diferenciador | Norkut | Fina | AD System |
|---|---|---|---|
| Retenciones IVA/ISLR/municipal + comprobantes | No | No | **Sí** |
| Libros de compras y ventas, fecha fiscal | No visto | No ("pásaselo al contador") | **Sí** |
| Expediente fiscal (RIF, licencias…) con avisos de vencimiento | No | No | **Sí** |
| Contador y firma con cartera de clientes dentro del sistema | No | No | **Sí (modelo base)** |
| Registro por foto en ≤3 toques, para gente mayor | Recepción con IA | Parcial | **Sí** (y por WhatsApp en la Ola 1) |
| IA que responde preguntas **fiscales** con tus datos | No | Nina (ventas) | **A construir (punto 11)** |
| POS fiscal homologado | **Sí** | Sí (sin impresión fiscal confirmada) | No (importar ventas) |
| Inventario multitienda, conteos, transferencias, variantes | **Sí** | Parcial | Básico |
| Campañas y CRM | Sí (RFM) | Sí | No (Ola 3) |

**Los 5 diferenciadores a explotar:**
1. **"En regla con el SENIAT sin saber de impuestos."** Retenciones, libros y vencimientos automáticos; nadie más lo tiene.
2. **El contador adentro.** La firma ve todo en tiempo real y deja de perseguir facturas por WhatsApp. Además es un **canal de distribución**: cada firma trae 20-50 empresas. Copiar el programa de partners de Norkut (20-28 % recurrente), pero para **contadores**.
3. **Simplicidad radical** para gente no digital: frente a la jerga de Norkut ("señales", "inferencia") y a la cantidad de módulos de Fina.
4. **Asistente fiscal en lenguaje llano** (punto 11) más **insights fiscales** (punto 14).
5. **Complemento, no reemplazo:** "¿Ya usas Norkut, Fina o una máquina fiscal? Importa tus ventas y nosotros hacemos lo fiscal."

---

## 3. Roadmap propuesto

**Pre-lanzamiento (además de lo que ya está en curso en la Fase 2):**
1. Tasa: fuente propia BCV + preferencia del cliente + `fuente_tasa` (punto 1).
2. Campana de notificaciones + días de suscripción con medidores + botón de Ayuda contextual (punto 2).
3. `contactos` (clientes del negocio) + "Me deben" + recordatorios de cobro por correo (punto 6).
4. Insights v1 por reglas en "¿Cómo voy?" + resumen semanal (punto 14).
5. Asistente v1 con herramientas sobre sus datos (punto 11), limitado por créditos.
6. Planes y landing segmentados: Emprendedor, Negocio y Contador/Firma (punto 3).
7. **Modelo de datos de ubicaciones** listo (migración aditiva), sin interfaz todavía (punto 5).

**Ola 1 (1-2 meses después del lanzamiento):**
- Importación Excel/CSV con mapeo inteligente e historial, más plantillas por rubro (puntos 4 y 10).
- Productos desde foto (punto 9).
- Actualización masiva de precios con registro (punto 15).
- WhatsApp (registro por foto, avisos, recordatorios); Telegram como piloto si Meta tarda (punto 8).
- Importar ventas de POS o reporte Z (punto 13a).
- Insights v2 con IA (punto 14).

**Ola 2:**
- Locales y almacenes con interfaz, transferencias, conteos y variantes (puntos 5 y 9).
- API pública con llaves (punto 4).
- pgvector para ayuda, emparejamiento y duplicados (punto 12).
- Tendencias web en el asistente (punto 11).
- Venta rápida no fiscal (punto 13b).
- Productos desde video (punto 9).

**Ola 3 (con tracción):**
- Marketing y campañas, Klaviyo y Meta (punto 7).
- Alianza POS fiscal (punto 13c).
- Planes Enterprise (punto 3).
- Red con proveedores, si aplica.

## 4. Decisiones que necesito de ti o de la contadora
1. **Tasa propia:** ¿se permite usar otra tasa distinta a la BCV en los libros fiscales, o solo para precios y reportes? (contadora)
2. **POS:** ¿confirmas "no construir POS fiscal; importar ventas y venta rápida no fiscal"?
3. **Público de lanzamiento:** ¿Emprendedor, Negocio y Contador/Firma, dejando grandes empresas para después?
4. **Programa de partners para contadores** (comisión recurrente): ¿te interesa como canal principal de venta?
