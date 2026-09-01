# Contexto del Proyecto — Sistema Contable

## Stack técnico
- Frontend: Vue 3 + Vite
- Backend: Supabase (PostgreSQL + Edge Functions en Deno/TypeScript)
- IA: Multi-proveedor (Gemini, Deepseek) mediante patrón adaptador
- IDE: Google Antigravity con Gemini 3.1 Pro (thinking_level: high)

## Módulo activo: OCR de Comprobantes con IA Multi-Proveedor

### Archivos clave de este módulo
- `migrations/20260824_add_ai_settings_and_vault.sql` y `20260824_ai_provider_profiles.sql` — Schema de BD
- `supabase/functions/gemini-ocr/index.ts` — Edge Function principal
- `supabase/functions/gemini-ocr/providers/*` — Patrón adaptador de proveedores IA
- `src/services/gemini/geminiOcrService.js` — Servicio cliente Vue
- `src/views/admin/AiSettings.vue` — UI de configuración para superadmin

### Decisiones arquitecturales ya tomadas (NO revertir)
1. **Patrón Adaptador para IA:** El sistema soporta múltiples proveedores (Gemini, Deepseek, etc.) mediante un sistema de perfiles. La Edge Function `gemini-ocr` usa un `createProvider()` del `factory.ts` en lugar de llamar directamente a la API.
2. **Limitación de Deepseek:** Deepseek Vision no soporta PDFs nativamente ni acepta `fileUri` en su API, requiere conversión a imágenes o paso por base64.
3. **Modelos Sugeridos (texto libre):** 
   - Gemini: `gemini-3.1-pro-preview`, `gemini-3.7-flash`
   - Deepseek: `deepseek-chat`, `deepseek-reasoner`
4. **Unicidad de Perfil:** Solo un perfil de proveedor puede estar activo a la vez (`ai_provider_profiles` tiene un índice único parcial en `is_active = true`).
5. La Edge Function borra el archivo temporal en un bloque `finally` — el cliente NUNCA borra archivos de Storage.
6. El modelo OCR usa `thinking_level: 'medium'` en runtime para controlar costos. El agente de Antigravity usa `high`.
7. Existe un sistema de lock de concurrencia en la tabla `ai_ocr_locks` — un usuario = un OCR activo a la vez.
8. La tasa de cambio (USD/Bs) se aplica al GUARDAR el comprobante, no al momento del OCR.
9. `ai_usage_logs` registra tanto éxitos como errores con `status`, `error_code` y `error_message`.
10. **Schema Unificado (Fase 7):** La Edge Function `gemini-ocr` devuelve un único schema unificado en **inglés** (Opción A: directamente desde Gemini) que sirve tanto para comprobantes básicos como para facturas complejas. 
11. **Consistencia Financiera:** En el schema financiero, se utiliza exclusivamente `taxableAmount` (eliminando `subtotal`) para evitar sobrescrituras silenciosas en el frontend.
12. **Firma de Servicios:** Se usa *destructuring* para pasar parámetros opcionales a `procesarComprobanteOCR` (`{ comprobanteId, userContext, flowType, onProgress }`), manteniendo retrocompatibilidad.
13. **Inmutabilidad de Correlativos Históricos:** Los correlativos fiscales emitidos (`numero_comprobante`) son inmutables y nunca deben modificarse. Toda corrección histórica en `retenciones` debe ser idempotente (`WHERE corregido_en IS NULL`), registrar el valor previo en `base_imponible_original`, registrar `corregido_en` y `corregido_motivo`, y preservar los números fiscales.
14. **Desacople de Fecha de Comprobante vs Fecha de Factura:** En el objeto `financial` se maneja `retentionDate` (default fecha de hoy, `:max="today"`). En la tabla `retenciones` se almacena en `fecha_comprobante`. En modo edición, el fallback estricto para facturas históricas es `inv.financial?.retentionDate || today` (nunca `issueDate` para no distorsionar el período fiscal `YYYYMM` de la retención).
15. **Normativa SENIAT en Comprobantes de Retención de IVA:** En la tabla de 14 columnas reglamentaria (Providencia SNAT/2015/0049), la columna `% Alíc.` corresponde a la **alícuota legal del IVA (16%)** que grava la Base Imponible, mientras que el porcentaje de retención del contribuyente especial (75% o 100%) determina el `monto_retenido`.

## Contexto de negocio: Cashea (multi-moneda)
- Cashea es un método de pago a crédito: 1 inicial + N cuotas.
- CADA pago (inicial y cada cuota) puede pagarse en una moneda distinta (USD o Bs).
- La tasa de cambio de cada pago es la vigente en la FECHA DE ESE PAGO ESPECÍFICO.
- El OCR detecta si un comprobante es Cashea (`es_cashea: true`) y qué cuota es (`numero_cuota: 0=inicial, 1, 2, 3`).
- La moneda detectada en el OCR aplica SOLO a ese pago — no a las otras cuotas del mismo plan.

## Convenciones de código
- TypeScript en Edge Functions, JavaScript en servicios Vue
- Nombres de variables en español para lógica de negocio, inglés para infraestructura
- Todos los errores tienen la forma `{ code: string, message: string }` — nunca strings sueltos
- Los logs fire-and-forget no deben bloquear la respuesta al cliente

## Estado actual del módulo
- [x] Migración SQL creada (`20260824_add_ai_settings_and_vault.sql`)
- [x] Migración de perfiles múltiples creada (`20260824_ai_provider_profiles.sql`)
- [x] Migración de corrección de base imponible y desacople de fecha creada y aplicada (`20260831_fix_retention_base_imponible_and_date.sql`)
- [x] Estructura del Patrón Adaptador (`providers/`) creada
- [ ] Bucket `temp_ocr` configurado en Supabase Dashboard
- [ ] Edge Function `gemini-ocr/index.ts` refactorizada con Factory
- [x] Servicio Vue `geminiOcrService.js` implementado
- [x] Vista `AiSettings.vue` implementada
- [x] Soporte de `retentionDate` y corrección de alícuota en PDF fiscal implementado
- [ ] QA completado
