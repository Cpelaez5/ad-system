# Informe: Mi negocio con el patrón del cliente

Pantalla: `src/views/cliente/ClienteMiArea.vue` (título "Mi negocio").

- Avance "Tu negocio está X% listo" y "Tu siguiente paso", calculados con datos reales del cliente (4 pasos: datos de la empresa, perfil fiscal, sello y firma, tu cuenta).
- Secciones: Datos de la empresa, Perfil fiscal guiado (sí/no en llano), Sello y firma, Tu cuenta.
- Perfil fiscal: solo columnas existentes de `clients` (es_contribuyente_especial, es_agente_retencion_municipal, retains_islr, activity_type, taxpayer_type). Sin migraciones. El trigger `proteger_campos_clients` solo bloquea status/balance/organization_id para el cliente, por lo que estos campos son editables.
- Coherencia con "Primeros pasos": el paso de datos exige activity_type, licencia_actividad_economica, estado y municipio.
- `userService.updateUserProfile` (solo escritura; no toca la lectura del login): ahora también guarda `estado` (antes se descartaba), `es_contribuyente_especial` (sincronizado con `is_special_taxpayer` legado), `es_agente_retencion_municipal` y `taxpayer_type`.
- Glosario: término `licencia_actividad_economica`.
- Pruebas: `ClienteMiArea.test.js` (6) y e2e 11 actualizado.
- Capturas: `docs/mvp/briefs/capturas/mi-negocio-{escritorio,movil}.png`.

Nota: `tests/calidad/iconos.spec.js` falla solo en el worktree por falta de `node_modules/@mdi` local; los íconos usados se verificaron contra el CSS del repo principal.
