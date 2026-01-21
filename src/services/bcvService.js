// Servicio para obtener tasas de cambio del BCV (Banco Central de Venezuela)
import { supabase } from '@/lib/supabaseClient';

class BCVService {
  constructor() {
    this.baseURL = 'https://bcv-api.rafnixg.dev';
    this.cacheKey = 'bcv_exchange_rates';
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos en cache de RAM/LocalStorage
    this.isProduction = import.meta.env.PROD;
  }

  // Helper para realizar peticiones a través de proxies (evitar CORS)
  async fetchWithProxy(endpoint) {
    const targetURL = `${this.baseURL}${endpoint}`;
    const proxies = [
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    let lastError = null;

    for (const proxyGen of proxies) {
      try {
        const proxyURL = proxyGen(targetURL);
        const response = await fetch(proxyURL, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-cache'
        });

        if (response.ok) {
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            console.warn('Respuesta no es JSON válido:', text.substring(0, 50));
          }
        }
      } catch (error) {
        console.warn(`⚠️ Proxy falló, intentando siguiente...`, error.message);
        lastError = error;
      }
    }
    throw lastError || new Error('No se pudo conectar con el servicio del BCV');
  }

  /**
   * Obtiene la tasa del día.
   * Estrategia: "Passive Write-Through"
   * 1. Busca en API.
   * 2. Si tiene éxito, intenta guardar en DB para "inmortalizar" el dato.
   */
  async getCurrentRate() {
    try {
      // 1. Validar Cache Local (L1)
      const cached = this.getCachedRate();
      if (cached) {
        console.log('📦 Usando tasa del BCV desde cache local:', cached.data);
        return cached;
      }

      console.log('🌐 Obteniendo tasa del BCV actual...');
      let rawData;
      try {
        rawData = await this.fetchWithProxy('/rates/');
      } catch (e) {
        console.warn('⚠️ Fallo al obtener tasa actual de API:', e);
        // Fallback: Intentar buscar en DB la última guardada hoy
        const dbRate = await this.getRateFromDB(new Date().toISOString().split('T')[0]);
        if (dbRate) return { success: true, data: dbRate };

        return { success: false, error: 'Servicio BCV no disponible' };
      }

      if (!rawData || typeof rawData.dollar !== 'number') {
        throw new Error('Respuesta inválida del BCV: estructura de datos incorrecta');
      }

      // Preparar objeto de datos
      // Notas del usuario contextual: BCV actualiza lun-vie, fines de semana mantiene anterior.
      // La API ya devuelve "date" con la fecha de la tasa vigente.
      const rateData = {
        dollar: rawData.dollar,
        date: rawData.date, // Fecha de vigencia según BCV
        source: 'BCV',
        timestamp: new Date().toISOString()
      };

      // 2. Guardar en Cache Local (L1)
      this.setCachedRate(rateData);

      // 3. Guardar en Base de Datos (L2 - Persistencia Histórica)
      // Optimización: Solo guardar si no existe o es diferente para evitar saturar DB/Logs
      try {
        const existingDbRate = await this.getRateFromDB(rateData.date);
        const shouldSave = !existingDbRate || Math.abs(existingDbRate.dollar - rateData.dollar) > 0.0001;

        if (shouldSave) {
          this.saveRateToDB(rateData.dollar, rateData.date).catch(err => {
            console.warn('⚠️ No se pudo guardar tasa en histórico DB:', err);
          });
        } else {
          console.log('📦 Tasa ya actualizada en DB, omitiendo guardado.');
        }
      } catch (err) {
        console.warn('⚠️ Error verificando DB para guardado:', err);
      }

      // 4. Calcular Tendencia (Trend)
      // Buscamos la tasa del día anterior (o la más reciente anterior) para comparar
      try {
        const previousRateData = await this.getPreviousRateFromDB(rateData.date);
        if (previousRateData) {
          if (rateData.dollar > previousRateData.dollar) rateData.trend = 'up';
          else if (rateData.dollar < previousRateData.dollar) rateData.trend = 'down';
          else rateData.trend = 'stable';

          rateData.previousRate = previousRateData.dollar;
        }
      } catch (e) { console.warn('⚠️ Error calculando tendencia:', e); }

      console.log('✅ Tasa del BCV obtenida:', rateData);
      return { success: true, data: rateData };

    } catch (error) {
      console.error('❌ Error al obtener tasa del BCV:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene tasa para una fecha específica (YYYY-MM-DD).
   * Estrategia: DB -> API -> DB Save
   */
  async getRateForDate(date) {
    if (!date) return { success: false, error: 'Fecha inválida' };
    console.log(`🌐 Buscando tasa para ${date}...`);

    try {
      // 1. Buscar en Base de Datos (L2)
      const dbRate = await this.getRateFromDB(date);
      if (dbRate) {
        console.log('🗄️ Tasa encontrada en Base de Datos:', dbRate);
        return { success: true, data: dbRate };
      }

      // 2. Si no está en DB, buscar en API
      console.log(`📡 Tasa no en DB, buscando en API para ${date}...`);
      const rawData = await this.fetchWithProxy(`/rates/${date}`);

      if (rawData && (rawData.bank_rates || rawData.dollar)) {
        const rateValue = rawData.dollar || (rawData.bank_rates ? 0 : 0); // Ajustar según estructura real histórica
        // La estructura histórica a veces varía, asumiremos .dollar si existe

        const finalRate = {
          dollar: rawData.dollar,
          date: rawData.date,
          source: 'BCV-API-History'
        };

        // 3. Guardar en DB para el futuro
        await this.saveRateToDB(finalRate.dollar, date); // Guardamos con la fecha solicitada para llenar el hueco

        return { success: true, data: finalRate };
      }

    } catch (error) {
      console.warn(`⚠️ Error buscando tasa histórica para ${date}:`, error.message);
    }

    return { success: false, error: 'Tasa no encontrada para esta fecha' };
  }

  // --- MÉTODOS DE BASE DE DATOS ---

  async getRateFromDB(date) {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('date', date)
      .eq('currency', 'USD')
      .single();

    if (error || !data) return null;

    return {
      dollar: parseFloat(data.rate),
      date: data.date,
      source: 'DB'
    };
  }

  async getPreviousRateFromDB(currentDate) {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .lt('date', currentDate)
      .eq('currency', 'USD')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      dollar: parseFloat(data.rate),
      date: data.date,
      source: 'DB'
    };
  }

  async saveRateToDB(rate, date) {
    // Usar upsert para evitar errores de duplicados
    const { error } = await supabase
      .from('exchange_rates')
      .upsert({
        date: date,
        currency: 'USD',
        rate: rate,
        source: 'API'
      }, { onConflict: 'date, currency' });

    if (error) throw error;
    console.log(`💾 Tasa guardada en DB: ${date} = ${rate}`);
  }

  // --- MÉTODOS EXISTENTES (Cache Local L1) ---

  // Obtener tasa desde cache local (localStorage)
  getCachedRate() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      const now = new Date().getTime();
      if (now - timestamp < this.cacheExpiry) {
        return { success: true, data: { ...data, cached: true } };
      }
      localStorage.removeItem(this.cacheKey);
      return null;
    } catch (error) { return null; }
  }

  setCachedRate(data) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        data,
        timestamp: new Date().getTime()
      }));
    } catch (error) { console.error('Error cache local:', error); }
  }

  clearCache() { localStorage.removeItem(this.cacheKey); }

  // Utils
  formatRate(rate) {
    if (!rate) return 'N/A';
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 4
    }).format(rate);
  }

  // Convertidores legacy
  async convertUSDToVES(usdAmount) {
    const res = await this.getCurrentRate();
    if (!res.success) return { success: false, error: 'Sin tasa' };
    return { success: true, data: { vesAmount: usdAmount * res.data.dollar, rate: res.data.dollar } };
  }
}

export const bcvService = new BCVService();
export default bcvService;
