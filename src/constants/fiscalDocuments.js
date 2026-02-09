export const FISCAL_TYPES = {
    'LEGAL': [
        { id: 'ACTA_CONSTITUTIVA', label: 'Acta Constitutiva', frequency: 'PERMANENT', required: true },
        { id: 'RIF', label: 'RIF', frequency: 'VIGENTE', required: true },
        { id: 'PUBLICACION_MERCANTIL', label: 'Publicación Mercantil', frequency: 'PERMANENT', required: true },
        { id: 'ACTA_ASAMBLEA', label: 'Acta de Asamblea', frequency: 'PERMANENT', required: false },
        { id: 'CEDULA_SOCIOS', label: 'Cédula de Socios', frequency: 'VIGENTE', required: true },
        { id: 'RIF_SOCIOS', label: 'RIF de Socios', frequency: 'VIGENTE', required: true },
    ],
    'MUNICIPAL': [
        { id: 'CONFORMIDAD_USO', label: 'Conformidad de Uso', frequency: 'PERMANENT', required: true },
        { id: 'CONFORMIDAD_BOMBEROS', label: 'Conformidad de Bomberos', frequency: 'ANNUAL', required: true },
        { id: 'PERMISO_SANITARIO', label: 'Permiso Sanitario', frequency: 'ANNUAL', required: false }, // Depende Actividad
        { id: 'PUBLICIDAD', label: 'Publicidad y Propaganda (Semestral)', frequency: 'SEMESTRAL', required: true },
        { id: 'SOLVENCIA_INMUEBLE', label: 'Solvencia de Inmueble', frequency: 'ANNUAL', required: true },
        { id: 'ARRENDAMIENTO', label: 'Contrato Arrendamiento / Propiedad', frequency: 'VIGENTE', required: true },
        { id: 'LICENCIA_AE', label: 'Licencia Actividad Económica', frequency: 'ANNUAL', required: true },
        { id: 'INGRESOS_BRUTOS', label: 'Declaración Ingresos Brutos', frequency: 'MONTHLY', required: true },
        { id: 'RETENCION_MUNICIPAL', label: 'Declaración Retención Municipal', frequency: 'MONTHLY', required: false }, // Contribuyente especial
    ],
    'SENIAT': [
        { id: 'IVA', label: 'Declaración IVA', frequency: 'MONTHLY', required: true },
        { id: 'RETENCION_ISLR', label: 'Declaración Retención ISLR', frequency: 'MONTHLY', required: true },
        { id: 'ISLR_ANUAL', label: 'Declaración ISLR Anual', frequency: 'ANNUAL', required: true },
        { id: 'ISLR_ESTIMADA', label: 'Declaración Estimada ISLR (Jun-Jul)', frequency: 'ANNUAL', required: true },
        { id: 'PENSIONES', label: 'Declaración de Pensiones', frequency: 'MONTHLY', required: true }, // IGTF es quincenal por defecto creo? Pensiones es ??
        { id: 'RETENCION_IVA', label: 'Declaración Retención IVA', frequency: 'QUINCENAL', required: true }, // Quincenal? Usualmente quincenal
        { id: 'ANTICIPO_ISLR', label: 'Anticipo ISLR', frequency: 'MONTHLY', required: false },
        { id: 'IGTF', label: 'IGTF', frequency: 'QUINCENAL', required: true },
        { id: 'IGP', label: 'Impuesto Grandes Patrimonios (Oct-Nov)', frequency: 'ANNUAL', required: false },
    ],
    'NOMINA': [
        { id: 'IVSS', label: 'IVSS', frequency: 'MONTHLY', required: true }, // Solvencia o Pago?
        { id: 'INCES', label: 'INCES', frequency: 'QUARTERLY', required: true },
        { id: 'BANAVIH', label: 'BANAVIH', frequency: 'MONTHLY', required: true },
        { id: 'MINTRAPP', label: 'MINTRAPP (Nil)', frequency: 'QUARTERLY', required: true },
        { id: 'RUPDAE', label: 'RUPDAE', frequency: 'PERMANENT', required: true },
        { id: 'FONACIT', label: 'FONACIT', frequency: 'ANNUAL', required: false },
        { id: 'OTROS', label: 'Otros Parafiscales', frequency: 'AdHoc', required: false },
    ],
    'OTROS': [
        { id: 'OTRO', label: 'Otro Documento', frequency: 'AdHoc', required: false }
    ]
}

export const FREQUENCIES = {
    PERMANENT: 'Permanente',
    VIGENTE: 'Vigente', // Se renueva pero no tiene periodo fijo anual/mensual estricto
    ANNUAL: 'Anual',
    SEMESTRAL: 'Semestral',
    QUARTERLY: 'Trimestral',
    MONTHLY: 'Mensual',
    QUINCENAL: 'Quincenal',
    AdHoc: 'Eventual'
}
