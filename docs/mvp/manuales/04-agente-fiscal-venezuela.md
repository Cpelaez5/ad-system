# Manual 04 — Agente Fiscal Venezuela (transversal, foco en la Fase 2)

**Misión:** que cada número que muestra o exporta el sistema sea correcto según la normativa venezolana, y que la simplificación de la UX no rompa ningún cálculo. Es el **guardián** de los libros, las retenciones y los correlativos.
**Modelo sugerido:** Claude Sonnet. **Validadora humana: la contadora.** Toda regla nueva o dudosa se le pregunta.
**Lee:** `00-REGLAS-COMUNES.md`, `auditorias/audit-docs.md §3` (reglas fiscales), `GEMINI.md` (decisiones 10-17), `examples/Chat-Gemini-Cliente.txt` (manual de retenciones de la contadora), `examples/expediente-fiscal-360.md`, `examples/COMPLETAR.txt`.

## Reglas clave (resumen; el detalle está en las fuentes)
- **Retención IVA:** solo si la empresa compradora es **contribuyente especial**. 75% o 100% del IVA. Comprobante `AAAAMM` + secuencia de 8 dígitos; la tabla de 14 columnas usa la alícuota legal (16%) en "% Alíc.".
- **ISLR:** cualquier persona jurídica que pague conceptos del Decreto 1.808. PJ: % directo. PN: (base × %) − sustraendo (UT). Tabla `conceptos_islr`.
- **Municipal:** solo agentes designados por la alcaldía y solo si comprador y proveedor están en el **mismo municipio**. Alícuota según el clasificador de la alcaldía.
- **"No todas las empresas hacen retenciones"** (`COMPLETAR.txt`): el sistema debe saber si el cliente es agente de retención y, si no lo es, no mostrar ni calcular retenciones.
- Correlativos emitidos: **inmutables**. Las correcciones son idempotentes (`corregido_en`, `base_imponible_original`).
- Multi-moneda: la tasa BCV se aplica al guardar. En Cashea, cada cuota usa la tasa de su fecha.

## Tareas
- [x] **F1. Red de seguridad:** inventario de las funciones de cálculo (en `SimpleInvoiceForm.vue`, `src/services/*retenc*`, `invoiceService.js`, utils) y tests "golden" con casos reales de `examples/RET *.pdf` y de los modelos `.xls` (libro de compras, libro de ventas, retenciones). Sin datos personales en los fixtures.
- [ ] **F2. Extraer los cálculos** a módulos puros y testeables (`src/services/fiscal/iva.js`, `islr.js`, `municipal.js`, `libros.js`), junto con el agente de Limpieza (L2). Mismos resultados que antes, demostrado con F1.
- [ ] **F3. Perfil fiscal → reglas:** definir con la contadora los flags (`es_contribuyente_especial`, `es_agente_retencion_municipal`, `porcentaje_retencion_iva_defecto`, `tipo_persona`, `concepto_islr_defecto` en proveedores) y la lógica que activa u oculta cada módulo. Entregar la especificación al agente UX (U4) y al de BD.
- [ ] **F4. Auto-cálculo en el registro simple:** al elegir el proveedor, precargar el concepto ISLR y el % de IVA de su ficha; calcular el neto a pagar. El usuario solo confirma.
- [ ] **F5. Exportaciones:** verificar libro de compras y de ventas (Excel/PDF) contra los modelos de la contadora; TXT de retenciones IVA para el portal SENIAT y XML de ISLR (confirmar formatos vigentes con la contadora y documentar la fuente).
- [ ] **F6. Glosario:** redactar `src/constants/glosario.js` en lenguaje llano (≤2 líneas por término), aprobado por la contadora.
- [ ] **F7. Normativa 2025-2026:** confirmar con la contadora lo marcado como no verificado en `auditorias/competencia.md §4` (eliminación de la cartelera fiscal y de la homologación, cambios del IGTF, imprenta digital) y registrar las conclusiones en `docs/negocio/reglas-fiscales.md`.

**Aceptación:** tests golden en verde antes y después de cada cambio de UX; la contadora firma los PDFs y libros de ejemplo.
- [ ] **C6. ISLR persona natural en la vista previa:** `SimpleInvoiceForm.calcularRetenciones()` no resta el sustraendo (el RPC al guardar sí) y no carga `tipo_persona` del proveedor → lo mostrado difiere de lo guardado. Unificar con la regla del RPC.
- [ ] **C7. Municipal en la vista previa:** calcula sin verificar mismo municipio. Ver también W5 (`backlog-cliente-whatsapp.md`): la contadora pidió **advertir sin bloquear**; decisión del orquestador: advertencia visible + permitir, registrando la confirmación del usuario.
- [ ] **C8. Cashea multi-moneda:** las cuotas no tienen moneda/tasa propias (GEMINI.md lo exige). Agregar moneda y tasa por cuota con la tasa BCV de la fecha de pago.
