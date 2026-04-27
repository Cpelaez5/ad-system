// ═══════════════════════════════════════════════════════════
// Servicio BCV — Tasas de Cambio (Dólar + Euro)
// Obtiene tasas directamente del sitio oficial del BCV
// mediante una Edge Function de Supabase (scraping server-side).
// ═══════════════════════════════════════════════════════════
import { supabase } from '@/lib/supabaseClient';

class BCVService {
  constructor() {
    this.cacheKey = 'bcv_exchange_rates_v3';
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutos — BCV solo actualiza 1 vez al día hábil
  }

  // ═══════════════════════════════════════════
  // MÉTODO PRINCIPAL: Obtener tasa actual
  // ═══════════════════════════════════════════

  /**
   * Obtiene las tasas de cambio del día (USD y EUR).
   * Estrategia de 3 capas:
   *   1. Cache local (localStorage) → instantáneo
   *   2. Edge Function (scraping BCV oficial) → 1-3s
   *   3. Base de datos (última tasa guardada) → fallback
   *
   * @returns {{ success: boolean, data?: { dollar, euro, date, trend, source } }}
   */
  async getCurrentRate() {
    try {
      // ── Capa 1: Cache local ──
      const cached = this.getCachedRate();
      if (cached) {
        console.log('📦 BCV: Usando cache local:', cached.data.dollar);
        return cached;
      }

      console.log('🌐 BCV: Obteniendo tasas desde Edge Function...');

      // ── Capa 2: Edge Function (scraping oficial) ──
      let rateData = null;
      try {
        rateData = await this.fetchFromEdgeFunction();
      } catch (e) {
        console.warn('⚠️ BCV Edge Function falló:', e.message);
      }

      // Si la Edge Function falla, intentar DB como fallback
      if (!rateData) {
        console.log('🗄️ BCV: Fallback a base de datos...');
        const dbRate = await this.getLatestRateFromDB();
        if (dbRate) {
          // Guardar en cache para evitar llamadas futuras
          this.setCachedRate(dbRate);
          return { success: true, data: { ...dbRate, source: 'DB-Fallback' } };
        }
        return { success: false, error: 'No se pudo obtener la tasa del BCV' };
      }

      // ── Persistir y cachear ──
      this.setCachedRate(rateData);

      // Guardar en DB (async, no bloquea)
      this.persistRateToDB(rateData).catch(err => {
        console.warn('⚠️ Error guardando tasa en DB:', err);
      });

      // Calcular tendencia vs día anterior para USD
      try {
        const previousUsd = await this.getPreviousRateFromDB(rateData.date, 'USD');
        if (previousUsd) {
          if (rateData.dollar > previousUsd.dollar) rateData.trend = 'up';
          else if (rateData.dollar < previousUsd.dollar) rateData.trend = 'down';
          else rateData.trend = 'stable';
          rateData.previousRate = previousUsd.dollar;
        }
        
        const previousEur = await this.getPreviousRateFromDB(rateData.date, 'EUR');
        if (previousEur && rateData.euro) {
          if (rateData.euro > previousEur.euro) rateData.trendEur = 'up';
          else if (rateData.euro < previousEur.euro) rateData.trendEur = 'down';
          else rateData.trendEur = 'stable';
          rateData.previousRateEur = previousEur.euro;
        }
      } catch (e) {
        console.warn('⚠️ Error calculando tendencia:', e);
      }

      console.log('✅ BCV: Tasas obtenidas →', {
        dollar: rateData.dollar,
        euro: rateData.euro,
        date: rateData.date
      });

      return { success: true, data: rateData };

    } catch (error) {
      console.error('❌ Error al obtener tasa del BCV:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════
  // EDGE FUNCTION (Scraping BCV Oficial)
  // ═══════════════════════════════════════════

  /**
   * Llama a la Edge Function bcv-rates que hace scraping
   * directamente del sitio oficial del BCV (sin CORS).
   * @returns {Object} { dollar, euro, date, source, timestamp }
   */
  async fetchFromEdgeFunction() {
    const { data, error } = await supabase.functions.invoke('bcv-rates', {
      method: 'GET'
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    // La Edge Function retorna { success, data: { dollar, euro, date, ... } }
    if (!data || !data.success || !data.data) {
      throw new Error(data?.error || 'Respuesta inválida de la Edge Function');
    }

    const rates = data.data;

    if (typeof rates.dollar !== 'number' || rates.dollar <= 0) {
      throw new Error('Tasa del dólar inválida en respuesta');
    }

    return {
      dollar: rates.dollar,
      euro: rates.euro || null,
      date: rates.date,
      dateText: rates.dateText || null,
      source: 'BCV-OFICIAL',
      timestamp: rates.timestamp || new Date().toISOString()
    };
  }

  // ═══════════════════════════════════════════
  // TASA POR FECHA ESPECÍFICA
  // ═══════════════════════════════════════════

  /**
   * Obtiene tasa para una fecha específica (YYYY-MM-DD).
   * Estrategia: DB → Edge Function (solo tasa actual) → fallback
   */
  async getRateForDate(date) {
    if (!date) return { success: false, error: 'Fecha inválida' };
    console.log(`🌐 BCV: Buscando tasa para ${date}...`);

    try {
      // 1. Buscar en Base de Datos
      const dbRate = await this.getRateFromDB(date);
      if (dbRate) {
        console.log('🗄️ BCV: Tasa encontrada en DB:', dbRate);
        return { success: true, data: dbRate };
      }

      // 2. Si es la fecha de hoy, usar la Edge Function
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        const currentRate = await this.getCurrentRate();
        if (currentRate.success) {
          return currentRate;
        }
      }

      // 3. Si no se encontró, intentar obtener la más cercana de DB
      const closestRate = await this.getClosestRateFromDB(date);
      if (closestRate) {
        console.log(`📊 BCV: Usando tasa más cercana (${closestRate.date}) como aproximación`);
        return { success: true, data: { ...closestRate, approximate: true } };
      }

    } catch (error) {
      console.warn(`⚠️ Error buscando tasa para ${date}:`, error.message);
    }

    return { success: false, error: 'Tasa no encontrada para esta fecha' };
  }

  // ═══════════════════════════════════════════
  // MÉTODOS DE BASE DE DATOS
  // ═══════════════════════════════════════════

  /** Obtiene tasa de una fecha exacta desde la DB */
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

  /** Obtiene la última tasa guardada en DB (sin importar fecha) */
  async getLatestRateFromDB() {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
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

  /** Obtiene la tasa anterior más reciente desde DB (para calcular tendencia) */
  async getPreviousRateFromDB(currentDate, currency = 'USD') {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .lt('date', currentDate)
      .eq('currency', currency)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    if (currency === 'EUR') {
      return {
        euro: parseFloat(data.rate),
        date: data.date,
        source: 'DB'
      };
    }

    return {
      dollar: parseFloat(data.rate),
      date: data.date,
      source: 'DB'
    };
  }

  /** Busca la tasa más cercana a una fecha dada */
  async getClosestRateFromDB(date) {
    // Intentar la más reciente anterior
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .lte('date', date)
      .eq('currency', 'USD')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      dollar: parseFloat(data.rate),
      date: data.date,
      source: 'DB-Closest'
    };
  }

  /**
   * Persiste la tasa del dólar (y euro si está disponible) en la DB.
   * Usa upsert para evitar duplicados.
   */
  async persistRateToDB(rateData) {
    const inserts = [];

    // Guardar tasa del dólar
    if (rateData.dollar) {
      inserts.push({
        date: rateData.date,
        currency: 'USD',
        rate: rateData.dollar,
        source: 'BCV'
      });
    }

    // Guardar tasa del euro
    if (rateData.euro) {
      inserts.push({
        date: rateData.date,
        currency: 'EUR',
        rate: rateData.euro,
        source: 'BCV'
      });
    }

    if (inserts.length === 0) return;

    const { error } = await supabase
      .from('exchange_rates')
      .upsert(inserts, { onConflict: 'date, currency' });

    if (error) throw error;
    console.log(`💾 BCV: ${inserts.length} tasa(s) guardada(s) en DB para ${rateData.date}`);
  }

  // ═══════════════════════════════════════════
  // CACHE LOCAL (localStorage)
  // ═══════════════════════════════════════════

  /** Obtener tasa desde cache local (validando expiración) */
  getCachedRate() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      if (now - timestamp < this.cacheExpiry) {
        return { success: true, data: { ...data, cached: true } };
      }
      // Cache expirado — no eliminar, el dashboard lo usa como cache "caliente"
      return null;
    } catch (error) { return null; }
  }

  /** Guardar tasa en cache local */
  setCachedRate(data) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error guardando cache BCV:', error);
    }
  }

  /** Limpiar cache */
  clearCache() {
    localStorage.removeItem(this.cacheKey);
  }

  // ═══════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════

  /** Formatea una tasa como moneda venezolana */
  formatRate(rate) {
    if (!rate) return 'N/A';
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 4
    }).format(rate);
  }

  /** Convierte USD a VES usando la tasa actual */
  async convertUSDToVES(usdAmount) {
    const res = await this.getCurrentRate();
    if (!res.success) return { success: false, error: 'Sin tasa' };
    return {
      success: true,
      data: {
        vesAmount: usdAmount * res.data.dollar,
        rate: res.data.dollar
      }
    };
  }

  /** Convierte EUR a VES usando la tasa actual */
  async convertEURToVES(eurAmount) {
    const res = await this.getCurrentRate();
    if (!res.success || !res.data.euro) return { success: false, error: 'Sin tasa EUR' };
    return {
      success: true,
      data: {
        vesAmount: eurAmount * res.data.euro,
        rate: res.data.euro
      }
    };
  }

  /**
   * Retorna una tasa por defecto configurada.
   * Método de compatibilidad usado por múltiples vistas como fallback final
   * cuando el cache y la API fallan.
   * @returns {{ success: true, data: { dollar: number, date: string, source: string } } | null}
   */
  getConfiguredDefaultRate() {
    // Intentar leer cache (aunque esté expirado) como último recurso
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const { data } = JSON.parse(cached);
        if (data && typeof data.dollar === 'number') {
          return { success: true, data: { ...data, source: 'Cache-Expirado' } };
        }
      }
    } catch (e) { /* silencioso */ }
    return null;
  }
}

export const bcvService = new BCVService();
export default bcvService;
