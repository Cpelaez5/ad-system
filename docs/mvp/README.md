# docs/mvp — Cómo usar esta carpeta

1. **`PLAN-MVP.md`**: el plan completo (diagnóstico, principios, fases, decisiones pendientes).
2. **`manuales/`**: un manual por agente. Para lanzar un agente (Antigravity, Claude Code u otro):
   > "Lee `docs/mvp/manuales/00-REGLAS-COMUNES.md` y `docs/mvp/manuales/0X-....md`. Ejecuta la siguiente tarea sin marcar de la lista. Al terminar, márcala y anota en `docs/mvp/BITACORA.md`."
3. **`auditorias/`**: los informes de los que salió el plan (12-oct-2026). Son referencia; cada manual dice qué secciones leer.
4. **`BITACORA.md`**: registro corto de lo hecho. Es lo primero que lee un agente nuevo para saber en qué vamos.

| Manual | Agente | Fase |
|---|---|---|
| 00 | Reglas comunes | — |
| 01 | Seguridad & BD | 0 (bloqueante) |
| 02 | Limpieza & Arquitectura | 1 |
| 03 | UX Simplicidad | 2 |
| 04 | Fiscal Venezuela | 2 (transversal) |
| 05 | Super Admin & Billing | 3 |
| 06 | Producto & Marketing | 4 |
| 07 | QA | todas |

> `auditorias/` y el manual 01 están en `.gitignore` porque describen vulnerabilidades abiertas. Quítalos de ahí cuando la Fase 0 esté cerrada y el repo sea privado.
