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
      // Opción 2: CORS Proxy IO (Fallback)
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
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
          return await response.json();
        }
      } catch (error) {
        console.warn(`⚠️ Proxy falló, intentando siguiente...`);
        lastError = error;
      }
    }

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
      const rawData = await this.fetchWithProxy('/rates/');

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
    try {
      console.log(`🌐 Buscando tasa histórica para ${date}...`);
      const rawData = await this.fetchWithProxy(`/rates/${date}`);

      console.log(`💰 Datos históricos recibidos:`, rawData);

      if (!rawData || typeof rawData.dollar !== 'number') {
        console.warn(`⚠️ Respuesta inválida para ${date}:`, rawData);
        return {
          success: false,
          error: 'No hay tasa disponible para esta fecha',
          data: null
        };
      }

      return {
        success: true,
        data: {
          dollar: rawData.dollar,
          date: rawData.date,
          source: 'BCV',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ Error al obtener tasa del BCV para ${date}:`, error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Obtener historial de tasas (últimos 30 días)
  async getRateHistory() {
    try {
      const response = await fetch(`${this.baseURL}/rates/history`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`Error al obtener historial del BCV: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.rates || []
      };
    } catch (error) {
      console.error('Error al obtener historial del BCV:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Obtener historial de tasas en un rango de fechas
  async getRateHistoryRange(startDate, endDate) {
    try {
      const response = await fetch(
        `${this.baseURL}/rates/history?start_date=${startDate}&end_date=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache'
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener historial del BCV: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.rates || []
      };
    } catch (error) {
      console.error('Error al obtener historial del BCV:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Convertir monto de USD a VES usando la tasa del BCV
  async convertUSDToVES(usdAmount) {
    try {
      const rateResponse = await this.getCurrentRate();

      if (!rateResponse.success) {
        throw new Error('No se pudo obtener la tasa de cambio');
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
      console.error('Error al convertir USD a VES:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Convertir monto de VES a USD usando la tasa del BCV
  async convertVESToUSD(vesAmount) {
    try {
      const rateResponse = await this.getCurrentRate();

      if (!rateResponse.success) {
        throw new Error('No se pudo obtener la tasa de cambio');
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
      console.error('Error al convertir VES a USD:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(rate);
  }

  // Formatear fecha para mostrar
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Verificar si la API está disponible
  async checkAPIStatus() {
    try {
      console.log('🔍 Verificando conectividad con API del BCV...');

      const response = await fetch(`${this.baseURL}/rates/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        cache: 'no-cache'
      });

      console.log('📡 Estado de la API del BCV:', response.status, response.statusText);

      return {
        success: response.ok,
        status: response.status,
        available: response.ok
      };
    } catch (error) {
      console.error('❌ Error de conectividad con BCV:', error);
      return {
        success: false,
        error: error.message,
        available: false
      };
    }
  }

  // Método de prueba para debug
  async testConnection() {
    console.log('🧪 Iniciando prueba de conexión con BCV...');

    try {
      // Limpiar cache para forzar nueva petición
      this.clearCache();

      // Probar obtención de tasa
      const rate = await this.getCurrentRate();
      console.log('💰 Resultado de tasa:', rate);
      return rate;
    } catch (error) {
      console.error('❌ Error en prueba de conexión:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Probar la API del BCV
  async testAPI() {
    console.log('🧪 Probando API del BCV...');

    try {
      this.clearCache();
      const result = await this.getCurrentRate();
      console.log('📊 Resultado de prueba:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en prueba de API:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Método para probar la API del BCV directamente desde la consola
  async testBCVDirect() {
    console.log('🧪 Probando API del BCV directamente...');

    try {
      const response = await fetch('https://bcv-api.rafnixg.dev/rates/');
      const data = await response.json();

      console.log('✅ API del BCV funciona:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Error en API del BCV:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener información del estado actual
  getStatus() {
    return {
      cacheKey: this.cacheKey,
      cacheExpiry: this.cacheExpiry,
      baseURL: this.baseURL,
      isProduction: this.isProduction
    };
  }
}

const bcvService = new BCVService();
export default bcvService;

// Hacer el servicio accesible desde la consola del navegador para debug
if (typeof window !== 'undefined') {
  window.bcvService = bcvService;
  console.log('🔧 BCVService disponible en window.bcvService para debug');
}
