<template>
  <div class="fill-height bg-grey-lighten-4 pa-0">
    <v-container fluid class="pa-0 h-100">
      <div v-if="loading" class="d-flex justify-center align-center h-100">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>
      
      <ClientInvoiceForm 
        v-else
        :invoice="invoiceToEdit"
        :flow="defaultFlow"
        @submit="handleInvoiceSubmit"
        @cancel="handleCancel"
      />
    </v-container>
    
    <!-- Snackbar Global -->
    <AppSnackbar 
      v-model="snackbar.show" 
      :type="snackbar.type" 
      :message="snackbar.message" 
    />
  </div>
</template>

<script>
import ClientInvoiceForm from '@/components/forms/client/ClientInvoiceForm.vue';
import invoiceService from '@/services/invoiceService.js';
import AppSnackbar from '@/components/common/AppSnackbar.vue';

export default {
  name: 'InvoiceFormPage',
  components: {
    ClientInvoiceForm,
    AppSnackbar
  },
  data() {
    return {
      loading: true,
      invoiceToEdit: null,
      defaultFlow: 'VENTA',
      snackbar: { show: false, message: '', type: 'info' }
    };
  },
  async mounted() {
    // Check if we are editing
    const invoiceId = this.$route.params.id;
    if (invoiceId) {
       console.log('📝 Edit Mode: Loading invoice', invoiceId);
       await this.loadInvoice(invoiceId);
    } else {
       // New Invoice
       console.log('✨ Create Mode');
       this.loading = false;
       this.defaultFlow = this.$route.query.flow || 'VENTA';
    }
  },
  methods: {
    async loadInvoice(id) {
      try {
        const invoice = await invoiceService.getInvoiceById(id);
        if (invoice) {
           this.invoiceToEdit = invoice;
        } else {
           this.showSnackbar('Factura no encontrada', 'error');
           setTimeout(() => this.$router.push('/cliente/facturacion'), 2000);
        }
      } catch (e) {
         console.error(e);
         this.showSnackbar('Error cargando factura', 'error');
      } finally {
         this.loading = false;
      }
    },
    
    async handleInvoiceSubmit(formData) {
       try {
         this.loading = true;
         
         if (this.invoiceToEdit) {
            // Update
            console.log('💾 Updating invoice...', formData);
            await invoiceService.updateInvoice(this.invoiceToEdit.id, formData);
            this.showSnackbar('Factura actualizada correctamente', 'success');
         } else {
            // Create
            console.log('💾 Creating invoice...', formData);
            await invoiceService.createInvoice(formData);
            this.showSnackbar('Factura creada exitosamente', 'success');
         }
         
         // Redirect back to list after short delay
         setTimeout(() => {
            this.$router.push('/cliente/facturacion');
         }, 1000);
         
       } catch (e) {
          console.error(e);
          this.showSnackbar('Error al guardar la factura', 'error');
          this.loading = false; 
       }
    },
    
    handleCancel() {
       this.$router.back(); 
    },
    
    showSnackbar(msg, type = 'info') {
      this.snackbar = { show: true, message: msg, type };
    }
  }
};
</script>
