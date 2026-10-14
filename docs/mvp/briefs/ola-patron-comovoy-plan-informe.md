# Informe — ¿Cómo voy? y Mi plan (ola patrón cliente)

## ¿Cómo voy?
- Frase de resultado + 3 cifras (Vendí, Gasté, Lo que vas a declarar con AyudaTermino).
- Rejilla de 12 columnas en escritorio, apilada en móvil, con 7 paneles de datos reales ya cargados: mes a mes (6/12 meses, línea "Me queda"), en qué gasto más (con aviso para categorizar), impuestos del período, top clientes, top proveedores, días de venta, moneda de cobro.
- Cada panel: título en pregunta, frase de lectura calculada y estado vacío que enseña.
- Cálculos puros en `src/utils/resumenFinanciero.js` (con tests). Animación con `DURACION_CHART_MS`/`EASING_CHART`, respeta reduced-motion. `ad_visto_como_voy` conservado.

## Mi plan
- `Planes.vue`: encabezado con plan actual, chip de estado, días restantes (barra) y un solo siguiente paso (pago en revisión / renovar / vence pronto / al día). Comparación de planes con destacado en borde granate (PlanCard); chip dorado de -17% pasa a tono sobrio.
- `FacturacionSuscripcion.vue` ("Pagos de mi plan"): se quitan las 4 tarjetas de colores; frase + cifras en línea (pagado, falta pagar, próximo vencimiento, saldo a favor). Tabs, diálogos y servicios intactos.

## Verificación
- Capturas en `docs/mvp/briefs/capturas/` (comovoy, plan, plan-pagos; escritorio y móvil). La cuenta de prueba tiene poco movimiento "Este mes", así que la captura usa "Este año".
- Vitest: 768/769; el único fallo es `tests/calidad/iconos.spec.js` porque el worktree no tiene `node_modules` propio (lee `node_modules/@mdi/font`); los íconos nuevos se comprobaron a mano contra el de la carpeta principal: todos existen.
- Build en verde. Detector impeccable: sin hallazgos.

## Notas / ideas futuras
- Sin datos nuevos de BD. Los 3 primeros paneles de "días restantes" asumen periodo de 30/365 días para la barra.
- Capturas hechas con `.env` copiado al worktree (ignorado por git).
