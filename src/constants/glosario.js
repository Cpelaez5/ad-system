// BORRADOR — debe validarlo la contadora antes de producción.

const GLOSARIO = {
  iva: {
    termino: 'Impuesto al Valor Agregado',
    simple: 'Impuesto que pagamos todos',
    explicacion: 'Es un porcentaje extra que se cobra al vender o comprar. El gobierno se queda con esa plata.',
    ejemplo: 'Si vendes algo en $100, con el 16% de IVA cobras $116.'
  },
  base_imponible: {
    termino: 'Base Imponible',
    simple: 'Monto sin los impuestos',
    explicacion: 'Es el precio de tu producto antes de sumarle impuestos. Sobre este monto se calcula el IVA.',
    ejemplo: 'Si cobras $116 en total y $16 son de IVA, tu monto sin impuestos es $100.'
  },
  exento: {
    termino: 'Exento',
    simple: 'No paga impuesto',
    explicacion: 'Son productos o servicios que la ley dice que no pagan IVA. Por ejemplo, los alimentos básicos o medicinas.'
  },
  alicuota: {
    termino: 'Alícuota',
    simple: 'Porcentaje del impuesto',
    explicacion: 'Es el porcentaje que se usa para calcular un impuesto. Para el IVA casi siempre usamos la tasa general.'
  },
  retencion_iva: {
    termino: 'Retención de IVA',
    simple: 'Parte del impuesto retenido',
    explicacion: 'Tu cliente se queda con una parte del IVA y se lo paga al SENIAT por ti. Luego tú descuentas eso de tus pagos.'
  },
  retencion_islr: {
    termino: 'Retención de ISLR',
    simple: 'Adelanto de impuesto al SENIAT',
    explicacion: 'Tu cliente descuenta un porcentaje de tu pago para dárselo al gobierno. Funciona como un adelanto de tus impuestos del año.'
  },
  retencion_municipal: {
    termino: 'Retención Municipal',
    simple: 'Impuesto de la alcaldía',
    explicacion: 'Tu cliente guarda un porcentaje de la venta para pagarlo a la alcaldía. Solo aplica si ambos trabajan en el mismo municipio.'
  },
  contribuyente_especial: {
    termino: 'Contribuyente Especial',
    simple: 'Empresa vigilada por el SENIAT',
    explicacion: 'Es un negocio grande que el SENIAT nombró como especial. Ellos tienen la tarea obligatoria de retener impuestos a los demás.'
  },
  contribuyente_ordinario: {
    termino: 'Contribuyente Ordinario',
    simple: 'Negocio común',
    explicacion: 'Son la mayoría de los negocios y emprendedores. Cobran el IVA de forma normal y luego lo declaran.'
  },
  agente_de_retencion: {
    termino: 'Agente de Retención',
    simple: 'Quien retiene tus impuestos',
    explicacion: 'Es la persona o empresa obligada a quitarte una parte de tus impuestos para pagarlos al gobierno. Ellos hacen el trabajo de recolectores del SENIAT.'
  },
  comprobante_de_retencion: {
    termino: 'Comprobante de Retención',
    simple: 'Papel que prueba la retención',
    explicacion: 'Es el recibo que te da tu cliente cuando te retiene dinero. Lo necesitas guardar para demostrar que ese impuesto ya se pagó.'
  },
  numero_de_control: {
    termino: 'Número de Control',
    simple: 'Número del papel de imprenta',
    explicacion: 'Es el número que ya viene impreso de fábrica en tu talonario autorizado. Sirve para llevar un orden estricto de los papeles.'
  },
  numero_de_factura: {
    termino: 'Número de Factura',
    simple: 'Número de tu venta',
    explicacion: 'Es el número que le pones a la factura cuando se la entregas a un cliente. Debe ir siempre en orden sin saltarse ninguno.'
  },
  rif: {
    termino: 'Registro Único de Información Fiscal',
    simple: 'La cédula de tu negocio',
    explicacion: 'Es el número que te da el SENIAT para identificarte a ti o a tu empresa. Siempre empieza con alguna letra como la V o J.'
  },
  libro_de_compras: {
    termino: 'Libro de Compras',
    simple: 'Registro de tus gastos',
    explicacion: 'Es una lista obligatoria donde anotas todo lo que compraste para tu negocio. Ayuda a saber cuánto IVA pagaste en el mes.'
  },
  libro_de_ventas: {
    termino: 'Libro de Ventas',
    simple: 'Registro de tus ingresos',
    explicacion: 'Es una lista obligatoria de todo lo que vendiste en el mes. Muestra cuánto IVA le cobraste a tus clientes.'
  },
  igtf: {
    termino: 'Impuesto a las Grandes Transacciones Financieras',
    simple: 'Impuesto por usar dólares',
    explicacion: 'Es un cargo extra que se cobra por hacer pagos en dólares efectivo. Solo aplica si le pagas a empresas grandes.'
  },
  tasa_bcv: {
    termino: 'Tasa BCV',
    simple: 'Precio oficial del dólar',
    explicacion: 'Es el valor oficial del dólar que dicta el Banco Central de Venezuela. Lo usas para calcular tus cobros en bolívares de forma legal.'
  },
  factura_borrador: {
    termino: 'Factura Borrador',
    simple: 'Factura aún no definitiva',
    explicacion: 'Es un documento de tu venta que todavía puedes cambiar o borrar. Aún no tiene ninguna validez para el SENIAT.'
  },
  nota_de_credito: {
    termino: 'Nota de Crédito',
    simple: 'Documento para anular ventas',
    explicacion: 'Se usa para corregir errores, hacer devoluciones o restar dinero a una venta ya hecha. Así le avisas al SENIAT que esa factura cambió.'
  },
  nota_de_debito: {
    termino: 'Nota de Débito',
    simple: 'Documento para cobrar de más',
    explicacion: 'Sirve para cobrarle un monto adicional a tu cliente sobre una factura que ya le habías entregado. Se usa por ejemplo si te faltó cobrarle algo.'
  },
  sustraendo: {
    termino: 'Sustraendo',
    simple: 'Monto que se resta',
    explicacion: 'Es una cantidad fija que la ley manda a descontar cuando te hacen algunas retenciones. Sirve para que te quiten menos dinero de tu pago.'
  },
  unidad_tributaria: {
    termino: 'Unidad Tributaria',
    simple: 'Medida para calcular multas',
    explicacion: 'Es un valor que usa el gobierno para definir cuánto cuestan las multas o trámites. Antes se usaba para impuestos pero ya casi no.'
  },
  persona_natural: {
    termino: 'Persona Natural',
    simple: 'Un negocio a tu nombre',
    explicacion: 'Eres tú trabajando por tu cuenta o con una firma personal. Tu registro en el SENIAT siempre empieza con la letra V.'
  },
  persona_juridica: {
    termino: 'Persona Jurídica',
    simple: 'Una empresa o compañía',
    explicacion: 'Es una empresa formal ya registrada como una Compañía Anónima. Su registro fiscal siempre empieza con la letra J.'
  },
  licencia_actividad_economica: {
    termino: 'Licencia de Actividad Económica',
    simple: 'Permiso de la alcaldía',
    explicacion: 'Es el permiso que te da la alcaldía para poder tener tu negocio abierto al público. Sin esto no puedes trabajar legalmente.'
  },
  declaracion_iva: {
    termino: 'Declaración de IVA',
    simple: 'Reporte quincenal o mensual',
    explicacion: 'Es el reporte que le mandas al SENIAT diciendo cuánto compraste y vendiste. Con esto sabes exactamente si te toca pagarles plata o no.'
  },
  cashea_cuota: {
    termino: 'Cuota Cashea',
    simple: 'Parte de pago con Cashea',
    explicacion: 'Es cada uno de los pagos que hace tu cliente al comprarte a crédito con la aplicación. Puede ser la inicial del producto o las cuotas.'
  },
  cuentas_por_cobrar: {
    termino: 'Cuentas por Cobrar',
    simple: 'Plata que te deben',
    explicacion: 'Es la lista de todas las ventas que tus clientes todavía no te han pagado. Te ayuda a recordar quién te debe dinero.'
  },
  expediente_fiscal: {
    termino: 'Expediente Fiscal',
    simple: 'Mis papeles del negocio',
    explicacion: 'Es la carpeta donde guardas todos los papeles importantes de tu negocio. Ahí va tu permiso de alcaldía y tus declaraciones.'
  }
};

export default GLOSARIO;
