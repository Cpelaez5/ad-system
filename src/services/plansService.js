import { supabase } from '@/lib/supabaseClient';

export default {
    /**
     * Obtiene todos los planes de suscripción activos.
     */
    async getPlans() {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_monthly', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching plans:', error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene la suscripción actual de un cliente.
     * @param {string} clientId 
     */
    async getCurrentSubscription(clientId) {
        try {
            const { data, error } = await supabase
                .from('client_subscriptions')
                .select('*, plan:subscription_plans(*)')
                .eq('client_id', clientId)
                .in('status', ['active', 'trial', 'past_due'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignorar error si no hay filas
            
            if (!data) {
                // Fallback a users
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('plan_id, trial_end, client_id')
                    .eq('client_id', clientId)
                    .limit(1)
                    .single();
                    
                if (userData && userData.plan_id) {
                    // Manejar códigos legacy ('pro', 'basic', 'free_trial') o UUIDs
                    let planData = null;
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

                    if (uuidRegex.test(userData.plan_id)) {
                        const { data } = await supabase
                            .from('subscription_plans')
                            .select('*')
                            .eq('id', userData.plan_id)
                            .single();
                        planData = data;
                    } else if (userData.plan_id === 'free_trial') {
                        planData = { id: 'free_trial', name: 'Prueba Gratuita', price_monthly: 0, price_annual: 0 };
                    } else {
                        const legacyMap = { 'basic': 'Básico', 'pro': 'Profesional', 'enterprise': 'Empresarial' };
                        const mappedName = legacyMap[userData.plan_id] || userData.plan_id;
                        
                        const { data } = await supabase
                            .from('subscription_plans')
                            .select('*')
                            .eq('name', mappedName)
                            .limit(1)
                            .single();
                        planData = data;
                    }
                        
                    return {
                        success: true,
                        data: {
                            client_id: userData.client_id,
                            plan_id: planData ? planData.id : userData.plan_id,
                            status: userData.trial_end && new Date(userData.trial_end) > new Date() ? 'active' : 'active',
                            billing_period: 'monthly', // default
                            next_billing_date: userData.trial_end,
                            plan: planData
                        }
                    };
                }
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching subscription:', error);
            return { success: false, error };
        }
    },

    /**
     * Actualiza el plan de un cliente (Simulación por ahora).
     * @param {string} clientId 
     * @param {string} planId 
     * @param {string} period 'monthly' | 'annual'
     */
    async updateSubscription(clientId, planId, period) {
        try {
            // 1. Invalidar suscripción anterior (si existe)
            await supabase
                .from('client_subscriptions')
                .update({ status: 'canceled' })
                .eq('client_id', clientId)
                .in('status', ['active', 'trial']);

            // 2. Crear nueva suscripción
            const { data, error } = await supabase
                .from('client_subscriptions')
                .insert([{
                    client_id: clientId,
                    plan_id: planId,
                    billing_period: period,
                    status: 'active',
                    start_date: new Date(),
                    next_billing_date: new Date(Date.now() + (period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000)
                }])
                .select()
                .single();

            // 3. Actualizar la tabla de usuarios para referencia rápida (caché desnormalizado)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').update({ plan_id: planId }).eq('id', user.id);
            }

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating subscription:', error);
            return { success: false, error };
        }
    }
};
