# IA con contexto: documentación pública + búsqueda vectorial (pgvector)

Fecha: 2026-10-14. Pedidos del usuario:
- Al final de la ola de productos, escribir un **apartado público de documentación del sistema** y la **documentación de la API**, de modo que la IA del chat pueda leerlos para ayudar a los clientes.
- Activar bases de datos vectoriales para la IA. El usuario pegó una guía generada por Gemini y pidió tomarla como referencia, **no al pie de la letra**.

## 1. Qué tomamos de la guía y qué cambiamos
| Guía (Gemini) | Decisión AD System | Por qué |
|---|---|---|
| `create extension vector` | Sí, pero en el esquema `extensions` (`create extension if not exists vector with schema extensions`) | Lo exige el linter de Supabase; no ensucia `public`. |
| Embeddings de OpenAI, `vector(1536)` | **Gemini `gemini-embedding-001`** con `outputDimensionality: 768` → `vector(768)` | Ya usamos Gemini (perfil de IA activo). Una sola llave y una sola factura. 768 dimensiones bastan para textos cortos en español y pesan la mitad. |
| Tabla `documentos` sin dueño | `conocimiento_ia` con `ambito` (`publico` / `cliente`), `client_id`, `organization_id`, `fuente`, `titulo`, `url`, `contenido`, `hash`, `embedding` y RLS | Multiinquilino: un cliente nunca puede recuperar los datos de otro. Lo público lo ve cualquiera. |
| Insertar a mano | Edge Function `indexar-conocimiento`: parte los textos en trozos de unas 300–500 palabras, calcula el embedding y hace upsert por `hash`. Así solo se recalcula lo que cambió. | Barato e idempotente. |
| `select … order by embedding <=> …` desde el cliente | RPC `buscar_conocimiento(query_embedding, k, ambito)` con `security invoker` (respeta RLS), llamada **desde la Edge Function del chat**, no desde el navegador | La pregunta se convierte en embedding en el servidor (la llave no va al navegador). |
| Índice HNSW siempre | HNSW `vector_cosine_ops`, pero **solo cuando haya más de unos 5 mil trozos**. Antes, la búsqueda secuencial es instantánea. | Evita el costo de mantener un índice que todavía no hace falta. |
| Atribuciones de FK | **Sin FK a users ni organizations** (solo a clients, como en las demás tablas nuevas) | Regla del incidente del login del 2026-10-13. |

## 2. Fases
1. **Documentación pública (al cerrar la ola de productos).**
   - Una sección **/ayuda** pública en la app: guías cortas por pantalla (Mis movimientos, Mis papeles, Mi mercancía, Foto y listo, Foto del estante, Importar Excel, ¿Cómo voy?, Mi plan), en lenguaje llano y con capturas.
   - **/ayuda/api**: referencia de `api-productos` (autenticación con `x-api-key`, GET/POST, campos, errores, límites y ejemplos con curl y JavaScript).
   - Fuente única: archivos Markdown en `docs/ayuda/*.md` que la app renderiza y que se indexan para la IA.
2. **Contexto para el chat, v0 (sin vectores).** Con menos de unas 30 páginas, la ayuda completa cabe en el contexto de Gemini. El chat la recibe entera y cita la guía. Es lo más rápido para lanzar.
3. **pgvector, v1.** Cuando la ayuda crezca o se sumen datos del cliente (resúmenes de sus movimientos, productos, papeles), se pasa a `conocimiento_ia` + `buscar_conocimiento`. Se recuperan unos 6 trozos y se citan.
4. **v2, insights.** Embeddings de productos y movimientos para preguntas como "¿qué se vende menos?" o "productos parecidos". Solo se agregan cuando hay un caso de uso medido.

## 3. Pendientes técnicos al implementar v1
- Verificar que pgvector esté disponible en el proyecto (`list_extensions`).
- Confirmar el nombre y las dimensiones del modelo de embeddings vigente en la documentación de Gemini, en ese momento.
- Registrar el costo en `ai_usage_logs` (tokens de embeddings).
