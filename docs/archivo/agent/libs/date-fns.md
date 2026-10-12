# 📅 date-fns - Cheat Sheet

> Manipulación de fechas en JavaScript

---

## Importación

```javascript
// Importar funciones individuales (tree-shaking)
import { format, parseISO, addDays, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
```

---

## Formatear Fechas

```javascript
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const fecha = new Date()

// Formatos comunes
format(fecha, 'dd/MM/yyyy')           // 08/02/2026
format(fecha, 'dd-MM-yyyy')           // 08-02-2026
format(fecha, 'yyyy-MM-dd')           // 2026-02-08 (ISO)
format(fecha, 'dd/MM/yyyy HH:mm')     // 08/02/2026 22:38
format(fecha, 'EEEE, d MMMM yyyy', { locale: es })  
// domingo, 8 febrero 2026

// Desde string ISO
const fechaDB = parseISO('2026-02-08T22:38:06')
format(fechaDB, 'dd/MM/yyyy')  // 08/02/2026
```

---

## Manipular Fechas

```javascript
import { 
  addDays, subDays, 
  addMonths, subMonths,
  addYears, subYears,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear
} from 'date-fns'

const hoy = new Date()

addDays(hoy, 30)        // 30 días después
subDays(hoy, 7)         // 7 días antes
addMonths(hoy, 1)       // 1 mes después
subMonths(hoy, 1)       // 1 mes antes

startOfMonth(hoy)       // Primer día del mes
endOfMonth(hoy)         // Último día del mes
startOfYear(hoy)        // 1 enero
endOfYear(hoy)          // 31 diciembre
```

---

## Comparar Fechas

```javascript
import { 
  differenceInDays,
  differenceInMonths,
  isBefore, isAfter, isEqual,
  isPast, isFuture, isToday
} from 'date-fns'

const fecha1 = new Date('2026-02-01')
const fecha2 = new Date('2026-02-15')

differenceInDays(fecha2, fecha1)    // 14
differenceInMonths(fecha2, fecha1)  // 0

isBefore(fecha1, fecha2)  // true
isAfter(fecha1, fecha2)   // false

// Verificaciones útiles
isPast(fecha1)     // ¿Ya pasó?
isFuture(fecha2)   // ¿Es futuro?
isToday(new Date()) // true
```

---

## Validación

```javascript
import { isValid, parseISO } from 'date-fns'

isValid(new Date())           // true
isValid(new Date('invalid'))  // false

const fechaDB = parseISO('2026-02-08')
isValid(fechaDB)  // true
```

---

## Casos de Uso del Proyecto

### Vencimiento de Facturas
```javascript
import { addDays, format, isPast } from 'date-fns'

// Calcular fecha de vencimiento (+30 días)
const fechaEmision = parseISO(invoice.issue_date)
const fechaVencimiento = addDays(fechaEmision, 30)

// Formatear para mostrar
format(fechaVencimiento, 'dd/MM/yyyy')

// Verificar si está vencida
const estaVencida = isPast(fechaVencimiento) && invoice.status !== 'PAGADA'
```

### Filtrar por Período
```javascript
import { 
  startOfMonth, endOfMonth, 
  isWithinInterval, parseISO 
} from 'date-fns'

const inicioMes = startOfMonth(new Date())
const finMes = endOfMonth(new Date())

const facturasDelMes = invoices.filter(inv => {
  const fecha = parseISO(inv.issue_date)
  return isWithinInterval(fecha, { start: inicioMes, end: finMes })
})
```

### Texto Relativo
```javascript
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// "hace 3 días", "en 2 meses"
const textoRelativo = formatDistanceToNow(parseISO(invoice.created_at), {
  addSuffix: true,
  locale: es
})
// → "hace 3 días"
```

---

## Formatos Comunes

| Formato | Ejemplo |
|---------|---------|
| `dd/MM/yyyy` | 08/02/2026 |
| `yyyy-MM-dd` | 2026-02-08 |
| `dd MMM yyyy` | 08 feb 2026 |
| `EEEE` | domingo |
| `HH:mm` | 22:38 |
| `HH:mm:ss` | 22:38:06 |
