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

## Fases
1. Columnas en `ai_usage_logs`, las tarifas y que las funciones las registren (sin bloquear todavía). Barra en Mi plan y tabla por negocio en el panel.
2. Límite por plan, corte suave y avisos.
3. Venta de créditos extra desde Mi plan.
