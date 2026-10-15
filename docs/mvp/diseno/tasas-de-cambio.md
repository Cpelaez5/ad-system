# Tasas de cambio: automáticas o definidas por el cliente

Fecha: 2026-10-14. Pedido del usuario:

> Toma en cuenta todas las monedas que maneja el sistema, pero recuerda que el cliente debe decidir si quiere usar esas tasas automáticas que le damos, o si él quiere definir una manualmente, pero la deberá cambiar manualmente. Esto es porque, como estamos usando un servicio de terceros, no le podemos dar certeza 100% de que esas tasas siempre funcionen.

Antes estaba en el roadmap como "tasa definida por el cliente, de último".

## Situación actual (verificada)
- Monedas en las facturas: VES (96), USD (13), **CNY (6, por OCR de Amazon/Alibaba)** y 3 sin moneda (se tratan como VES). El formulario solo ofrece VES, USD y EUR.
- **Cada factura ya guarda su tasa del día de registro:** `financial.exchangeRate` (Bs por USD) y `financial.exchangeRateEur`. 114 facturas la tienen.
- La tasa del día viene de la Edge Function `bcv-proxy` (un tercero basado en el BCV), con caché local y respaldo en la tabla `exchange_rates`. Trae dólar, euro, yuan, lira y rublo.
- Los totales (Mis movimientos, ¿Cómo voy?, Mis clientes, proveedores) convierten con la tasa **de hoy** y dejan fuera el EUR y el CNY: es impreciso para el historial.

## Monedas soportadas
Las del BCV: **VES, USD, EUR, CNY, TRY, RUB**. El formulario de registro ofrece VES, USD y EUR a la vista y "Otra moneda" (CNY, TRY, RUB) en un menú. Todas se guardan con su tasa en Bs.

## Reglas de conversión (una sola función para todo el sistema)
`src/utils/monedas.js` → `convertir(monto, de, a, tasas)`, donde `tasas` = Bs por unidad de cada moneda (`{ USD, EUR, CNY, TRY, RUB }`; VES = 1).
1. **Una factura se convierte con SU tasa guardada** (la del día en que se registró). Así los totales históricos no cambian cada día y coinciden con lo declarado.
2. Si la factura no tiene la tasa de su moneda, se usa la **tasa vigente** del negocio (ver abajo) y el total se marca como aproximado.
3. Si no hay ninguna tasa, el monto **no se inventa**: queda fuera del total y la pantalla dice "N facturas sin tasa" con un enlace para corregirlas.
4. Al registrar, la factura guarda `financial.tasas = { USD, EUR, ... }` (todas las del día) además de los campos actuales. Así se puede convertir a cualquier moneda después.

## Tasa vigente: automática o manual (decisión del cliente)
- Se guarda en `clients`: `tasa_modo` ('automatica' | 'manual', por defecto 'automatica'), `tasas_manuales` (jsonb `{ "USD": { "tasa": 877.9, "fecha": "2026-10-14" }, ... }`) y `tasa_aviso_aceptado_en` (fecha en que aceptó el aviso del servicio de terceros).
- **Automática:** la del servicio. Si falla o tiene más de un día hábil, aparece el aviso "No pudimos actualizar la tasa del BCV. Puedes escribirla tú", con un acceso rápido a ponerla manual.
- **Manual:** el cliente escribe la tasa de cada moneda que use. **Nunca se actualiza sola.** Cuando tiene más de 1 día, la barra superior lo recuerda ("Tu tasa del dólar es del 10/10 · Actualizar"), sin bloquear nada.
- **Dónde se configura:** Mi negocio → **"Tasa de cambio"**, con dos opciones grandes:
  - "Automática (BCV): la buscamos por ti cada día";
  - "La defino yo: la cambias tú cuando quieras".

  Debajo, el texto: "Las tasas automáticas vienen de un servicio externo basado en el BCV. Pueden fallar o llegar con retraso. Revísalas antes de declarar." También se puede llegar desde los chips de tasa de la barra superior, tocándolos.
- **Barra superior:** los chips muestran la tasa vigente y una marca "Manual" si aplica. Se ven en ámbar si la tasa manual tiene más de 1 día, o si la automática falló y se está usando la última conocida.
- **En el registro de una factura:** la tasa se prellena con la vigente y siempre se puede editar para esa factura (la de la factura real puede ser otra, por ejemplo la del día de emisión).

## Agregado el 2026-10-15 (pedidos del usuario)
- **Historial de tasas manuales:** tabla `tasas_historial`, con una fila por moneda y por día. Se guarda en cada cambio y se consulta en Mi negocio → Tasa de cambio → "Historial de tus tasas". Cada factura guarda además su propia tasa.
- **Acceso rápido desde la barra superior:** al tocar los chips de la tasa, el cliente abre `TasaRapida.vue`. Ahí cambia entre Automática y La defino yo, escribe las tasas del día (acepta "879,12") y puede copiar la del BCV como punto de partida. Los otros roles siguen refrescando la tasa al tocar.
- **Recordatorio:** en modo manual, **de lunes a viernes**, si la tasa no es de hoy, aparece un chip ámbar "Actualiza tu tasa" en la barra (también en el teléfono), que abre el acceso rápido.
- **Base global de tasas:** `exchange_rates` (fecha, moneda, tasa, fuente), con USD, EUR, CNY, TRY y RUB. La Edge Function `tasas-diarias` la llena con pg_cron de **lunes a viernes, a las 10:00 y a las 18:00 (Caracas)**. Antes solo se llenaba cuando alguien abría la app, y en los últimos 30 días faltaban 11 días hábiles.

## Fuera de alcance
- Tasas de mercado paralelo (no oficial).
- Conversión automática del IGTF.
