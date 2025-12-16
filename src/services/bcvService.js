// Servicio para obtener tasas de cambio del BCV (Banco Central de Venezuela)
class BCVService {
  constructor() {
    this.baseURL = 'https://bcv-api.rafnixg.dev';
    this.cacheKey = 'bcv_exchange_rates';
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos en cache
    this.isProduction = import.meta.env.PROD; // Detectar si estamos en producción
  }

  // Helper para realizar peticiones a través de proxies (evitar CORS)
  async fetchWithProxy(endpoint) {
    const targetURL = `${this.baseURL}${endpoint}`;
    const proxies = [
      // Opción 1: AllOrigins
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      // Opción 2: CORS Proxy IO
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      // Opción 3: CodeTabs (Backup adicional)
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    let lastError = null;

    for (const proxyGen of proxies) {
      try {
        const proxyURL = proxyGen(targetURL);
        console.log(`Intentando proxy: ${proxyURL}`);

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
            throw new Error('Respuesta inválida (no JSON)');
          }
        }
      } catch (error) {
        console.warn(`⚠️ Proxy falló, intentando siguiente...`, error.message);
        lastError = error;
      }
    }

    console.error('❌ Todos los proxies fallaron');
    throw lastError || new Error('No se pudo conectar con el servicio del BCV a través de ningún proxy');
  }

  // Obtener la tasa de cambio actual del BCV
  async getCurrentRate() {
    try {
      // Verificar cache primero
      const cached = this.getCachedRate();
      if (cached) {
        console.log('📦 Usando tasa del BCV desde cache:', cached.data);
        return cached;
      }

      console.log('🌐 Obteniendo tasa del BCV...');
      let rawData;

      try {
        rawData = await this.fetchWithProxy('/rates/');
      } catch (e) {
        console.warn('⚠️ Fallo al obtener tasa actual:', e);
        return { success: false, error: 'Servicio BCV no disponible' };
      }

      console.log('💰 Datos recibidos del BCV:', rawData);

      if (!rawData || typeof rawData.dollar !== 'number') {
        throw new Error('Respuesta inválida del BCV: estructura de datos incorrecta');
      }

      const result = {
        success: true,
        data: {
          dollar: rawData.dollar,
          date: rawData.date,
          source: 'BCV',
          timestamp: new Date().toISOString()
        }
      };

      this.setCachedRate(result.data);
      console.log('✅ Tasa del BCV obtenida exitosamente:', result);
      return result;

    } catch (error) {
      console.error('❌ Error al obtener tasa del BCV:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener tasa para una fecha específica
  async getRateForDate(date) {
    console.log(`🌐 Buscando tasa histórica para ${date}...`);

    // Validar formato de fecha
    if (!date) return { success: false, error: 'Fecha inválida' };

    // Intentar buscar en cache primero
    const cacheKey = `bcv_rate_${date}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Cache válido por 24 horas para fechas históricas
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          console.log('📦 Usando tasa histórica desde cache');
          return { success: true, data: parsed.data };
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      const rawData = await this.fetchWithProxy(`/rates/${date}`);

      if (rawData && (rawData.bank_rates || rawData.dollar)) {
        console.log('💰 Datos históricos recibidos:', rawData);

        const data = {
          dollar: rawData.dollar,
          date: rawData.date,
          source: 'BCV'
        };

        // Guardar en cache
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          data: data
        }));

        return { success: true, data: data };
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo obtener tasa para ${date}:`, error.message);
    }

    return { success: false, error: 'Tasa no encontrada para esta fecha' };
  }

  // Obtener historial de tasas (últimos 30 días)
  async getRateHistory() {
    // Implementación simplificada que retorna array vacío si falla
    return { success: false, data: [] };
  }

  // Obtener historial de tasas en un rango de fechas
  async getRateHistoryRange(startDate, endDate) {
    // Implementación simplificada que retorna array vacío si falla
    return { success: false, data: [] };
  }

  // Convertir monto de USD a VES usando la tasa del BCV
  async convertUSDToVES(usdAmount) {
    try {
      const rateResponse = await this.getCurrentRate();

      if (!rateResponse.success) {
        return { success: false, error: 'No hay tasa de cambio disponible' };
      }

      const vesAmount = usdAmount * rateResponse.data.dollar;

      return {
        success: true,
        data: {
          usdAmount,
          vesAmount,
          rate: rateResponse.data.dollar,
          date: rateResponse.data.date,
          source: rateResponse.data.source
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convertir monto de VES a USD usando la tasa del BCV
  async convertVESToUSD(vesAmount) {
    try {
      const rateResponse = await this.getCurrentRate();

      if (!rateResponse.success) {
        return { success: false, error: 'No hay tasa de cambio disponible' };
      }

      const usdAmount = vesAmount / rateResponse.data.dollar;

      return {
        success: true,
        data: {
          vesAmount,
          usdAmount,
          rate: rateResponse.data.dollar,
          date: rateResponse.data.date,
          source: rateResponse.data.source
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Obtener tasa desde cache
  getCachedRate() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = new Date().getTime();

      // Verificar si el cache no ha expirado
      if (now - timestamp < this.cacheExpiry) {
        return {
          success: true,
          data: {
            ...data,
            cached: true
          }
        };
      }

      // Cache expirado, limpiar
      localStorage.removeItem(this.cacheKey);
      return null;
    } catch (error) {
      console.error('Error al leer cache del BCV:', error);
      return null;
    }
  }

  // Guardar tasa en cache
  setCachedRate(data) {
    try {
      const cacheData = {
        data,
        timestamp: new Date().getTime()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error al guardar cache del BCV:', error);
    }
  }

  // Limpiar cache
  clearCache() {
    localStorage.removeItem(this.cacheKey);
  }

  // Formatear tasa de cambio para mostrar
  formatRate(rate) {
    if (!rate) return 'N/A';
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 4
    }).format(rate);
  }
}

// Exportar una instancia única
export const bcvService = new BCVService();
export default bcvService;
