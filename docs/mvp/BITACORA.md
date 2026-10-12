# Bitácora MVP

| Fecha | Agente | Qué cambió | Pendiente |
|---|---|---|---|
| 2026-10-12 | Claude (orquestador) | Auditorías de código, BD, docs, UX, competencia y /examples. Plan MVP y 8 manuales en `docs/mvp/`. Sin cambios en código ni en producción. | El usuario: rotar keys, repo privado, confirmar el build de Netlify, decisiones D1-D6. Siguiente: Fase 0 (manual 01). |
| 2026-10-12 | Claude (Opus) + Sonnet + Gemini | Fase 0: migraciones `fase0_permisos_y_funciones` y `fase0_storage_aislamiento` aplicadas y verificadas (cliente no puede escalar rol, ni ver otras firmas; anónimo sin acceso a RPCs ni archivos). Claves de IA fuera del bundle (`ai-chat` v5 con visión). `register-client` v11 sin org desde el navegador. L1 (25 archivos muertos) por Gemini. | Buckets privados + URLs firmadas (agente en curso). Leaked password protection (usuario). Entorno dev separado antes del lanzamiento. |
