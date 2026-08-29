import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Falta configuración de Supabase en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runE2E() {
  console.log('🚀 Iniciando Test E2E de Flujo Completo...')
  let authData = null
  let orgId = null
  let clientId = null

  try {
    // 1. LOGIN
    console.log('\n--- PASO 1: LOGIN ---')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'carlosleonelpelaez@gmail.com',
      password: 'cliente123'
    })
    
    if (error) throw error
    authData = data.user
    console.log('✅ Login exitoso. User ID:', authData.id)

    // Obtener Perfil
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*, organizations(*), clients(*)')
      .eq('id', authData.id)
      .single()

    if (profileError) throw profileError
    orgId = userProfile.organization_id
    clientId = userProfile.client_id
    console.log('✅ Perfil obtenido. Org ID:', orgId, 'Client ID:', clientId)

    // 2. ACTUALIZAR PERFIL DEL CLIENTE
    console.log('\n--- PASO 2: COMPLETAR PERFIL FISCAL ---')
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({
        activity_type: 'Ventas al Mayor',
        licencia_actividad_economica: 'E2E-LIC-999',
        municipio_id: 'm-baruta'
      })
      .eq('id', clientId)
    
    if (clientUpdateError) throw clientUpdateError
    console.log('✅ Perfil del cliente actualizado (Estado, Municipio, Licencia).')

    // 3. CREAR PROVEEDOR DE PRUEBAS
    console.log('\n--- PASO 3: CREAR PROVEEDOR AISLADO ---')
    // check if provider exists
    const { data: existingProvider } = await supabase
      .from('proveedores')
      .select('id')
      .eq('rif', 'J-00000000-0')
      .eq('client_id', clientId)
      .maybeSingle()
      
    let proveedorId = null
    
    if (existingProvider) {
      proveedorId = existingProvider.id
      console.log('✅ Proveedor ya existía, reusando ID:', proveedorId)
    } else {
      const { data: newProvider, error: providerError } = await supabase
        .from('proveedores')
        .insert({
          organization_id: orgId,
          client_id: clientId,
          nombre: 'PROVEEDOR E2E TEST CA',
          rif: 'J-00000000-0',
          tipo_persona: 'JURIDICA',
          municipal_rate: 1.5,
          iva_retention_rate: 75,
          municipio_id: 'm-baruta' // mismo municipio
        })
        .select()
        .single()
        
      if (providerError) throw providerError
      proveedorId = newProvider.id
      console.log('✅ Nuevo proveedor E2E creado:', proveedorId)
    }

    // 4. REGISTRAR COMPRA CON RETENCIONES
    console.log('\n--- PASO 4: REGISTRAR COMPRA RPC ---')
    const facturaPayload = {
      issuer: { name: 'PROVEEDOR E2E TEST CA', rif: 'J-00000000-0' },
      client: { name: 'Carlos E2E', rif: 'V-12345678' },
      invoiceNumber: 'E2E-' + Date.now().toString().slice(-6),
      controlNumber: 'C-' + Date.now().toString().slice(-6),
      issueDate: new Date().toISOString().split('T')[0],
      financial: {
        taxableSales: 1000,
        taxAmount: 160,
        taxDebit: 160,
        totalSales: 1160
      }
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('registrar_compra_con_retenciones', {
      p_client_id: clientId,
      p_proveedor_id: proveedorId,
      p_factura: facturaPayload,
      p_aplicar_iva: true,
      p_aplicar_islr: false,
      p_aplicar_municipal: true,
      p_comprobante_iva: 'IVA-E2E-' + Date.now(),
      p_comprobante_municipal: 'MUN-E2E-' + Date.now()
    })

    if (rpcError) throw rpcError
    console.log('✅ RPC registrar_compra_con_retenciones ejecutado exitosamente.')
    console.log('   Invoice ID retornado:', rpcResult)

    // 5. VERIFICAR BD DIRECTAMENTE
    console.log('\n--- PASO 5: VERIFICAR RESULTADOS EN TABLAS ---')
    const { data: retenciones, error: retError } = await supabase
      .from('retenciones')
      .select('tipo, porcentaje_retencion, monto_retenido')
      .eq('invoice_id', rpcResult.invoice_id)

    if (retError) throw retError
    
    console.log('✅ Retenciones encontradas en la base de datos:', retenciones.length)
    retenciones.forEach(ret => {
      console.log(`   -> Tipo: ${ret.tipo} | %: ${ret.porcentaje_retencion}% | Monto: ${ret.monto_retenido}`)
    })

    console.log('\n🎉 TEST E2E (BACKEND) COMPLETADO SIN ERRORES 🎉')

  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL FLUJO E2E:', error)
    if (error.code) console.error('Code:', error.code)
    if (error.details) console.error('Details:', error.details)
    if (error.hint) console.error('Hint:', error.hint)
  }
}

runE2E()
