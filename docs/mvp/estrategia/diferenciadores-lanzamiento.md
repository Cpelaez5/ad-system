# Diferenciadores de lanzamiento — qué nos hace únicos y cómo explotarlo

Fecha: 2026-10-13. Base: `analisis-norkut-y-roadmap-2026-10-13.md`, `../auditorias/competencia.md`, `../auditorias/competencia-fina-profundo.md`.
Decisión del usuario (2026-10-13): definir bien los diferenciadores **antes** de salir al mercado y explotarlos; la tasa definida por el cliente queda para el final.

## La frase
> **AD System te mantiene al día con el SENIAT sin que sepas de impuestos, y tu contador lo ve todo en tiempo real.**

En contraste (uso interno y para páginas comparativas): *Norkut opera tu tienda. Fina ordena tu negocio. AD System te mantiene en regla, con tu contador adentro.*

## Los 3 diferenciadores principales (lo que vendemos)

### D1. "Al día con el SENIAT sin saber de impuestos"
- **Qué es:** retenciones de IVA, ISLR y municipal calculadas solas, con su comprobante en PDF; libros de compras y ventas; fecha fiscal correcta; expediente con avisos antes de que venza el RIF, la licencia o una solvencia.
- **Por qué nadie más:** Norkut no muestra nada fiscal más allá del POS. Fina dice literalmente "Lo ves. Se lo pasas a tu contador". Los tradicionales (Gálac, Profit, Saint) son para contadores, no para el dueño.
- **Momento demo (15 s):** foto de la factura → "Listo. También preparamos tu comprobante de retención" → PDF.
- **Para que sea verdad al lanzar:**
  - [x] Retenciones y comprobantes, libros, fecha fiscal, expediente con semáforo.
  - [ ] Libros exportados validados y firmados por la contadora con casos reales (F5).
  - [ ] Avisos por correo **activos** (hoy pausados) + campana en la app.
  - [ ] **Calendario fiscal personal** (nuevo): fechas de declaración y pago de IVA/ISLR según el tipo de contribuyente y el último dígito del RIF, con aviso. El SENIAT publica el calendario cada año. Costo bajo, valor percibido altísimo, y nadie lo tiene.
  - [ ] Resumen del mes "lo que vas a declarar" (insight v1: IVA débito − crédito estimado, retenciones del período).

### D2. "Tu contador adentro"
- **Qué es:** el despacho contable tiene su panel con toda su cartera y ve cada registro, papel y vencimiento de sus clientes en tiempo real. Pide documentos y revisa; el cliente manda todo desde el teléfono. Se acaba el "mándame las facturas por WhatsApp".
- **Por qué nadie más:** ni Norkut ni Fina tienen un rol de contador ni una cartera de clientes.
- **Doble efecto:** es un **canal de distribución**. Cada despacho trae de 20 a 50 empresas. Programa de socios contadores con comisión recurrente (ver `flujo-multiinquilino-contadores.md`).
- **Momento demo:** el contador abre "Mi cartera" → semáforo de 30 clientes → toca uno en rojo → "le falta subir la licencia; vence en 5 días" → botón *Pedir documento*.
- **Para que sea verdad al lanzar:** registro de despacho, agregar o invitar clientes, "Conectar con mi contador", panel **Mi cartera** con semáforo, **pedir documento** y estado "revisado por tu contador" en cada registro.

### D3. "Tan fácil que lo usa cualquiera"
- **Qué es:** registro con foto en 3 toques; lenguaje llano sin jerga; diseñado primero para el teléfono; ayuda en cada pantalla; animaciones calmadas.
- **Por qué nadie más:** Norkut habla de "señales", "inferencia" y "vectorización". Los sistemas contables tradicionales son de escritorio y para expertos.
- **Prueba:** sesiones con 5 usuarios mayores o no digitales (meta: registrar un gasto con foto sin ayuda en menos de 60 s). Grabarlas, con permiso, como contenido.
- **Para que sea verdad al lanzar:** ola actual (consistencia de vistas, diálogos móviles, OCR con proveedor y categoría), ayuda contextual, pruebas con usuarios reales.

## Los 2 de apoyo (refuerzan, no encabezan)
- **D4. Asistente fiscal con tus datos:** "¿Cuánto IVA voy a pagar este mes?", "¿Le debo retener a este proveedor?", "¿Qué se me vence?". Responde con números de consultas reales, no inventados. v1 al lanzar, limitado por créditos. Contra Nina (Fina), que solo habla de ventas.
- **D5. Bimonetario honesto:** Bs y USD con la tasa BCV de **la fecha de cada operación**, nunca mezclar Bs con USD, y los totales explican qué tasa usaron. La tasa definida por el cliente llega al final.

## Lo que NO es diferenciador (paridad o fuera de foco)
POS fiscal, inventario multitienda, campañas y CRM de marketing. Se cubren con **"Complemento, no reemplazo"**: *"¿Ya usas Norkut, Fina o una máquina fiscal? Importa tus ventas y nosotros hacemos lo fiscal."* (importación de ventas, Ola 1).

## Cómo explotarlos
| Palanca | Acción concreta |
|---|---|
| Landing (Fase 4) | Hero = la frase. Tres bloques, uno por diferenciador, cada uno con su demo en video corto (Hyperframes + capturas tipo Mac). Sección "Para contadores" con su propia página y CTA "Crea tu despacho gratis". |
| Precio | **Gratis para despachos contables**; la empresa paga su plan. El despacho gana una comisión recurrente. La prueba gratis de la empresa se alarga si llega invitada por su contador. |
| Canal | Programa **Socios Contadores** (niveles por clientes activos). Primer socio: el despacho de Angélica, con sus clientes reales como piloto. |
| Contenido (Instagram/Reels) | Pilares: (1) "Te salvamos de una multa" con avisos y calendario; (2) el contador que dejó de perseguir facturas; (3) cualquiera puede usarlo (gente mayor usándolo); (4) hitos de producto contados como historias humanas (lo que mejor funciona en Fina). |
| Comparativas SEO | "AD System vs Fina" (fiscal + contador) y "AD System + Norkut" (complemento). Tono respetuoso y con hechos. |
| Prueba social | Testimonios del piloto (clientes del despacho de Angélica) y reseñas en Google. Nadie del sector las tiene todavía. |

## Métricas de que el diferenciador funciona
- **Activación:** primer registro con foto en las primeras 24 h.
- **D1:** comprobantes de retención generados por empresa al mes; avisos que terminan en "papel renovado".
- **D2:** porcentaje de empresas conectadas a un contador; despachos con 5 o más clientes; documentos pedidos y recibidos.
- **D3:** tiempo para registrar con foto; abandono del formulario; uso de la ayuda.

## Consecuencias en el plan (prioridades antes del lanzamiento)
1. Flujo multiinquilino con contadores + Mi cartera + pedir documento (D2). **Nuevo, alto.**
2. Calendario fiscal personal + resumen "lo que vas a declarar" (D1). **Nuevo, alto, barato.**
3. Activar avisos + campana de notificaciones + ayuda contextual (D1, D3).
4. Validación de libros con la contadora (D1).
5. Asistente fiscal v1 (D4).
6. Sesiones de prueba con usuarios mayores (D3).
7. Al final: tasa definida por el cliente (D5).
