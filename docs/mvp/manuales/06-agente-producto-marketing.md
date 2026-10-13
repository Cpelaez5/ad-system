# Manual 06 — Agente Producto & Marketing (Fase 4)

**Misión:** que la propuesta se entienda en 5 segundos, que los precios sean claros y que un desconocido pueda registrarse, probar y pagar con confianza.
**Modelo sugerido:** cualquiera para el texto; **las decisiones son del usuario**. Sirven las skills `copywriting`, `pricing`, `cro`, `onboarding` y `social`.
**Lee:** `00-REGLAS-COMUNES.md`, `auditorias/competencia.md` (completo), `docs/mvp/auditorias/roadmap-v2-pdf-texto.txt` (estrategia de Instagram y Meta Ads), `examples/PRECIOS DEL SISTEMA (1).doc.md`.

## Hechos de partida
- Fina Partner: $35/mes, un solo plan, sin prueba, cero reembolsos, no habla de SENIAT, retenciones ni libros, y no atiende a contadores.
- Hoy: 5 planes ($15 / $29 / $59 / $99 / $189+) con **las mismas funciones** + servicio contable adicional ($20-$100+) + multiempresa a $8 por empresa. La landing muestra $0,00.
- Posicionamiento: ver `PLAN-MVP.md §1`.

## Tareas
- [ ] **P1. Propuesta de precios** para que el usuario decida (D1): 2-3 planes diferenciados por **volumen** (registros con IA/mes, usuarios, empresas) y un plan "Con contadora" que incluya el servicio. Tabla comparativa contra Fina. Prueba de 14 días sin tarjeta (D2).
- [ ] **P2. Landing (rehacer desde cero, al final del MVP):** enfocada en ventas, inspirada en lo que funciona en Fina pero mejor: capturas de la app en marcos tipo Mac/iPhone, GSAP + ScrollTrigger (instalar `gsap`), demo animada del registro por foto, logo animado (`LogoAnimado`), prueba social y precios reales. Además: (`src/views/LandingPage.vue`): hero con el posicionamiento, demo en video o GIF de "foto → registrado en 3 toques", "Lo que Fina no hace" (sin nombrarla: "en regla con el SENIAT"), precios reales desde `subscription_plans`, testimonios y FAQ. Debe pasar la prueba de la abuela.
- [ ] **P3. Legal:** términos, privacidad y política de reembolso (`/legal` ya existe; actualizar). Señalar lo que requiere revisión de un abogado.
- [ ] **P4. Soporte:** botón flotante de WhatsApp en la landing y en la app, con mensaje prellenado según la pantalla.
- [ ] **P5. Medición:** eventos mínimos: registro, primer registro con foto, perfil fiscal completo, pago reportado, activación. Herramienta liviana (Plausible, PostHog o GA4, a decidir) y monitoreo de errores (Sentry o similar).
- [ ] **P6. Contenido de lanzamiento:** 10 piezas para Instagram siguiendo los 3 pilares del Roadmap v2.0 (Educación, "Desafío de los 60 segundos", Prueba social), con foco en el usuario no digital.
