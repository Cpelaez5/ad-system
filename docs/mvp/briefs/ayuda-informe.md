# Ayuda pública + contexto del chat (v0) — informe

## Hecho
- **Contenido** (fuente única): `docs/ayuda/*.md`, 13 archivos (12 guías + `api.md`), escritos tras leer el código real de cada pantalla.
- **Pantallas públicas** (sin sesión, lazy): `/ayuda` (buscador + tarjetas), `/ayuda/api`, `/ayuda/:slug` (índice plegable, "¿Te sirvió?" solo visual, "Escríbenos por el chat"). Bloques de código con "Copiar". Carga con `import.meta.glob(?raw)`; HTML siempre saneado con DOMPurify (falla cerrado si no hay DOM). El dominio de la API sale de `VITE_SUPABASE_URL` en ejecución.
- **Enlaces "Ayuda"**: pie (AppFooter: landing y login), hoja "Más" (Guías de ayuda), menú de usuario.
- **Chat v0**: `chatService.sendMessage` agrega al mensaje de sistema las 3 guías más relevantes (+ FAQ si hay <3 o empate) con la instrucción pedida. Lógica pura en `src/utils/ayudaBusqueda.js` (también usada por el buscador). Edge Function intacta.
- **Dependencias**: `marked`, `dompurify` (deps); `jsdom` (dev, solo para probar el saneado; happy-dom no sanea).
- **Tests**: `src/utils/__tests__/ayuda{Busqueda,Markdown,Contenido}.test.js`; E2E `e2e/15-ayuda.spec.js`.
- Capturas: `docs/mvp/briefs/capturas/ayuda-{inicio,articulo,api}-{escritorio,movil}.png`.

## Notas
- Retenciones: describe la versión actual con nota "se está mejorando"; no se tocaron los archivos del otro agente.
- La unidad en la API (`UND, KG, LT, MT, PAQ, CAJA`) difiere de la lista del formulario de la app (`LTS`, `MTS`, `BULTO`): documentado tal como acepta la API.
- E2E: el servidor local falla a ratos con `ERR_NETWORK_ACCESS_DENIED` al cargar un chunk (flake conocido); con reintentos pasa. Se corrió con una config sin globalSetup (la pública no necesita sesión).
- Los 👍/👎 no se guardan (pendiente: tabla de valoraciones para el afinamiento futuro).
