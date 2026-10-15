# Informe: "Tu asistente" e identidad visual de la IA

Fecha: 2026-10-15. Rama del worktree `worktree-agent-aee6cd336096c1286` (partió de `feat/ola-f2b`, ya incluía f4ab7f6).

## Parte A: Tu asistente
- `src/utils/usoIaTexto.js` (puro): frase por porcentaje (menos de 50 "Te queda bastante", 50-79 "Vas a mitad de mes de uso", 80-99 "Te queda poco", 100 "Se renueva el 1 de noviembre"), acciones en palabras con singular y plural, nivel, color y regla del 80 % para "Mejorar mi plan". Nunca dice créditos ni tokens (hay un test que lo vigila).
- `src/services/usoIaService.js`: `obtenerUsoIa({ clientId })` llama a `uso_ia_mes` (el cliente sin parámetros, el staff con `p_client_id`). Ante error, null o excepción devuelve null: la pantalla no muestra nada.
- `src/utils/eventosIa.js`: evento `ad-ia-usada` y `avisarIaUsada()`. Se despacha tras una llamada de IA exitosa en `productoFotoService` (identificar, mejorar, estante), `documentoIaService` y `geminiOcrService` (OCR del registro). No en el chat.
- `src/components/cliente/TuAsistente.vue`, variantes `compacta` (barra fina o, con el menú recogido, círculo con tooltip; al tocarla abre el detalle en `DialogoAdaptable`) y `completa` (barra grande, frase, acciones, renovación y "Mejorar mi plan" desde el 80 % hacia `/cliente/planes`). Prop `tarjeta` para Mi plan y `clientId` para el staff. Se refresca al montarse y con `ad-ia-usada`.
- Montada en `MenuLateral.vue` (solo rol cliente, encima de "Cerrar sesión"), `HojaMas.vue` (hoja "Más" del teléfono) y `views/cliente/Planes.vue` (tarjeta).

## Parte B: identidad visual
- `src/styles/ia.css` (importado en `main.js`): tokens `--ad-ia-1/-2` (granate y rosado claro; en oscuro suben de luminosidad), `.ad-ia`, `.ad-ia--bloque`, `.ad-ia--contenedor`, `.ad-ia--trabajando`, `.ad-ia-marca`. El borde gira con `@property --ad-ia-angulo` en 7 s; sin soporte queda estático; `prefers-reduced-motion` apaga el giro y el barrido.
- Componentes en `src/components/ui/`: `BotonIA` (v-btn con `mdi-creation`; todos los atributos pasan al v-btn), `TrabajandoIA` (velo con barrido y mensaje; el mensaje queda aunque no haya animación) y `MarcaIA` ("Llenado con IA · revisa").
- Barrido aplicado:
  - Mi mercancía: "Tomar foto", "Foto del estante" y "Subir foto" (Inventario.vue), "Mejorar foto con IA" (ProductoFormDialog.vue), y los estados "Mirando tu producto…" (CrearConFotoDialog) y de análisis del estante (EstanteDialog) con `TrabajandoIA`.
  - Registro con foto (SimpleInvoiceForm.vue): solo el bloque "Deja que la IA la lea por ti" (borde, velo e ícono de la IA) y su estado de lectura (`TrabajandoIA`).
  - `LlenarConDocumento.vue`: `BotonIA`, `TrabajandoIA` y `MarcaIA` (con el texto de llenado que ya existía).
  - La barra "Tu asistente".
- No se tocó la lógica de los flujos, solo la presentación y las llamadas a `avisarIaUsada()`.

## Cómo aplicarlo en el chat de soporte (otro agente lo rehace)
- Botón o ícono del asistente: `<BotonIA>` en lugar del v-btn.
- Mientras el asistente responde: `<TrabajandoIA mensaje="Pensando tu respuesta…">` envolviendo la burbuja en espera.
- Mensajes escritos por la IA: `<MarcaIA texto="Respuesta de IA">` o la clase `.ad-ia-marca`.
- No despachar `ad-ia-usada` desde el chat salvo que se decida que el chat cuenta (hoy la barra se refresca al abrir).

## Verificación
- `TZ=America/Caracas npx vitest run`: ver línea de tests en el informe final. `npm run build` en verde.
- `mdi-creation` existe en `@mdi/font` (verificado a mano en el CSS del repositorio principal).
- Capturas en `docs/mvp/briefs/capturas/ia-*.png` (escritorio 1440x900 y teléfono 412x915, claro y oscuro): menú, detalle, Mi mercancía, "trabajando" (con subida de storage simulada y la IA sin responder: nunca se llamó a la IA real), hoja "Más" y Mi plan. El uso se simuló interceptando la RPC `uso_ia_mes` (68 %, y 85 % para el detalle).
- Detector impeccable: no disponible en el repositorio, no se corrió.
- Para servir el worktree se usó una junction a `node_modules` y una configuración temporal de Vite (no se versionan).

## Notas
- En la captura de "trabajando" el fondo de la foto es una imagen de 1 px de prueba.
- El estado de lectura de `LlenarConDocumento` y el de la factura usan el mismo `TrabajandoIA`, con mensajes propios.
- `Tu asistente` no aparece si el negocio no tiene límite de IA configurado (la RPC devuelve null).
