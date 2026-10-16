# LealtyApp (Lealty Group) — análisis competitivo

Fecha: 2026-10-16. Contexto: AD System vs Norkut vs Fina Partner (ver `analisis-norkut-y-roadmap-2026-10-13.md`, `diferenciadores-lanzamiento.md`, `../auditorias/competencia.md`, `../auditorias/competencia-fina-profundo.md`).

## Método y límites

- Solo páginas públicas, sin cuentas, formularios ni login. El sitio `lealtyapp.com` es una SPA (React/Vite): el texto no sale en un fetch normal. Se leyó el HTML (metadatos, JSON-LD), `sitemap.xml` y los textos dentro de los módulos JavaScript públicos que la propia página carga (`/assets/ContabilidadLandingPage-*.js`, `SectionPricing-*.js`, `SectionClose-*.js`, `SectionPortal-*.js`, `SectionForWho-*.js`, `SectionHow-*.js`, `apps-*.js`, `LanzamientoPage-*.js`, `CotizacionPage-*.js`). Esos textos son lo que ve cualquier visitante.
- **No se pudo ver** cómo luce la página renderizada, el video de 5 minutos, los anuncios de Meta, ni el producto por dentro. Una búsqueda web no devolvió páginas de terceros sobre Lealty (reseñas, prensa, tiendas de apps). Todo lo que sea producto real, calidad del OCR o clientes reales: **no verificado**.
- Todo lo que dice Lealty de sí misma es marketing, igual que con Norkut.
- Fuentes por abreviatura: **[C]** https://lealtyapp.com/contabilidad · **[H]** https://lealtyapp.com (home) · **[L]** https://lealtyapp.com/lanzamiento · **[Q]** https://lealtyapp.com/cotizacion · **[S]** https://lealtyapp.com/sitemap.xml. El texto de planes/funciones de [C] y [H] viene de los módulos JS mencionados.

## 1. Resumen

LealtyApp es la marca de **Lealty Group**, fundada por **Saúl Casanova**, contador venezolano que dice tener 26 años de experiencia y haber fundado su propia firma contable ([H], JSON-LD y sección de cierre). Es una **herramienta para contadores y firmas** (multiempresa, portal para los clientes del contador), no para el dueño de bodega. Se presenta como "la primera aplicación de contabilidad inteligente en Venezuela" ([H], meta description). El anuncio "transcribir con una foto" es literalmente su propuesta central: *"Fotografías la factura y la app arma el asiento, llena los libros y deja listas las retenciones. Mira el recorrido de 5 minutos."* ([C], meta description).

Tiene dos productos: **Lealty App Contabilidad** (el que se anuncia) y **Lealty App Nómina** (salarios, IVSS, FAOV, INCES, RPE, ISLR; se contrata sobre cualquier plan de Contabilidad) ([H], sección Apps). Planes de **US$29,99 / 79,99 / 139,99 al mes** más **US$60 de implementación** (gratis en plan anual) ([C]).

Lectura: es un competidor **más cercano a AD System que Norkut o Fina** en lo fiscal (libros, asientos, XML ISLR, TXT IVA, portal de cliente, declaraciones) y en el ángulo del contador. Donde no nos alcanza: no hay señal de inventario, punto de venta ni nada para el comerciante final; el precio es de 2 a 5 veces el que planeamos; y vende con llamada/WhatsApp y cotización, no con prueba gratis.

## 2. Qué hace bien

1. **Mensaje clarísimo en una línea**: "foto de la factura → asiento + libros + retenciones". El anuncio y la página dicen lo mismo ([C]). Es el mismo "momento demo" que nosotros llamamos D1.
2. **Cumplimiento fiscal con salida concreta**: "Retenciones: XML ISLR y TXT IVA — Los archivos del SENIAT listos para subir" ([C]). Nosotros generamos comprobantes de retención en PDF; **no tenemos (que sepamos) los archivos XML/TXT del SENIAT**, y eso es lo que el contador sube. Verificar en nuestro código antes de afirmar paridad.
3. **Contabilidad completa, no solo libros fiscales**: asientos automáticos, libro diario, mayor, balances, estados financieros, activos fijos ([C]). Nosotros tenemos libros de compras/ventas pero no se vio contabilidad de partida doble en los documentos leídos.
4. **Portal de cliente**: "Cada cliente entra a su propio portal, con su marca y sus datos"; el cliente sube facturas desde la app y llegan al panel del contador ([H] SectionPortal). Es nuestro D2 ("tu contador adentro") visto desde el otro lado. Plan Pro en adelante ([C]).
5. **Nómina como segundo producto** con las obligaciones venezolanas (TXT FAOV, TXT para bancos, INCES, forma 13-12 del IVSS) ([H] apps). Nosotros no tenemos nómina.
6. **Embudo de ventas cuidado** (todo visible en el código de [C]): calculadora "¿Cuánto te cuesta hoy transcribir tus facturas?" (facturas al mes × minutos × valor de la hora), cupón `CONTABILIDAD10` (10 %) con reloj de 40 minutos, botón de WhatsApp con el anuncio que originó el clic (`utm_content`) y el partner (`partner`) en el mensaje, píxeles de Meta, "precio de fundador congelado de por vida" y demo 1 a 1 ([L]), Master Class gratis ([Q]).
7. **Credibilidad del fundador**: contador con firma propia ("Creé Lealty App porque yo mismo lo necesitaba"), que es la historia correcta para vender a contadores.
8. **Pricing por escalones con ancla**: el plan Pro lleva sello "Popular" y el Max incluye "Auditor Inteligente" ([C]).

## 3. Huecos y debilidades

- **No es para el comerciante no digital.** El copy habla de TXT, XML, conciliación bancaria, asientos, cobranzas ([C]). No hay señal de lenguaje llano ni de un usuario mayor.
- **Sin inventario, sin POS, sin fidelización a clientes.** Pese al nombre ("Lealty"), en las páginas leídas no aparece ningún programa de lealtad. Lo único cercano: "App Lealty Marketing" como bonus del plan Max, sin descripción ([C]). El sitio también contiene páginas de "Tarjeta" (`TarjetaPage`, `TarjetaPublica`); su contenido **no verificado**.
- **Precio alto y con implementación**: US$29,99/mes ya es un precio de entrada comparable a Fina (US$35) pero para una herramienta de contador; Pro US$79,99 y Max US$139,99 ([C]). Más US$60 de arranque en mensual. Para una bodega es mucho; para un contador con 20 clientes es razonable.
- **Sin prueba gratis visible**: se "adquiere" con cupón o se pide cotización y demo; el flujo de compra va a `ia.lealtyapp.com/registro/contable` ([C]). El texto de la oferta habla de "2 meses gratis + implementación" en algunos planes ([H] SectionPricing), lo cual se contradice con "$60 de implementación" y el cupón de 10 %: precios y ofertas poco claras. **No verificado** cuál es la oferta real vigente.
- **Urgencia artificial**: el reloj del cupón arranca al entrar (se guarda la hora de inicio en el navegador) ([C]). Funciona para convertir, pero erosiona confianza.
- **Prueba social débil o anónima**: testimonios con cargo y ciudad pero sin nombre ("Firma Contable · Valencia", "Directora Financiera · Maracaibo") y capturas de comentarios de Instagram de tres cuentas ([C], [H] SectionClose). Sin logos de clientes, cifras de usuarios ni reseñas de terceros.
- **Sin evidencia pública de aplicación móvil nativa**: el JSON-LD declara "Web, iOS, Android" ([H]) y el copy dice "desde el teléfono o el computador" ([C]), pero no se encontraron enlaces a App Store o Google Play en lo leído. **No verificado**.
- **"IA" sin detalle técnico**: "Escáner con IA", "Auditor Inteligente", "Estimado inteligente de ISLR" ([C]); no hay cifras de precisión, ni dice qué modelo, ni qué pasa cuando la foto sale mal. Los "créditos" (500 / 1.000 / 1.500 al mes) y el almacenamiento (30 / 30 / 75 GB) aparecen en los datos de los planes, pero **no se sabe qué consume un crédito**; "Lealty Escáner (ilimitado)" aparece desde Pro ([C]).
- **Sitio pequeño**: el `sitemap.xml` lista solo 3 URLs (home, `/cotizacion`, `/lanzamiento`) ([S]); no hay blog, ayuda, páginas por rubro ni SEO de contenido. Fina publica guías cada 2-3 semanas.
- **Pendiente de lanzamiento**: la página `/lanzamiento` habla de "acceso anticipado privado antes del lanzamiento público" y de "precio de fundador" ([L]); su `lastmod` es mayo 2026 ([S]). Producto relativamente joven; antigüedad real **no verificada**.

## 4. Comparativa

Leyenda: "no verificado" = no se pudo comprobar en fuentes públicas. Lo de AD System sale de `PLAN-MVP.md` y del contexto del encargo. Lo de Norkut y Fina, de los documentos internos citados arriba.

| Aspecto | AD System | Norkut | Fina Partner | LealtyApp |
|---|---|---|---|---|
| Cliente objetivo | Comerciante pequeño/mayor, y su contador | Retail (bodega a cadena) | Comercios y emprendedores | Contadores y firmas con varias empresas [C][H] |
| Precio | Por definir; plan de entrada ≈ US$15-19 (PLAN-MVP D1) | US$20 One / US$35 Smart al mes | US$35/mes + IVA | US$29,99 / 79,99 / 139,99 al mes + US$60 implementación (gratis en anual); anual 299,99 / 799,99 / 1.499,99 [C] |
| Foto de factura / OCR | Sí (Gemini), con proveedor y categoría | Botón "Analizar" factura con IA (en recepción de compras) | Carga masiva de inventario con foto; para facturas, no verificado | Sí, "Escáner con IA para facturas"; ilimitado desde Pro [C] |
| Libros de compras y ventas | Sí | No visto | No ("se lo pasas a tu contador") | Sí, automáticos [C] |
| Retenciones IVA/ISLR | Sí, con comprobante PDF | No visto | No | Sí; archivos XML (ISLR) y TXT (IVA) para el SENIAT [C] |
| Municipal / Alcaldía | Sí (retención municipal) | No visto | No | Declaraciones SENIAT y Alcaldía con alertas de vencimiento [H apps]; retención municipal específica: no verificado |
| Inventario | Sí, con foto del estante y catálogo global | Sí, fuerte (multitienda, conteos) | Sí | No visto |
| Punto de venta | No (complemento) | Sí, homologado SENIAT | Sí | No visto |
| Fidelización / marketing | No | Sí (RFM, campañas) | Sí (campañas, SMS) | No visto; "App Lealty Marketing" como bonus del plan Max, sin detalle [C] |
| Asistente IA | Sí, con créditos | Sí, con créditos | "Nina" (ventas) | "Auditor Inteligente", análisis de cuentas, estimado de ISLR (Max) [C]; chat: no verificado |
| WhatsApp | Planeado (Ola 1) | No verificado | No (SMS) | WhatsApp para ventas con atribución de anuncio [C]; como canal del producto: no verificado. Notificaciones por Telegram en plan Max [C] |
| Móvil | Móvil primero (web) | App POS | Web/móvil | "Web, iOS, Android" en el JSON-LD [H]; tiendas de apps: no verificado |
| Contador multicliente | Sí, una firma (multi-contador en camino) | No | No | Sí, empresas ilimitadas y 5 usuarios desde el plan base; portal de cliente desde Pro [C][H] |
| Soporte | Tickets + chat | Ayuda en el panel | No verificado | "Canal de Soporte" y Lealty Academy (plan base) [C]; Master Class gratis [Q] |
| Documentos / expediente fiscal | Sí, "Mis papeles" con vencimientos | No | No | Portal con documentos constitutivos, permisologías y declaraciones del cliente [H SectionPortal]; alertas de vencimiento de declaraciones [H apps] |
| Onboarding | Registro con foto en 3 toques; prueba gratis planeada | Prueba 30 días sin tarjeta | Sin prueba gratis | Cotización/demo, video de 5 min, WhatsApp con asesor, implementación de pago [C][Q]; prueba gratis: no verificado |
| Contabilidad completa (diario, mayor, balances) | Parcial/no verificado | No | En desarrollo (estados financieros) | Sí [C] |
| Nómina | No | No | No | Sí (producto aparte) [H apps] |

## 5. Qué copiar, qué evitar, cómo ganarles

### Qué copiar (ranking)

| # | Recomendación | Esfuerzo |
|---|---|---|
| 1 | **Archivos para el SENIAT**: exportar TXT de retenciones de IVA y XML de retenciones de ISLR (verificar formatos oficiales vigentes con la contadora). Es lo que más pesa para el contador y hoy solo ellos lo anuncian. | M |
| 2 | **Calculadora "¿Cuánto te cuesta transcribir facturas?"** en la landing, adaptada al comerciante: facturas al mes × minutos × horas, resultado en dólares al año. Muy buena herramienta de conversión. Sin reloj ni cupón falso. | S |
| 3 | **Atribución del anuncio en el WhatsApp de ventas**: el mensaje precargado lleva de qué anuncio/video viene el clic. Gratis y útil para medir las campañas. | S |
| 4 | **Portal del cliente con la marca del despacho** como mensaje explícito de D2 ("tus clientes dejan de llamarte"). Ya lo tenemos en espíritu; falta decirlo y mostrarlo. | S (copy) / M (marca propia) |
| 5 | **Testimonio de fundador-contador**: la historia de Angélica y su despacho como piloto real, con nombre y foto. | S |
| 6 | **Alertas de vencimiento de declaraciones** (ya planeado como calendario fiscal personal). Lealty ya lo anuncia ([H] apps). | M |

### Qué evitar

- **Reloj de cupón que reinicia por navegador**: no encaja con una base de usuarios mayores y desconfiados; nos pondría al mismo nivel de "oferta engañosa".
- **Planes con precio de entrada que cobra implementación**: para el comerciante pequeño es una barrera. Nuestra ventaja es precio claro y prueba gratis.
- **Jerga** (TXT, XML, asientos, conciliación) en la portada. Se explica dentro del producto, no en el anuncio.
- **Testimonios anónimos y capturas de comentarios**: usar casos con nombre y foto.
- **Prometer "primera app" o "IA" sin prueba.** Si decimos que leemos facturas, mostrar el resultado real (video corto sin cortes).
- **Pelear en el terreno del contador independiente con nómina y contabilidad completa** antes de lanzar: es donde Lealty es más fuerte y nosotros más débiles.

### Cómo ganarles

Lealty le vende al **contador**; nosotros vendemos al **dueño** y damos el contador como parte del trato. Su "transcribir con una foto" habla del trabajo del contador ("tus clientes te mandan las facturas por todos lados"); el nuestro debe hablar del **miedo del comerciante** (la multa) y del **alivio** (me avisan, lo hace por mí, mi contador lo ve).

**Nuestro equivalente del anuncio "transcribir con una foto"** y cómo decirlo mejor:

| Su ángulo | Nuestro ángulo |
|---|---|
| "Fotografías la factura y la app arma el asiento, llena los libros y deja listas las retenciones." | **"Toma una foto de tu factura. Nosotros nos encargamos del SENIAT."** Variantes: "Tu factura, una foto. Tu retención, lista." / "Foto de la factura → retención hecha → tu contador ya la ve." |
| Recorrido de 5 minutos (video largo) | **Video de 15 segundos sin cortes**: foto → "Listo. También preparamos tu comprobante de retención" → PDF → pantalla del contador con el registro. Mostrar a una persona mayor haciéndolo. |
| Vocabulario de contador | Palabras del comerciante: "factura", "multa", "me avisan", "mi contador lo ve". |
| Precio tras cotización/WhatsApp | **Precio visible y prueba gratis**; "empieza hoy, sin llamar a nadie". |
| Promesa de ahorro de horas | Promesa de **tranquilidad**: "no te pasas de fecha", con el calendario fiscal personal. |

### Prioridades para ganarles (ranking global)

| # | Acción | Por qué | Esfuerzo |
|---|---|---|---|
| 1 | Anuncio/landing "Foto → retención lista → tu contador la ve" con video de 15 s y precio visible | Nuestro equivalente directo, con un ángulo que ellos no usan | S |
| 2 | Exportar TXT IVA y XML ISLR del SENIAT | Cerrar la única brecha fiscal clara frente a Lealty | M |
| 3 | Calendario fiscal personal + avisos activos | Nadie lo tiene (D1); ellos solo dicen "alertas de vencimiento" | M |
| 4 | Plan de entrada barato y claro (≈US$15-19) y prueba gratis, con "gratis para despachos" | Su entrada es US$29,99 + US$60; el comerciante pequeño no es su cliente | S (decisión) |
| 5 | Comparativa pública "AD System vs LealtyApp" y "AD System + tu contador": respetuosa y con hechos | Posicionarnos cuando alguien busque "Lealty" | S |
| 6 | Calculadora "cuánto te cuesta transcribir" en la landing | Copia mejorada de su mejor herramienta de conversión | S |
| 7 | Contabilidad de partida doble (diario/mayor/balances) | Cerrar una brecha para el contador; solo si el piloto con Angélica la pide | L |
| 8 | Atribución por anuncio en el WhatsApp de ventas | Medir qué anuncio vende | S |

### Riesgos a vigilar

- Lealty puede **bajar el escalón de entrada** o añadir inventario/POS; vigilar su sitio (`sitemap.xml`) y sus anuncios.
- Su **canal de contadores** (portal, partners con `partner` en el enlace de WhatsApp) compite por el mismo despacho que queremos como socio. Cerrar rápido el piloto con la firma de Angélica.
- Pendiente de confirmar con una prueba real y permitida: precisión de su OCR, si exporta los archivos del SENIAT con formato válido, y si hay apps en tiendas.
