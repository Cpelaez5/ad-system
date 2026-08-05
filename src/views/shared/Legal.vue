<template>
  <v-container class="py-8 px-4" style="max-width: 1000px; padding-top: 100px !important;">
    
    <!-- Botón de Regreso -->
    <div class="mb-4">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        color="secondary"
        class="text-none font-weight-bold"
        @click="goBack"
        rounded="pill"
      >
        Regresar
      </v-btn>
    </div>

    <div class="text-center mb-8">
      <h1 class="text-h3 font-weight-bold text-primary mb-2">Información Legal</h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        Políticas, términos de servicio y privacidad para nuestros usuarios en Venezuela.
      </p>
    </div>

    <v-card elevation="0" border rounded="xl" class="overflow-hidden">
      <v-tabs
        v-model="activeTab"
        color="primary"
        align-tabs="center"
        stacked
        bg-color="grey-lighten-4"
        show-arrows
      >
        <v-tab value="terminos" class="text-none">
          <v-icon class="mb-1">mdi-file-document-outline</v-icon>
          Términos y Condiciones
        </v-tab>
        <v-tab value="privacidad" class="text-none">
          <v-icon class="mb-1">mdi-shield-check-outline</v-icon>
          Política de Privacidad
        </v-tab>
        <v-tab value="datos" class="text-none">
          <v-icon class="mb-1">mdi-database-lock-outline</v-icon>
          Tratamiento de Datos
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="pa-6 pa-md-8">
        <!-- TÉRMINOS Y CONDICIONES -->
        <v-window-item value="terminos">
          <h2 class="text-h5 font-weight-bold mb-4">Términos y Condiciones de Uso</h2>
          <p class="text-caption text-medium-emphasis mb-6">Última actualización: Agosto 2026</p>
          
          <div class="legal-content text-body-1">
            <h3>1. Aceptación de los Términos</h3>
            <p>Al acceder y utilizar nuestra plataforma ("el Sistema"), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte, no debe utilizar nuestros servicios.</p>

            <h3>2. Prestación del Servicio</h3>
            <p>Nuestra plataforma proporciona herramientas de software como servicio (SaaS) para la gestión contable, administrativa, de facturación y archivo. Nos reservamos el derecho de modificar, suspender o descontinuar temporal o permanentemente cualquier parte del servicio con previo aviso.</p>

            <h3>3. Políticas de Compra y Facturación (Venezuela)</h3>
            <p>
              De conformidad con las normativas fiscales vigentes en la República Bolivariana de Venezuela (SENIAT) y las disposiciones del Banco Central de Venezuela (BCV):
            </p>
            <ul>
              <li><strong>Precios:</strong> Los planes y servicios podrán ser expresados en divisas extranjeras de forma referencial. Sin embargo, todo pago realizado en bolívares será calculado a la tasa de cambio oficial del BCV del día de la operación.</li>
              <li><strong>Facturación Fiscal:</strong> Se emitirá la respectiva factura fiscal o comprobante equivalente por la adquisición o renovación de su plan.</li>
              <li><strong>Retenciones:</strong> Si usted califica como contribuyente especial, es su responsabilidad procesar las retenciones correspondientes de ISLR e IVA y notificar a nuestra plataforma en los lapsos legales establecidos.</li>
            </ul>

            <h3>4. Garantías y Reembolsos</h3>
            <p>En el marco de la Ley Orgánica de Precios Justos (SUNDDE) y la Ley de Protección al Consumidor y al Usuario:</p>
            <ul>
              <li><strong>Disponibilidad:</strong> Hacemos nuestro mejor esfuerzo para garantizar un 99.9% de operatividad del sistema.</li>
              <li><strong>Reembolsos:</strong> Al ser un servicio digital e intangible, no ofrecemos reembolsos por períodos ya iniciados. Usted puede cancelar su suscripción en cualquier momento y seguirá teniendo acceso hasta el final de su ciclo de facturación actual.</li>
            </ul>

            <h3>5. Responsabilidad del Usuario</h3>
            <p>Usted es el único responsable de la exactitud de los datos contables y financieros que ingresa al Sistema. Nosotros proporcionamos la herramienta tecnológica, pero no prestamos servicios de asesoría contable o legal, ni nos hacemos responsables por auditorías del SENIAT, errores de cálculo producto de datos erróneos ingresados por el usuario, u omisiones fiscales.</p>
          </div>
        </v-window-item>

        <!-- POLÍTICA DE PRIVACIDAD -->
        <v-window-item value="privacidad">
          <h2 class="text-h5 font-weight-bold mb-4">Política de Privacidad</h2>
          <p class="text-caption text-medium-emphasis mb-6">Última actualización: Agosto 2026</p>

          <div class="legal-content text-body-1">
            <h3>1. Información que Recopilamos</h3>
            <p>Recopilamos información personal necesaria para la prestación del servicio, que incluye:</p>
            <ul>
              <li><strong>Datos de Cuenta:</strong> Nombre, correo electrónico, RIF de la empresa, dirección, y contraseña (encriptada).</li>
              <li><strong>Datos Operativos:</strong> Facturas, comprobantes, registros de compras, ventas y configuraciones del sistema.</li>
              <li><strong>Datos de Navegación:</strong> Dirección IP, tipo de navegador e interacciones dentro de la plataforma (vía Google Analytics y Meta Pixel).</li>
            </ul>

            <h3>2. Uso de la Información</h3>
            <p>La información recopilada se utiliza estrictamente para:</p>
            <ul>
              <li>Autenticar y asegurar el acceso a su cuenta.</li>
              <li>Generar los reportes, libros contables y documentos que usted solicite.</li>
              <li>Enviar notificaciones sobre renovaciones de planes, alertas del sistema o cambios en nuestras políticas.</li>
              <li>Analizar métricas de uso anonimizadas para mejorar el rendimiento del software.</li>
            </ul>

            <h3>3. Uso de Cookies y Rastreo</h3>
            <p>Utilizamos cookies propias y de terceros para mantener la sesión activa, recordar sus preferencias (como el modo oscuro) y para análisis de tráfico (Google Analytics/Meta Pixel). Puede configurar su navegador para rechazar todas las cookies, pero algunas partes del Sistema podrían no funcionar correctamente. A través de nuestro Banner de Privacidad, usted puede rechazar las cookies de rastreo y marketing no esenciales.</p>

            <h3>4. Divulgación a Terceros</h3>
            <p><strong>No vendemos, alquilamos ni comercializamos sus datos personales o financieros.</strong> Solo compartiremos información con terceros cuando:</p>
            <ul>
              <li>Sea requerido por una orden judicial o autoridades competentes de Venezuela.</li>
              <li>Se deba procesar un pago a través de pasarelas de pago seguras de terceros.</li>
            </ul>
          </div>
        </v-window-item>

        <!-- TRATAMIENTO DE DATOS -->
        <v-window-item value="datos">
          <h2 class="text-h5 font-weight-bold mb-4">Tratamiento de Datos y Seguridad</h2>
          <p class="text-caption text-medium-emphasis mb-6">Última actualización: Agosto 2026</p>

          <div class="legal-content text-body-1">
            <h3>1. Almacenamiento y Seguridad en la Nube</h3>
            <p>Toda la información alojada en el Sistema se encuentra respaldada en servidores en la nube de alta disponibilidad. Implementamos medidas de seguridad de grado bancario, incluyendo:</p>
            <ul>
              <li><strong>Encriptación:</strong> Todas las conexiones entre su navegador y nuestros servidores utilizan TLS/SSL de 256 bits (HTTPS).</li>
              <li><strong>Row Level Security (RLS):</strong> La base de datos está diseñada arquitectónicamente para que sus datos estén completamente aislados. Ni siquiera otros usuarios en el mismo entorno de la plataforma pueden acceder a su información (Multi-tenancy seguro).</li>
            </ul>

            <h3>2. Tratamiento de Información Sensible e IA</h3>
            <p>Como plataforma moderna, integramos funciones de Inteligencia Artificial (IA) para mejorar su experiencia (por ejemplo, asistencia en lectura de facturas o soporte automatizado).</p>
            <ul>
              <li><strong>Uso Responsable:</strong> Los datos compartidos con módulos de IA se procesan de manera transitoria y NO se utilizan para entrenar modelos públicos externos.</li>
              <li><strong>Confidencialidad:</strong> Los documentos confidenciales que usted cargue (fotos de recibos, PDFs) se almacenan de forma segura y solo son accesibles por usted o su contador asignado.</li>
            </ul>

            <h3>3. Derechos del Usuario (ARCO)</h3>
            <p>Aunque la legislación específica de protección de datos en Venezuela está sujeta a normativas generales constitucionales (Art. 28 Constitución Nacional), garantizamos sus derechos de:</p>
            <ul>
              <li><strong>Acceso:</strong> Usted puede visualizar toda la información que tenemos sobre su empresa.</li>
              <li><strong>Rectificación:</strong> Puede modificar o actualizar su información fiscal y personal en cualquier momento.</li>
              <li><strong>Cancelación/Eliminación:</strong> Usted tiene derecho a solicitar la eliminación permanente de su cuenta y sus datos financieros. Al hacerlo, se realizará un borrado lógico y posteriormente un borrado físico, excluyendo únicamente aquellos registros de auditoría obligatorios para el cumplimiento fiscal.</li>
            </ul>
          </div>
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: 'Legal',
  data() {
    return {
      activeTab: 'terminos'
    }
  },
  mounted() {
    // Leer el parámetro de la URL (ej: /legal?tab=privacidad) para seleccionar la pestaña
    const tab = this.$route.query.tab;
    if (tab && ['terminos', 'privacidad', 'datos'].includes(tab)) {
      this.activeTab = tab;
    }
    
    // Scrollear hacia arriba siempre al entrar
    window.scrollTo(0, 0);
  },
  watch: {
    '$route.query.tab'(newTab) {
      if (newTab && ['terminos', 'privacidad', 'datos'].includes(newTab)) {
        this.activeTab = newTab;
      }
    }
  },
  methods: {
    goBack() {
      if (window.history.length > 1) {
        this.$router.back();
      } else {
        this.$router.push('/');
      }
    }
  }
}
</script>

<style scoped>
.legal-content h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 12px;
  color: var(--v-theme-primary);
}

.legal-content p {
  margin-bottom: 16px;
  line-height: 1.6;
}

.legal-content ul {
  margin-bottom: 16px;
  padding-left: 24px;
}

.legal-content li {
  margin-bottom: 8px;
  line-height: 1.6;
}
</style>
