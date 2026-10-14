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

## 4. Modelo propio "fiscal y de soporte" (pedido del usuario 2026-10-14, para el final)
Pedido: entrenar un modelo de IA para el tema fiscal y de soporte, con los datos de los usuarios (excepto los privados), la documentación de la API y la del sistema.

**Recomendación: en escalones, no entrenar primero.**
1. **RAG (recuperación), escalones 2 y 3 de arriba.** La documentación del sistema, la de la API y las normas fiscales (IVA, ISLR, retenciones, calendario SENIAT, providencias) se indexan, y el modelo responde citándolas. Cuando cambia una norma o una pantalla, se actualiza **al instante**, sin reentrenar. Un modelo afinado, en cambio, "memoriza" reglas que el SENIAT cambia, y cada cambio exige reentrenarlo.
2. **Conjunto de entrenamiento curado, mientras se usa el chat.** Se guardan las preguntas reales con su respuesta y su calificación (👍/👎 y la corrección del contador). Esa es la materia prima valiosa y lo que ningún competidor tiene.
3. **Afinamiento (fine-tuning), cuando haya unos 1.000–5.000 pares buenos.** Sirve para el **tono y el formato**: lenguaje llano, pasos cortos, "tu siguiente paso". No sirve para los datos. Las opciones son el tuning supervisado de Gemini en Vertex AI o un modelo abierto (Gemma/Llama) afinado con LoRA, si se quiere independencia del proveedor. El conocimiento sigue llegando por RAG.

**Datos de los usuarios: reglas obligatorias**
- **Consentimiento explícito** en los Términos y en Mi negocio ("Ayuda a mejorar la IA de AD System"), desactivado por defecto o con opción clara de salir.
- **Nunca se usan:** documentos (Mis papeles), cédulas, RIF, nombres de personas, cuentas bancarias, fotos, montos exactos ligados a una empresa, ni los chats marcados como privados.
- **Sí se pueden usar, anonimizados y agregados:** preguntas y respuestas de soporte sin identificadores, patrones como "qué categorías usa una ferretería" o "qué dudas hay en la semana de declaración", y errores frecuentes de registro.
- Un paso de **anonimización automática** antes de guardar cualquier ejemplo: detección de RIF, cédulas, correos, teléfonos y nombres.
- Lo que sí puede usar el modelo en tiempo real son **los datos del propio cliente** que pregunta, por RAG con RLS, sin entrenar con ellos.

**Métrica para decidir el afinamiento:** un conjunto de 200 preguntas fiscales y de soporte con su respuesta correcta, revisado por un contador. Solo se afina si mejora a RAG puro en ese examen.
