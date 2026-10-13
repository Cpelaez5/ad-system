# Plan MVP Vendible — AD System

> Fecha: 2026-10-12 · Basado en 6 auditorías (código, BD, docs, UX, competencia, /examples) en `docs/mvp/auditorias/`.
> Este documento es la **fuente de verdad del plan**. Si otro documento lo contradice, gana este (o la auditoría más reciente).

## 1. Dónde estamos (diagnóstico en una página)

| Área | Estado | Dato clave |
|---|---|---|
| Funcionalidad | **Alta** | Facturación con OCR-IA, retenciones IVA/ISLR/municipal con PDF, libros, inventario, proveedores, Expediente 360, planes y pagos manuales. 219 tests pasan. |
| Seguridad | **Crítica — bloquea la venta** | Registro con rol arbitrario, buckets de archivos sin aislamiento, RPC de facturación abierta a anónimos, API keys de IA en el bundle y en un repo público. |
| Facilidad de uso | **4/10 para un novato** | Diseñado "para contadores": jerga, formularios de ~12 campos, OCR escondido en un acordeón, sidebar que tapa contenido, Expediente 360 = 2/10. |
| Calidad de código | Media | ~66 000 líneas, 20 archivos >800 líneas, 3 motores de factura en paralelo, 1110 `console.log`, ~17 archivos muertos, `dist/` en git. |
| Base de datos | Media | RLS bien diseñado en tablas, pero migraciones no reproducibles (55 remotas vs carpetas desordenadas) y 2 edge functions sin código en el repo. |
| Comercial | Débil | Landing muestra **$0,00** en los 5 planes con features idénticas; "Cartelera fiscal" obsoleta (SENIAT ago-2026, a confirmar con la contadora). |

**Competencia (Fina Partner):** $35/mes, +5 000 negocios, US$1M de inversión, tono muy simple. **No comunica retenciones, libros fiscales ni SENIAT**, no atiende a contadores, sin prueba gratis ni reembolsos.

**Nuestro posicionamiento:**
> *"El sistema contable que cualquiera puede usar — aunque nunca hayas usado una computadora — y que te mantiene en regla con el SENIAT sin que tengas que entender de impuestos."*

Las dos patas son **cumplimiento fiscal** (ya lo tenemos y Fina no) y **simplicidad real** (todavía no la tenemos y Fina sí la comunica). El MVP consiste en cerrar la segunda sin romper la primera.

## 2. Principios de producto ("la prueba de la abuela")

Toda pantalla del rol `cliente` debe pasar estas reglas. Son el criterio de aceptación del agente UX.

1. **Una acción principal por pantalla**, con un botón grande y un verbo claro ("Registrar lo que gasté").
2. **Cero jerga en la primera capa.** "IVA retenido" se convierte en "Impuesto que te descontaron", con un (?) que muestra el término técnico. Lo contable va en una capa "Detalles" plegada.
3. **La foto primero.** Registrar un gasto o una compra = tomar o subir una foto → confirmar 3-4 datos → listo. **Máximo 3 toques.**
4. **El sistema calcula, la persona confirma.** Las retenciones salen de la ficha del proveedor y del perfil de la empresa. **Si la empresa no es agente de retención, nunca se le muestran retenciones.**
5. **Siempre decir qué pasó.** Todo error de red o de validación produce un mensaje visible en lenguaje llano, nunca solo un `console.log`.
6. **Legible para ojos cansados:** texto ≥16px, botones ≥48px, contraste AA, montos con 2 decimales y abreviados ("Bs 20,5 millones").
7. **Móvil primero:** el cliente real usa el teléfono.

## 3. Fases

Cada fase tiene un **agente responsable** con su manual en `docs/mvp/manuales/`. Las fases 0 y 1 son secuenciales. A partir de la 2 se pueden solapar.

### Fase 0 — Seguridad y entorno (BLOQUEANTE · 2-4 días) → `01-agente-seguridad-bd.md`
- **[Usuario, hoy]** Revocar y regenerar las API keys de DeepSeek y NVIDIA. Hacer **privado** el repo de GitHub.
- Sacar todas las llamadas a IA del frontend (5 servicios usan `VITE_DEEPSEEK_API_KEY`/`VITE_NVIDIA_*`) y pasarlas por Edge Functions.
- Quitar `dist/` de git y agregarlo a `.gitignore`.
- Corregir `handle_new_user`: nunca confiar en `role`/`organization_id` del metadata. Los registros de contador o firma pasan por una Edge Function que valida la invitación.
- Aislar por tenant los buckets `documents` e `invoices` (privados + URLs firmadas) y las escrituras de `payment-proofs`.
- Cerrar el SELECT público de `invitations`, aplicar `create_pending_subscription_invoice_v2/v3` + `REVOKE` a las 18 SECURITY DEFINER, fijar `search_path` y activar la protección contra contraseñas filtradas.
- **Entorno de desarrollo separado de producción** (hoy `npm run dev` escribe en la BD real).
- Migraciones: una sola carpeta `supabase/migrations/` con baseline del esquema remoto, y traer al repo el código de `bcv-rates` y `bcv-extra-rates`.
- Commitear el trabajo pendiente de invitación de usuarios (ya probado y con la migración aplicada).

### Fase 1 — Estabilizar y limpiar (3-5 días) → `02-agente-limpieza-arquitectura.md`
- Borrar los ~17 archivos muertos y la basura de la raíz. Quitar `ClientInvoiceForm` del diálogo cliente cuando QA confirme que `SimpleInvoiceForm` cubre todo.
- Logger único + `esbuild.drop: ['console']` en el build de producción.
- Router guard: una sola consulta de usuario, snackbar en vez de `alert()`, y manejo de "Failed to fetch dynamically imported module" con recarga automática (verificar primero si ocurre en producción).
- Corregir errores visibles: etiqueta "IVA: 75%" en Proveedores (es el % de retención), $0,00 en la landing, "Distribución de gastos" del admin agrupando por descripción.
- Documentación: aplicar la reducción a ~25 documentos según `auditorias/audit-docs.md`.

### Fase 2 — Simplicidad extrema para el cliente (2-3 semanas) → `03-agente-ux-simplicidad.md` + `04-agente-fiscal-venezuela.md`
Es el corazón del MVP y el diferenciador.
- **Inicio nuevo del cliente:** 3 botones gigantes ("Vendí", "Gasté / Compré", "¿Cómo voy?") + resumen del mes en una frase.
- **Registro por foto:** cámara y subida como opción por defecto, tarjeta de confirmación de 3-4 campos y "Detalles contables" plegado.
- **Perfil fiscal guiado:** preguntas sí/no ("¿El SENIAT te nombró contribuyente especial?") que activan u ocultan módulos (retenciones IVA, municipal).
- **Expediente 360 → "Mis papeles y vencimientos":** semáforo de colores (spec en `examples/expediente-fiscal-360.md`), "vence en X días" y fechas obligatorias.
- Sidebar → navegación inferior en móvil y menú con texto en escritorio. Las monedas del header llevan etiqueta ("Dólar BCV hoy").
- Onboarding en el primer ingreso (3 pasos), estados vacíos que enseñan y glosario (?).
- El agente fiscal valida que ningún cálculo cambie: tests de regresión antes y después.

### Fase 3 — Super admin para operar el negocio (1-2 semanas) → `05-agente-superadmin-billing.md`
- Panel de negocio: clientes activos, en prueba, vencidos, MRR, pagos por verificar y consumo/costo de IA.
- Bandeja de "pagos reportados" con aprobar o rechazar en 1 clic (activa la suscripción y notifica).
- Gestión de usuarios con invitación (ya construida) y estados claros.
- Ocultar `/ocr-demo` y `/test-form` en producción.
- **Adelantado de la Fase 5 (decisión 2026-10-12): avisos de vencimiento por correo.** Job diario (`pg_cron` + Edge Function) que avisa al cliente 30, 7 y 1 días antes de que venza un papel de "Mis papeles" (`fiscal_docs.expiration_date`) o su plan. Plantilla corta en lenguaje llano con botón "Ver mis papeles".
- **Adelantado de la Fase 5: registrar un gasto mandando la foto por WhatsApp** (gancho de lanzamiento). WhatsApp Business Cloud API (Meta) → webhook en Edge Function → identifica al cliente por su número verificado → reutiliza `gemini-ocr` → guarda como **borrador** y responde "Listo, registré tu gasto de $X en *Proveedor*. Revísalo aquí: <enlace>". Requisitos del usuario: cuenta de Meta Business verificada, número de teléfono dedicado y plantillas aprobadas (lo gestiona el usuario; el código no depende de eso para probarse en modo sandbox).

### Fase 4 — Lanzamiento comercial (1-2 semanas, en paralelo con la Fase 3) → `06-agente-producto-marketing.md`
- Decisión de precios (ver §5), landing reescrita con el posicionamiento, comparativa con Fina y testimonios.
- **Landing nueva enfocada en ventas (último paso del MVP, pedido del usuario 2026-10-13):** rehacer `LandingPage.vue` desde cero tomando como referencia lo que funciona en Fina Partner (`auditorias/competencia-fina-profundo.md`) y superándolo: capturas reales de la app dentro de marcos tipo Mac/iPhone, animaciones con **GSAP + ScrollTrigger** (secciones que se revelan, demo "foto → registrado" que se reproduce al hacer scroll, contadores, logo animado), elementos dinámicos, prueba social, comparativa, precios reales y CTA a la prueba gratis. Móvil primero, rendimiento (Lighthouse ≥90) y `prefers-reduced-motion`. Skills: `gsap-scrolltrigger`, `gsap-core`, `gsap-timeline`, `impeccable`, `copywriting`, `cro`.
- Términos, privacidad y política de reembolso (diferenciarse de "cero reembolsos").
- Botón de soporte por WhatsApp, analítica básica (activación, registro del primer gasto), monitoreo de errores y backups verificados.

### Fase 5 — Diferenciadores post-MVP (backlog priorizado)
1. ~~Foto por WhatsApp~~ → adelantado a la Fase 3.
2. Alertas por **WhatsApp** (las de correo se adelantan a la Fase 3) y motor proactivo del Roadmap v2.0 (alerta de gasto +15 %, reporte semanal "Salud de tu negocio").
3. Modo contador multi-cliente y exportación para Profit, Gálac o Saint.
4. Registro por voz ("Gasté 20 dólares en gasolina").
5. Conciliación bancaria con CSV + IA.
6. Integración con imprenta digital autorizada (Providencia SNAT/2024/000102).

7. **Paridad con Fina** (de `auditorias/competencia-fina-profundo.md`): asistente de IA conversacional con lenguaje llano fiscal ("¿debo retener? ¿cuánto?") — ya existe base en `SupportChat` + `ai-chat`; comisiones por vendedor; CRM con mensajes masivos; conciliación bancaria real.
8. **Facturación fiscal vía imprenta digital autorizada** (Providencia SNAT/2024/000102): Fina la promete y la tiene retrasada; ser primeros es una ventaja grande. Requiere alianza con una imprenta digital (decisión de negocio del usuario). Modelo real de formato: `examples/facturas-prueba/factura-imprenta-digital.pdf`.
9. **Contenido y confianza (Fase 4):** centro de tutoriales en video por tipo de negocio, blog SEO fiscal venezolano, Shorts de 15-20 s con usuarios 60+, y reseñas verificables (Google Business).

### Transversal — QA → `07-agente-qa.md`
Cierra cada fase: vitest verde, recorrido en navegador de los flujos cliente y super admin (escritorio y móvil) y checklist "prueba de la abuela".

## 4. Orden de ejecución y modelo sugerido

| # | Agente | Fase | Herramienta / modelo sugerido | Por qué |
|---|---|---|---|---|
| 1 | Seguridad & BD | 0 | Claude Code (Opus) + Supabase MCP | Cambios en producción, requieren máximo cuidado |
| 2 | Limpieza & Arquitectura | 1 | Claude Sonnet o Gemini 3.1 Pro en Antigravity | Mecánico y con buen contexto |
| 3 | UX Simplicidad | 2 | Gemini 3.1 Pro en Antigravity (diseño) + revisión Claude | Mucho frontend y mucha iteración visual |
| 4 | Fiscal Venezuela | 2 | Claude Sonnet + contadora como validadora | Exactitud de reglas, tests |
| 5 | Super Admin & Billing | 3 | Gemini 3.1 Pro o Claude Sonnet | CRUD y paneles |
| 6 | Producto & Marketing | 4 | Cualquiera + humanos | Copy y decisiones de negocio |
| 7 | QA | todas | Claude (Sonnet) con Claude in Chrome | Pruebas en navegador |

**Ahorro de tokens:** cada agente lee **solo** `REGLAS-COMUNES.md` + su manual + las secciones de auditoría que cita. No debe leer `CONTEXTO_PROYECTO.txt` ni `.agent/` completos.

## 5. Decisiones que necesito de ti (y de la contadora)

| # | Decisión | Recomendación |
|---|---|---|
| D1 | Planes: hoy hay 5 niveles con las mismas funciones | 2-3 planes que se diferencien por **volumen** (nº de registros con IA/mes, usuarios) y no por funciones. Entrada ≈ $15-19, por debajo de Fina ($35). El "servicio contable" es un plan aparte, no un adicional confuso. |
| D2 | Duración de la prueba: el código dice 15 días, el PDF 9 | 14 días con todas las funciones y sin tarjeta |
| D3 | "Cartelera fiscal" (¿eliminada por SENIAT en ago-2026?) | La contadora lo confirma; si es así, se renombra a "Mis papeles y permisos" |
| D4 | ¿Los flujos de contador y firma entran al MVP? | No: el MVP es cliente + super admin. El rol contador queda funcionando pero sin rediseño. |
| D5 | Entorno de desarrollo | Segundo proyecto Supabase gratuito (o branch de Supabase, que cuesta) |
| D6 | Repo de GitHub | Privado |

## 6. Definición de "MVP vendible"

- [ ] 0 hallazgos críticos o altos de seguridad (advisors de Supabase limpios en ERROR/WARN de seguridad).
- [ ] Una persona sin experiencia registra un gasto con foto en ≤3 toques y ≤60 s desde el teléfono.
- [ ] Cliente nuevo: registro → prueba → primer registro → pago reportado → activado por super admin, sin ayuda humana.
- [ ] Los libros de compra y venta y los comprobantes de retención coinciden con los modelos de la contadora (`examples/*.xls`, `RET *.pdf`).
- [ ] Landing con precios reales, términos y privacidad publicados, soporte por WhatsApp visible.
- [ ] Puntuación UX de novato ≥8/10 en los flujos del cliente (re-auditoría del agente QA).


## Ideas nuevas del 2026-10-13 (análisis Norkut)
Análisis completo, roadmap por olas y decisiones abiertas: `docs/mvp/estrategia/analisis-norkut-y-roadmap-2026-10-13.md`. Pre-lanzamiento suma: tasa con fuente propia + preferencia del cliente, notificaciones + ayuda contextual + medidores de suscripción, `contactos` + cobros + recordatorios, insights v1 por reglas, asistente v1 con herramientas sobre sus datos, planes segmentados, modelo de ubicaciones (sin UI).
