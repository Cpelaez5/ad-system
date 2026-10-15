# Tareas del equipo de AD System → futuras herramientas del super admin

Pedido del usuario (2026-10-14): "Anota todo lo que debe hacer el equipo de AD System, para luego agregar esas funcionalidades desde el perfil del usuario con el rol de super admin".

Cada tarea dice qué hay que hacer, dónde vive hoy (BD, función, archivo) y qué herramienta del panel la reemplazaría. **Mantener esta lista viva:** cada vez que una función nueva deje trabajo manual para el equipo, se agrega aquí.

## 1. Catálogo global (proveedores y productos)
| Tarea | Hoy | Herramienta futura en el panel |
|---|---|---|
| ✅ Revisar y **verificar** proveedores del catálogo (razón social correcta, RIF real) | Hecho: `/admin/catalogo` (Por verificar por confirmaciones, Verificar, Editar, Eliminar, Agregar). **Falta:** Fusionar | Lista "Por verificar" ordenada por confirmaciones, con botones Verificar / Corregir / Fusionar |
| **Fusionar duplicados** (mismo producto con dos códigos, nombres distintos) | No existe | Comparador lado a lado |
| ✅ Cargar la **semilla de productos** (200 a 500 por rubro) con foto de estudio | Hecho: "Importar Excel" en `/admin/catalogo` (upsert por código de barras, fuente `importado`). **Falta:** generación de fotos con Nano Banana por lote | Importador Excel del catálogo (reutiliza `importacionProductos`) + generación de fotos con Nano Banana por lote |
| ✅ Subir y reemplazar **fotos de estudio** del catálogo | Hecho: "Subir foto de estudio" en `/admin/catalogo` (bucket `catalogo`, `productos/<código>.<ext>`). **Falta:** "Generar con IA" (botón en "Próximamente": la función `producto-ia` solo acepta rutas del bucket privado `productos` de un negocio) | Galería con "Generar con IA", "Subir" y "Aprobar" |
| Mantener la **taxonomía de categorías** | `src/constants/rubros.js` (los campos por rubro) | Editor de categorías y de campos por rubro |
| Decidir el uso de **Open Food Facts** (licencia ODbL) | Decisión pendiente | — (legal) |
| Revisar los aportes sospechosos (ej. un mismo negocio con nombres raros) | `catalogo_aportes`, solo SQL | Vista de aportes por fecha, sin exponer a los negocios a otros clientes |

| Cargar y mantener las **alícuotas de retención municipal por municipio** (ordenanzas de cada alcaldía) | No existe (ver `auditoria/retenciones-municipales-2026-10-15.md`) | Editor del catálogo municipal con fuente y fecha de la ordenanza |

## 2. Legal y textos
- Términos de uso: mencionar el **catálogo compartido** (qué se comparte y qué nunca), la **API** y el uso de **IA** (fotos, OCR, chat).
- Política de privacidad: datos que se mandan a Gemini, retención de fotos, consentimiento para mejorar la IA (`estrategia/ia-vectorial-y-documentacion.md` §4).
- Herramienta futura: editor de documentos legales con versión y fecha de vigencia, y registro de aceptación por usuario.

## 3. IA (costos, calidad y configuración)
| Tarea | Hoy | Herramienta futura |
|---|---|---|
| ✅ Vigilar **costo y errores de IA** (OCR, identificar, estante, Nano Banana) | Hecho: `/admin/uso-ia` (llamadas por día, % de error, tokens, costo, por modelo y top de errores; sin nombres ni correos). **Falta:** uso por negocio | Tablero: uso por día y por negocio, costo estimado, tasa de error y top de códigos de error |
| Cambiar el **modelo** activo y la llave | `ai_provider_profiles` (Ajustes de IA ya existe) | Ya existe en parte: sumar la prueba de conexión y el modelo de imágenes (`PRODUCTO_IMAGEN_MODEL`) |
| Fijar **límites por plan** (cuántas fotos IA o mejoras al mes) | No existe | Topes por plan + aviso al cliente cuando se acerca |
| Revisar las respuestas del chat calificadas 👎 y corregirlas (materia prima del afinamiento) | No existe | Bandeja de revisión de chats con corrección del contador |
| Mantener la **ayuda pública** y la documentación de la API que lee la IA | Pendiente (fase final) | Editor de artículos de ayuda + reindexado |

### Uso de IA por cliente (pedido del 2026-10-15)
| Tarea | Hoy | Herramienta futura |
|---|---|---|
| Llevar y limitar el uso de IA **por negocio** (créditos por plan, extras, tarifas por función) | `ai_usage_logs` no guarda el negocio ni la función | Tabla por negocio en Uso de IA + editor de tarifas y créditos extra (`diseno/uso-ia-por-cliente.md`) |

## 4. Datos y correcciones supervisadas
| Tarea | Hoy | Herramienta futura |
|---|---|---|
| Corregir **compras de mercancía sin movimiento de inventario** (bug corregido el 2026-10-14). **Hecho:** 3 compras de 2 negocios reales (28 productos, 78 unidades; movimientos con descripción "Corrección: …"). **Falta:** 2 compras de otro negocio con 4 líneas escritas sin producto (crearlo o elegirlo a mano), y las 4 de la cuenta de prueba (no se tocaron porque tienen ajustes manuales) | `scripts/reprocesar-compras-sin-inventario.sql` | "Reprocesar inventario de esta factura" con vista previa antes → después |
| Revisar **proveedores con RIF inventado** (`PROV-…`) creados por la sincronización antigua | SQL | Lista de proveedores con datos dudosos, con Fusionar / Corregir |
| Revisar clientes duplicados de la migración (mismo cliente con y sin RIF) | `clientes_negocio`, SQL | Fusionar clientes |
| Mover empresas autorregistradas cuando haya más de un despacho | Pendiente desde el 2026-10-13 | Transferir empresa entre despachos, con consentimiento |

## 5. Operación
- ✅ **Tasas globales:** `/admin/tasas` muestra los últimos 60 días hábiles (USD, EUR, CNY, TRY, RUB) con su fuente, marca los días sin tasa y permite corregir o agregar una (fuente `MANUAL-SUPERADMIN`).
- ✅ **Portada de Operación:** `/admin/operacion` resume lo por verificar, los errores de IA de la semana y los días sin tasa.
- Activar el **cron de avisos de vencimiento** (`avisos-vencimiento`) al lanzar.
- Vigilar las **llaves de API** (uso, abusos, revocar). Hoy en `api_keys`. A futuro: vista de llaves por negocio con último uso y volumen, y un botón Revocar.
- Revisar el historial de **importaciones** (`importaciones_productos`) cuando un cliente reporte un problema. A futuro: vista por negocio con "Deshacer" asistido.
- **Pagos de suscripción:** el flujo de aprobación ya existe en el panel; sumar recordatorios y reportes.
- Seguridad: activar "Leaked password protection" en Supabase Auth (aviso del linter) y mover `pg_net` fuera del esquema `public`.

## 6. Pendientes del usuario fuera del sistema
- Poner privado el repositorio de GitHub.
- Quitar `VITE_DEEPSEEK_*` y `VITE_NVIDIA_*` de Netlify y del `.env`.
- Probar en un teléfono real (Foto y listo, estante, importación).
