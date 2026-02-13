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
