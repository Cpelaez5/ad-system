# Catálogo global de proveedores y productos

Fecha: 2026-10-14. Pedido del usuario: "globalizar a los proveedores y los productos… para tener una base de datos, ya que lo más probable es que haya proveedores recurrentes, al igual que productos, de los cuales ya podríamos tener imágenes definidas y otros datos, al igual que categorización".

## Idea
Hoy, cada negocio escribe desde cero a "Distribuidora Polar, J-…" y a la "Harina PAN 1 kg". Con un **catálogo global**, compartido por todos los negocios de AD System, el segundo negocio que escribe el RIF o escanea el código de barras recibe los datos ya llenos: razón social, nombre, marca, categoría, presentación y una foto de estudio.

Es un **efecto de red**: cada cliente nuevo hace el sistema mejor para todos, y Fina y Norkut no lo tienen. Suma al diferencial D3, "Tan fácil que lo usa cualquiera".

## Reglas de privacidad (no negociables)
Se comparten datos **entre empresas**, así que el catálogo solo guarda **datos públicos o de producto**, nunca datos de la relación comercial:

| Se comparte | NUNCA se comparte |
|---|---|
| Proveedor **persona jurídica o gobierno** (RIF J-, G-, C-): razón social, RIF, domicilio fiscal, si es contribuyente especial y su actividad | Personas naturales (RIF V-, E-, P-): sus datos son personales |
| Producto **identificado por su código de barras**: nombre, marca, categoría, presentación, unidad, atributos del rubro sin precio y foto de estudio | Precios, costos, existencias, márgenes |
| Cuántos negocios confirmaron el dato (un número) | **Quién** compra a quién, quién vende qué, retenciones, contactos (teléfono o correo del vendedor), notas |

- **Fotos:** al catálogo solo pasan fotos **de estudio** (las generadas con IA o subidas por el equipo de AD System). Nunca la foto original de un cliente, que puede mostrar su local o a personas. Además, el negocio debe tener activo "Compartir fotos de estudio con el catálogo de AD System" en Mi negocio, desactivado por defecto.
- Los Términos de uso deben mencionar el catálogo compartido. **Pendiente legal del usuario.**
- El catálogo es **una sugerencia**: el negocio siempre puede editar su copia. Los cambios de un negocio no alteran lo que ven los demás hasta que el dato sume confirmaciones.

## Modelo de datos (migración aditiva, sin FK a `users` ni a `organizations`)
- `catalogo_proveedores`: `id`, `rif_normalizado` (único), `rif`, `razon_social`, `nombre_comercial`, `tipo_persona` (solo `juridica`/`gobierno`), `domicilio_fiscal`, `es_contribuyente_especial`, `actividad`, `confirmaciones`, `verificado` (lo revisó el super admin), `fuente` (`aporte`/`equipo`/`importado`), `created_at`, `updated_at`.
- `catalogo_productos`: `id`, `codigo_barras` (único, solo EAN-8, EAN-13 o UPC válidos, con dígito verificador), `nombre`, `marca`, `categoria` (de la taxonomía), `presentacion`, `unidad`, `atributos` (sin precios), `foto_path` (bucket **público** `catalogo`), `confirmaciones`, `verificado`, `fuente`, fechas e índice trigram en `nombre`.
- `catalogo_aportes`: `(catalogo, clave, client_id)` único. Cuenta las confirmaciones de negocios **distintos** sin exponer quiénes. Solo el super admin puede leerla.
- `categorias_catalogo`: taxonomía estándar de 2 niveles (Víveres > Harinas; Limpieza > Detergentes…), alineada con los rubros de `src/constants/rubros.js`. La IA de fotos e importación clasifica contra esta lista.
- **RLS:** cualquier usuario autenticado **lee** el catálogo; **nadie escribe directo**. Los aportes entran por triggers `security definer` sobre `proveedores` e `inventory_products`, que copian **solo** los campos permitidos. El super admin edita y verifica desde su panel.
- Requiere las extensiones `pg_trgm` y `unaccent` (están disponibles y sin instalar) para buscar por nombre aproximado.

## Cómo se usa (sin que el cliente note la complejidad)
1. **Nuevo proveedor:** al escribir el RIF, si existe en el catálogo, se llena la razón social y el domicilio con la marca "Datos verificados por AD System" (o "Confirmado por N negocios"). La retención de IVA, el concepto ISLR y el municipio siguen siendo configuración **propia** del negocio.
2. **Registro de compra por foto (OCR):** el RIF leído se busca primero en los proveedores del negocio y después en el catálogo global, para crearlo ya completo.
3. **Mi mercancía, "Foto y listo":** si la IA lee un código de barras, o la persona lo escanea, y existe en el catálogo, se llenan nombre, marca, categoría y foto de estudio sin esperar a la IA (instantáneo y gratis). Si no hay código, se busca por nombre parecido y se ofrece "¿Es este? Harina PAN 1 kg".
4. **Importar Excel:** las filas con código de barras se completan con el catálogo: foto, categoría y marca.
5. **Aportar:** al guardar un proveedor jurídico o un producto con código de barras, un trigger suma la confirmación. Con 3 o más negocios distintos que coinciden, el dato se considera confiable, y los datos verificados por el super admin pesan más.

## Semilla inicial
- **Proveedores:** los 30 aportes actuales que cumplen las reglas (23 J- y 2 G- en la BD de hoy) y una lista curada de distribuidoras grandes de Venezuela que cargue el equipo.
- **Productos:** carga curada por el equipo de los 200 a 500 productos más comunes por rubro (víveres, farmacia, ferretería), con foto de estudio generada con IA. Open Food Facts tiene datos de Venezuela, pero su licencia ODbL obliga a citar la fuente y a compartir bajo la misma licencia: se puede usar como referencia o consulta, **no copiar la base**, sin revisión legal.

## Fases
1. **v1 (esta ola):** tablas, RLS, triggers de aporte, búsqueda (RPC `buscar_catalogo_proveedor(rif)` y `buscar_catalogo_producto(codigo_barras | texto)`), autocompletado en Nuevo proveedor y en Foto y listo, y semilla desde los datos actuales.
2. **v2:** panel del super admin (verificar, fusionar duplicados, subir fotos de estudio), escáner de código de barras con la cámara y enriquecimiento de la importación.
3. **v3:** embeddings (pgvector, ver `estrategia/ia-vectorial-y-documentacion.md`) para "productos parecidos" y para clasificar mejor.
