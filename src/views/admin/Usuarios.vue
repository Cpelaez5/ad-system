<template>
  <div class="usuarios">
    <EncabezadoPagina titulo="Usuarios" subtitulo="Quién puede entrar al sistema, con qué rol y en qué plan.">
      <v-btn
        v-if="puedeInvitar"
        color="primary"
        size="large"
        class="text-none"
        prepend-icon="mdi-email-plus-outline"
        data-testid="invitar"
        @click="abrirInvitar"
      >Invitar usuario</v-btn>
    </EncabezadoPagina>

    <template v-if="cargando">
      <v-skeleton-loader type="article" class="mb-4" data-testid="cargando" />
      <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
    </template>

    <v-alert v-else-if="errorCarga" type="error" variant="tonal" class="mb-4" data-testid="error-carga">
      No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo.
      <template #append>
        <v-btn variant="text" class="text-none" @click="cargar">Reintentar</v-btn>
      </template>
    </v-alert>

    <template v-else>
      <EstadoVacio
        v-if="usuarios.length === 0"
        icono="mdi-account-group-outline"
        titulo="Todavía no hay usuarios"
        mensaje="Invita a la primera persona: recibirá un correo para crear su contraseña."
        :texto-accion="puedeInvitar ? 'Invitar usuario' : ''"
        @accion="abrirInvitar"
      />

      <template v-else>
        <PanelSiguientePaso
          class="mb-6"
          :listo="pendientes === 0"
          :titulo="`${pendientes} ${pendientes === 1 ? 'persona no ha' : 'personas no han'} activado su cuenta`"
          detalle="Les llegó la invitación pero aún no crean su contraseña. Revisa quiénes son y reenvíales el correo."
          texto-boton="Ver quiénes son"
          titulo-listo="Todos activaron su cuenta"
          detalle-listo="No hay invitaciones pendientes."
          @accion="estado = 'pendientes'"
        />

        <v-text-field
          v-model="texto"
          label="Buscar por nombre o correo"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          hide-details
          class="mb-3"
          data-testid="buscar"
        />

        <FiltroChips v-model="rol" etiqueta="Filtrar por rol" :opciones="opcionesRol" class="mb-1" />
        <FiltroChips v-model="estado" etiqueta="Filtrar por estado" :opciones="opcionesEstado" class="mb-4" />

        <SeccionLista
          titulo="Personas"
          icono="mdi-account-multiple-outline"
          :meta="`${visibles.length} de ${usuarios.length}`"
        >
          <FilaUsuario
            v-for="u in visibles"
            :key="u.id"
            :usuario="u"
            :nombre-rol="nombreRol(u.role)"
            :icono="roles[u.role]?.icon || 'mdi-account-outline'"
            :plan="nombrePlan(u.plan_id, planes)"
            :puede-editar="puedeEditar"
            :puede-borrar="esSuperAdmin && u.role !== 'super_admin'"
            @ver="verUsuario"
            @editar="editarUsuario"
            @plan="abrirPlan"
            @reenviar="reenviar"
            @borrar="pedirBorrar"
          />
          <div v-if="visibles.length === 0" class="sin-resultados" data-testid="sin-resultados">
            Nadie coincide con esa búsqueda.
            <v-btn variant="text" class="text-none" @click="limpiar">Quitar filtros</v-btn>
          </div>
        </SeccionLista>
      </template>
    </template>

    <DialogoUsuario
      v-model="dialogoUsuario"
      :editando="editando"
      :usuario="usuarioEnEdicion"
      :roles="rolesAsignables"
      :cargando="guardando"
      @guardar="guardarUsuario"
    />
    <DialogoDetalleUsuario
      v-model="dialogoDetalle"
      :usuario="seleccionado"
      :rol="seleccionado ? roles[seleccionado.role] : null"
      :permisos="seleccionado ? userService.getRolePermissions(seleccionado.role) : []"
      :plan="seleccionado ? nombrePlan(seleccionado.plan_id, planes) : ''"
    />
    <DialogoPlanUsuario
      v-model="dialogoPlan"
      :usuario="seleccionado"
      :planes="planes"
      :cargando="guardando"
      @guardar="guardarPlan"
    />
    <DialogoBorrarUsuario
      v-model="dialogoBorrar"
      :usuario="aBorrar"
      :nombre-rol="aBorrar ? nombreRol(aBorrar.role) : ''"
      :cargando="borrando"
      @confirmar="borrarEnCascada"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import userService from '@/services/userService.js'
import plansService from '@/services/plansService.js'
import { supabase } from '@/lib/supabaseClient'
import { useNotificacionStore } from '@/store/notificacionStore'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import FilaUsuario from '@/components/admin/usuarios/FilaUsuario.vue'
import DialogoUsuario from '@/components/admin/usuarios/DialogoUsuario.vue'
import DialogoDetalleUsuario from '@/components/admin/usuarios/DialogoDetalleUsuario.vue'
import DialogoPlanUsuario from '@/components/admin/usuarios/DialogoPlanUsuario.vue'
import DialogoBorrarUsuario from '@/components/admin/usuarios/DialogoBorrarUsuario.vue'
import { filtrarUsuarios, contarPorRol, nombrePlan, rolesDisponibles } from '@/components/admin/usuarios/usuariosUtil'

const notificaciones = useNotificacionStore()

const usuarios = ref([])
const roles = ref({})
const planes = ref([])
const usuarioActual = ref(null)

const cargando = ref(true)
const errorCarga = ref(false)
const guardando = ref(false)
const borrando = ref(false)

const texto = ref('')
const rol = ref('todos')
const estado = ref('todos')

const dialogoUsuario = ref(false)
const dialogoDetalle = ref(false)
const dialogoPlan = ref(false)
const dialogoBorrar = ref(false)
const editando = ref(false)
const usuarioEnEdicion = ref(null)
const seleccionado = ref(null)
const aBorrar = ref(null)

const esSuperAdmin = computed(() => usuarioActual.value?.role === 'super_admin')
const puedeInvitar = computed(() => userService.hasPermission(usuarioActual.value?.role, 'users.create'))
const puedeEditar = computed(() => userService.hasPermission(usuarioActual.value?.role, 'users.update'))
const rolesAsignables = computed(() => rolesDisponibles(roles.value, esSuperAdmin.value))

const pendientes = computed(() => usuarios.value.filter((u) => !u.isActive).length)
const visibles = computed(() => filtrarUsuarios(usuarios.value, { texto: texto.value || '', rol: rol.value, estado: estado.value }))

const opcionesRol = computed(() => {
  const por = contarPorRol(usuarios.value)
  return [
    { valor: 'todos', texto: 'Todos', cantidad: usuarios.value.length },
    ...Object.keys(roles.value)
      .filter((k) => por[k])
      .map((k) => ({ valor: k, texto: roles.value[k].name, cantidad: por[k] })),
  ]
})
const opcionesEstado = computed(() => [
  { valor: 'todos', texto: 'Cualquier estado' },
  { valor: 'activos', texto: 'Activos', cantidad: usuarios.value.length - pendientes.value },
  { valor: 'pendientes', texto: 'Invitación pendiente', cantidad: pendientes.value },
])

const nombreRol = (clave) => roles.value[clave]?.name || clave

onMounted(async () => {
  try {
    usuarioActual.value = JSON.parse(localStorage.getItem('currentUser') || '{}')
    if (!usuarioActual.value || !usuarioActual.value.role) {
      const fresco = await userService.getCurrentUser()
      if (fresco) usuarioActual.value = fresco
    }
  } catch {
    /* sin sesión local: se tratan los permisos como vacíos */
  }
  await cargar()
})

async function cargar() {
  // Solo la primera carga muestra el esqueleto; las recargas tras guardar no parpadean.
  if (usuarios.value.length === 0) cargando.value = true
  errorCarga.value = false
  try {
    const [lista, rolesData, respuestaPlanes] = await Promise.all([
      userService.getUsers(),
      userService.getRoles(),
      plansService.getPlans(),
    ])
    usuarios.value = lista
    roles.value = rolesData
    planes.value = respuestaPlanes?.success ? respuestaPlanes.data : []
  } catch (e) {
    console.error('Error cargando usuarios:', e)
    errorCarga.value = true
  } finally {
    cargando.value = false
  }
}

function limpiar() {
  texto.value = ''
  rol.value = 'todos'
  estado.value = 'todos'
}

function abrirInvitar() {
  editando.value = false
  usuarioEnEdicion.value = null
  dialogoUsuario.value = true
}

function editarUsuario(u) {
  editando.value = true
  usuarioEnEdicion.value = u
  dialogoUsuario.value = true
}

function verUsuario(u) {
  seleccionado.value = u
  dialogoDetalle.value = true
}

function abrirPlan(u) {
  seleccionado.value = u
  dialogoPlan.value = true
}

async function guardarUsuario(datos) {
  guardando.value = true
  try {
    if (editando.value) {
      await userService.updateUser(datos.id, datos)
      await cargar()
      dialogoUsuario.value = false
      notificaciones.mostrar('Usuario actualizado', 'success')
    } else {
      const res = await userService.inviteUser(datos)
      if (res.success) {
        await cargar()
        dialogoUsuario.value = false
        notificaciones.mostrar(`Invitación enviada a ${datos.email}`, 'success')
      } else {
        // El diálogo queda abierto para corregir y reintentar.
        notificaciones.mostrar('No se pudo enviar la invitación: ' + (res.message || 'error desconocido'), 'error')
      }
    }
  } catch (error) {
    console.error('Error guardando usuario:', error)
    notificaciones.mostrar('No se pudo guardar el usuario: ' + (error.message || ''), 'error')
  } finally {
    guardando.value = false
  }
}

async function reenviar(u) {
  try {
    const res = await userService.resendInvitation({
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
    })
    if (res.success) notificaciones.mostrar(`Invitación reenviada a ${u.email}`, 'success')
    else notificaciones.mostrar('No se pudo reenviar: ' + (res.message || 'error desconocido'), 'error')
  } catch (error) {
    console.error('Error reenviando invitación:', error)
    notificaciones.mostrar('No se pudo reenviar la invitación.', 'error')
  }
}

async function guardarPlan({ userId, plan_id, trial_end }) {
  guardando.value = true
  try {
    const { error } = await supabase.from('users').update({ plan_id, trial_end }).eq('id', userId).select()
    if (error) throw error
    await cargar()
    dialogoPlan.value = false
    notificaciones.mostrar('Plan y prueba actualizados', 'success')
  } catch (error) {
    console.error('Error actualizando plan:', error)
    notificaciones.mostrar('No se pudo actualizar el plan: ' + (error.message || ''), 'error')
  } finally {
    guardando.value = false
  }
}

function pedirBorrar(u) {
  if (!esSuperAdmin.value) {
    notificaciones.mostrar('Solo el super administrador puede eliminar usuarios.', 'warning')
    return
  }
  if (u.role === 'super_admin') {
    notificaciones.mostrar('No se puede eliminar a un super administrador.', 'warning')
    return
  }
  aBorrar.value = u
  dialogoBorrar.value = true
}

async function borrarEnCascada() {
  if (!aBorrar.value) return
  borrando.value = true
  try {
    const res = await userService.deleteUserCascade(aBorrar.value.id)
    if (res.success) {
      notificaciones.mostrar(res.message || 'Usuario y empresa eliminados.', 'success')
      dialogoBorrar.value = false
      aBorrar.value = null
      await cargar()
    } else {
      notificaciones.mostrar('No se pudo eliminar: ' + (res.error || 'la operación no se completó.'), 'error')
    }
  } catch (err) {
    console.error('Error al eliminar en cascada:', err)
    notificaciones.mostrar('Error inesperado: ' + (err.message || 'ocurrió un fallo.'), 'error')
  } finally {
    borrando.value = false
  }
}
</script>

<style scoped>
.usuarios { max-width: 1120px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .usuarios { padding: 32px 24px 40px; } }
.sin-resultados { padding: 20px 16px; text-align: center; color: rgba(var(--v-theme-on-surface), 0.68); }
</style>
