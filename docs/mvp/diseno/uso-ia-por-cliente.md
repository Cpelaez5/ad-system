# Uso de IA por cliente (créditos) y barra de consumo

Fecha: 2026-10-15. Pedido del usuario: "poder llevar y administrar el uso de IA por cada cliente, y que el cliente pueda ver con una barra cómo va su uso".

## Por qué
Cada lectura por foto, cada mejora con Nano Banana y cada respuesta del chat le cuesta a AD System. Hoy `ai_usage_logs` registra quién (user_id), el modelo y los tokens, pero no a qué **negocio** pertenece la llamada ni qué **función** se usó. Por eso no se puede limitar por plan ni mostrarle al cliente su consumo.

## Unidad: créditos de IA (fáciles de entender)
El cliente no entiende de tokens. Cada función gasta **créditos** fijos:

| Función | Edge Function / acción | Créditos |
|---|---|---|
| Leer una factura por foto (OCR) | `gemini-ocr` | 1 |
| Foto y listo (identificar producto) | `producto-ia` → identificar | 1 |
| Foto del estante | `producto-ia` → estante | 2 |
| Mejorar foto con IA (Nano Banana) | `producto-ia` → mejorar | 3 |
| Llenar con un documento | `documento-ia` | 1 |
| Pregunta al chat de ayuda | `ai-chat` (soporte) | 0,2 (5 preguntas = 1 crédito) |

Los créditos por función viven en una tabla (`ia_tarifas`) que edita el super admin, no fija en el código.

## Límite por plan, con excepción por negocio
- `subscription_plans.creditos_ia_mes` (ej.: Básico 50, Pro 200, Empresarial 1.000).
- `clients.creditos_ia_extra` permite que el super admin regale o venda créditos a un negocio puntual.
- El mes es el **calendario de Caracas**; el contador se reinicia el día 1.

## Datos
- **Columnas nuevas en `ai_usage_logs`:** `client_id` (sin FK; regla de embeds), `accion` (`ocr`, `identificar`, `estante`, `mejorar`, `documento`, `chat`) y `creditos` (numeric). Cada Edge Function de IA las llena: busca el `client_id` del usuario y la tarifa de la acción.
- **Vista o RPC `uso_ia_mes(p_client_id)`:** devuelve `{ usados, limite, por_accion }`. El cliente solo puede consultar el suyo (RLS / `security definer` que valida `get_current_user_client_id()`).
- **Corte suave:** antes de llamar a Gemini, la función revisa el saldo. Si ya no quedan créditos, responde `{ error: { code: 'SIN_CREDITOS', message: 'Usaste todos tus créditos de IA de este mes…' } }` y la app ofrece "Mejorar mi plan". Los registros manuales **nunca** se bloquean: solo la ayuda de la IA.

## Lenguaje: el cliente NUNCA ve "tokens" ni "créditos" (pedido del 2026-10-15)
- Los créditos son solo la unidad **interna** (super admin, cálculos).
- Al cliente se le habla de **"Tu asistente"**: una **barra** con el porcentaje del mes y una frase según cuánto queda:
  - menos del 50 %: "Te queda bastante";
  - del 50 al 80 %: "Vas a mitad de mes de uso";
  - del 80 al 99 %: "Te queda poco";
  - 100 %: "Se renueva el 1 de noviembre".
- El detalle se dice en **acciones**: "Leíste 12 facturas con foto · Mejoraste 3 fotos · Hiciste 18 preguntas". Nunca en números de créditos.

## Dónde se ve la barra
- **Escritorio:** en el **menú lateral**, encima de "Cerrar sesión", con la etiqueta "Tu asistente" y una barra fina. La barra superior ya está ocupada por las tasas. Con el menú recogido se ve un **círculo de progreso** con un tooltip.
- **Teléfono:** en la hoja "Más" y en **Mi plan**.
- Al tocarla se abre el detalle en un diálogo: la barra grande, las acciones del mes, la fecha en que se renueva y, si queda poco, "Mejorar mi plan".

## Lo que ve el cliente
- En **Mi plan**, la tarjeta **"Tu IA este mes"**:
  - una barra "34 de 100 créditos";
  - el desglose por función ("12 facturas leídas · 3 fotos mejoradas · 18 preguntas");
  - "Se renueva el 1 de noviembre".
- **Avisos amables:** al 80 % ("Te quedan 20 créditos de IA este mes") y al 100 %, junto al botón de la función. Nunca a mitad de una acción.
- **Mini barra en Inicio** (sugerencias) cuando pasa del 80 %.

## Lo que ve el super admin (panel Operación → Uso de IA)
- Una tabla por negocio: créditos usados / límite, costo real en USD (de `costo_estimado`) y margen frente a lo que paga el plan.
- **Acciones:** sumar créditos extra a un negocio y editar las tarifas por función.
- **Alertas:** negocios que llegan al 100 %, porque son candidatos a mejorar su plan.

## Estado
- **Hecho (2026-10-15, migración `20261015160000`):**
  - columnas `client_id`, `accion` y `creditos` en `ai_usage_logs`, llenadas por un trigger que deduce la acción si la función no la manda;
  - `ia_tarifas`, `subscription_plans.creditos_ia_mes` y `plans.creditos_ia_mes` (topes provisionales: prueba 30, Solo Pro 100, Visionary 200, Business Momentum 300, Enterprise Hub 600, Corporate Nexus 1.000), y `clients.creditos_ia_extra`;
  - la RPC `uso_ia_mes(p_client_id)`;
  - `producto-ia` v3 y `documento-ia` v2 mandan su `accion`.
- **Pendiente:** `ai-chat` y `gemini-ocr` no se pueden volver a publicar con la herramienta actual (usan archivos compartidos), así que su acción la deduce el trigger: el OCR se reconoce por la moneda detectada y lo demás cuenta como chat. Los registros anteriores a hoy de identificar, estante y documento quedaron contados como chat.

## Fases
1. Columnas en `ai_usage_logs`, las tarifas y que las funciones las registren (sin bloquear todavía). Barra en el menú lateral y en Mi plan, y tabla por negocio en el panel.
2. Límite por plan, corte suave y avisos.
3. Venta de créditos extra desde Mi plan.
