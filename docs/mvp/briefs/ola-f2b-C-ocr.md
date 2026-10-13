# Tarea C — OCR más inteligente en el registro simple

Contexto: el registro simple ("Gasté o compré algo" / "Vendí") usa `src/components/forms/client/SimpleInvoiceForm.vue` en modo `simple` + `src/services/registroService.js` + OCR (`src/services/clientOcrService.js`, `baseOcrService.js`, `gemini/geminiOcrService.js`). QA con 4 facturas reales: monto y fecha 4/4, **proveedor 2/4 (solo si el RIF ya existía), categoría 0/4**.

1. **Proveedor desde el RIF del OCR:** si el OCR trae un RIF/nombre que no existe entre los proveedores del cliente, prellena "¿A quién le pagaste?" con el nombre leído y una marca "Nuevo proveedor — se guardará al registrar". Al guardar el registro, crear el proveedor (nombre, RIF normalizado `J-12345678-9`, dirección si la trae) con el servicio de proveedores existente y enlazarlo. Si ya existe (mismo RIF normalizado), usarlo. Nada se crea si el usuario cancela. La normalización del RIF es una función pura con tests.
2. **Categoría sugerida:** función pura `sugerirCategoria({ proveedor, items, textoOcr, historial })` → `{ categoria, confianza, motivo }` usando las categorías que ya existen en el código. Orden: (a) última categoría usada con ese proveedor; (b) reglas por palabras clave (electricidad/CORPELEC, internet/telefonía, papelería/imprenta, comida, combustible, alquiler, compras en línea…); (c) si la IA del OCR devuelve categoría, mapearla. Prellenar "¿En qué?" con un chip "Sugerido"; el usuario puede cambiarla. Tests con casos tipo Corpelec, Inter, imprenta digital, Amazon.
3. **Ventas (C5):** si el registro es "Vendí" y el OCR trae ítems, cargarlos como líneas de la factura (descripción, cantidad, precio) dentro de "Ver detalles". No toques inventario (otra tarea).
4. Estado de carga del OCR con mensajes humanos que rotan ("Leyendo tu factura…", "Buscando el monto…", "Casi listo…") si aún no existe; respeta reduced-motion.
5. Pruebas: unitarias de las funciones puras y del formulario (mocks). Puedes correr `npx playwright test e2e/05-ocr.spec.js` (solo lectura; **no guardes** registros) y ampliarlo para verificar que el proveedor y la categoría quedan prellenados.

No toques las vistas Facturacion/Compras/Gastos/Ventas (agente A) ni Proveedores.vue (agente B). Si cambias un servicio compartido (proveedores), que sea mínimo y aditivo.

Informe: `docs/mvp/briefs/ola-f2b-C-informe.md`.
