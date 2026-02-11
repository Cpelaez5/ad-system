export const FISCAL_TYPES = {
    'LEGAL': [
        { id: 'DOCUMENTO_CONSTITUTIVO', label: 'Documento Constitutivo', frequency: 'VIGENTE', required: true },
        { id: 'RIF', label: 'RIF', frequency: 'VIGENTE', required: true },
        { id: 'PUBLICACION_MERCANTIL', label: 'Publicación Mercantil', frequency: 'PERMANENT', required: true },
        { id: 'ACTA_ASAMBLEA', label: 'Acta de Asamblea', frequency: 'PERMANENT', required: false },
        { id: 'CEDULA_SOCIOS', label: 'Cédula de Socios', frequency: 'VIGENTE', required: true },
        { id: 'RIF_SOCIOS', label: 'RIF de Socios', frequency: 'VIGENTE', required: true },
    ],
    'MUNICIPAL': [
        { id: 'CONFORMIDAD_USO', label: 'Conformidad de Uso', frequency: 'PERMANENT', required: true },
        { id: 'CONFORMIDAD_BOMBEROS', label: 'Conformidad de Bomberos', frequency: 'VIGENTE', required: true }, // 6 meses o 1 año según documento
        { id: 'PERMISO_SANITARIO', label: 'Permiso Sanitario', frequency: 'ANNUAL', required: false }, // Solo si vende alimentos
        { id: 'PUBLICIDAD', label: 'Publicidad y Propaganda', frequency: 'SEMESTRAL', required: true },
        { id: 'SOLVENCIA_INMUEBLE', label: 'Solvencia de Inmueble', frequency: 'VIGENTE', required: true }, // Trimestral, semestral o anual según pago
        { id: 'ARRENDAMIENTO', label: 'Contrato de Arrendamiento o Documento de Propiedad', frequency: 'VIGENTE', required: true }, // Vencimiento según contrato
        { id: 'LICENCIA_AE', label: 'Licencia de Actividad Económica', frequency: 'ANNUAL', required: true },
        { id: 'INGRESOS_BRUTOS', label: 'Declaración y Pago de Ingresos Brutos Mensual', frequency: 'MONTHLY', required: true },
        { id: 'RETENCION_MUNICIPAL', label: 'Declaración de Retención Municipal', frequency: 'MONTHLY', required: false }, // Solo contribuyente especial
    ],
    'SENIAT': [
        { id: 'IVA', label: 'Declaración de Impuesto al Valor Agregado (IVA)', frequency: 'MONTHLY', required: true },
        { id: 'RETENCION_ISLR', label: 'Declaración de Retención ISLR', frequency: 'MONTHLY', required: true },
        { id: 'PENSIONES', label: 'Protección de Pensiones', frequency: 'MONTHLY', required: true },
        { id: 'ISLR_ANUAL', label: 'Declaración ISLR Anual', frequency: 'ANNUAL', required: true },
        { id: 'ISLR_ESTIMADA', label: 'Declaración Estimada ISLR (Jun-Jul)', frequency: 'ANNUAL', required: true },
        { id: 'RETENCION_IVA', label: 'Declaración Retención IVA', frequency: 'QUINCENAL', required: true },
        { id: 'ANTICIPO_ISLR', label: 'Anticipo ISLR', frequency: 'QUINCENAL', required: false },
        { id: 'IGTF', label: 'IGTF', frequency: 'QUINCENAL', required: true },
        { id: 'IGP', label: 'Impuesto a los Grandes Patrimonios (Oct-Nov)', frequency: 'ANNUAL', required: false },
    ],
    'NOMINA': [
        { id: 'IVSS', label: 'IVSS', frequency: 'MONTHLY', required: true },
        { id: 'INCES', label: 'INCES', frequency: 'QUARTERLY', required: true },
        { id: 'BANAVIH', label: 'BANAVIH', frequency: 'MONTHLY', required: true },
        { id: 'MINTRAPP', label: 'MINTRAPP', frequency: 'QUARTERLY', required: true },
        { id: 'RUPDAE', label: 'RUPDAE', frequency: 'ANNUAL', required: true },
        { id: 'FONACIT', label: 'FONACIT', frequency: 'ANNUAL', required: false },
        { id: 'OTROS_PARAFISCALES', label: 'Otros Parafiscales', frequency: 'AdHoc', required: false },
    ],
    'OTROS': [
        { id: 'OTRO', label: 'Otro Documento', frequency: 'AdHoc', required: false }
    ]
}

export const FREQUENCIES = {
    PERMANENT: 'Permanente',
    VIGENTE: 'Vigente (vencimiento variable)',
    ANNUAL: 'Anual',
    SEMESTRAL: 'Semestral',
    QUARTERLY: 'Trimestral',
    MONTHLY: 'Mensual',
    QUINCENAL: 'Quincenal',
    AdHoc: 'Eventual'
}

// Helper: determina si una frecuencia es recurrente (necesita filtro por período)
export const isRecurringFrequency = (frequency) => {
    return ['MONTHLY', 'QUARTERLY', 'QUINCENAL', 'SEMESTRAL'].includes(frequency)
}

// Meses del año para el selector de período
export const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

/**
 * Calcula información de vencimiento para un documento.
 * Retorna objeto con: color, icon, label, daysRemaining
 *
 * Colores según tiempo restante:
 * - Gris: queda muchísimo tiempo (> 1 año)
 * - Verde: recién emitido / bastante tiempo (90 días - 1 año)
 * - Naranja: se acerca (30 - 90 días)
 * - Rojo: urgente (< 30 días o ya vencido)
 */
export const getExpirationInfo = (expirationDateStr) => {
    if (!expirationDateStr) {
        return { color: 'grey', icon: 'mdi-help-circle-outline', label: 'Sin fecha de vencimiento', daysRemaining: null }
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const expDate = new Date(expirationDateStr + 'T00:00:00')
    const diffMs = expDate - now
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    // Ya vencido
    if (daysRemaining < 0) {
        const daysAgo = Math.abs(daysRemaining)
        let label = ''
        if (daysAgo === 1) label = 'Venció ayer'
        else if (daysAgo < 30) label = `Venció hace ${daysAgo} días`
        else if (daysAgo < 365) label = `Venció hace ${Math.floor(daysAgo / 30)} meses`
        else label = `Venció hace ${Math.floor(daysAgo / 365)} años`
        return { color: 'error', icon: 'mdi-alert-circle', label, daysRemaining }
    }

    // Vence hoy
    if (daysRemaining === 0) {
        return { color: 'error', icon: 'mdi-alert-circle', label: '¡Vence hoy!', daysRemaining }
    }

    // Menos de 30 días — Rojo
    if (daysRemaining <= 30) {
        const label = daysRemaining === 1 ? 'Vence mañana' : `Vence en ${daysRemaining} días`
        return { color: 'error', icon: 'mdi-clock-alert-outline', label, daysRemaining }
    }

    // 30 a 90 días — Naranja
    if (daysRemaining <= 90) {
        const months = Math.floor(daysRemaining / 30)
        const label = months <= 1 ? `Vence en ${daysRemaining} días` : `Vence en ${months} meses`
        return { color: 'warning', icon: 'mdi-clock-outline', label, daysRemaining }
    }

    // 90 días a 1 año — Verde
    if (daysRemaining <= 365) {
        const months = Math.floor(daysRemaining / 30)
        const label = `Vence en ${months} meses`
        return { color: 'success', icon: 'mdi-check-circle-outline', label, daysRemaining }
    }

    // Más de 1 año — Gris
    const years = Math.floor(daysRemaining / 365)
    const remainingMonths = Math.floor((daysRemaining % 365) / 30)
    let label = `Vence en ${years} año${years > 1 ? 's' : ''}`
    if (remainingMonths > 0) label += ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`
    return { color: 'grey', icon: 'mdi-calendar-check', label, daysRemaining }
}
