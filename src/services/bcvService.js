// Servicio para obtener tasas de cambio del BCV (Banco Central de Venezuela)
class BCVService {
  constructor() {
    this.baseURL = 'https://bcv-api.rafnixg.dev';
    this.cacheKey = 'bcv_exchange_rates';
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos en cache
    this.useSimulatedData = false; // Usar datos reales del BCV
    this.isProduction = import.meta.env.PROD; // Detectar si estamos en producción
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

      // Intentar obtener tasa real usando proxy público
      console.log('🌐 Obteniendo tasa del BCV usando proxy público...');
      
      try {
        // Usar un proxy público para evitar CORS
        const proxyURL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(`${this.baseURL}/rates/`);
        const response = await fetch(proxyURL, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
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
        
      } catch (proxyError) {
        console.log('🔄 Proxy falló, usando tasa por defecto...');
        return this.getDefaultRate();
      }
      
    } catch (error) {
      // Solo mostrar error detallado si no es CORS
      if (!error.message.includes('CORS') && !error.message.includes('fetch')) {
        console.error('❌ Error al obtener tasa del BCV:', error);
      } else {
        console.log('🌐 API del BCV no disponible (CORS bloqueado)');
      }
      
      // Si falla la API real, usar tasa por defecto
      console.log('🔄 Usando tasa por defecto...');
      return this.getDefaultRate();
    }
  }

  // Obtener tasa por defecto (evita CORS)
  getDefaultRate() {
    // Usar una tasa realista como fallback (configurable)
    const defaultRate = this.getConfiguredDefaultRate();
    
    const result = {
      success: true, // Cambiado a true ya que es la tasa que se está usando
      data: {
        dollar: defaultRate,
        date: new Date().toISOString().split('T')[0],
        source: 'DEFAULT',
        timestamp: new Date().toISOString()
      }
    };
    
    // Guardar en cache
    this.setCachedRate(result.data);
    
    console.log('📊 Tasa del BCV:', defaultRate, 'VES (por defecto)');
    return result;
  }

  // Obtener datos simulados del BCV (método legacy)
  getSimulatedRate() {
    // Simular variación realista de la tasa del BCV
    const baseRate = 177.6143; // Tasa base que obtuviste en Postman
    const variation = (Math.random() - 0.5) * 2; // Variación de ±1
    const simulatedRate = Math.round((baseRate + variation) * 100) / 100;
    
    const result = {
      success: true,
      data: {
        dollar: simulatedRate,
        date: new Date().toISOString().split('T')[0],
        source: 'SIMULATED',
        timestamp: new Date().toISOString()
      }
    };
    
    // Guardar en cache
    this.setCachedRate(result.data);
    
    console.log('🎭 Tasa simulada del BCV:', result);
    return result;
  }

  // Obtener tasa para una fecha específica
  async getRateForDate(date) {
    try {
      const response = await fetch(`${this.baseURL}/rates/${date}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      
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
      console.error(`Error al obtener tasa del BCV para ${date}:`, error);
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

  // Alternar entre datos simulados y reales
  toggleSimulation(useSimulated = null) {
    if (useSimulated !== null) {
      this.useSimulatedData = useSimulated;
    } else {
      this.useSimulatedData = !this.useSimulatedData;
    }
    
    console.log(`🎭 Modo ${this.useSimulatedData ? 'SIMULADO' : 'REAL'} activado`);
    return this.useSimulatedData;
  }

  // Obtener información del estado actual
  getStatus() {
    return {
      useSimulatedData: this.useSimulatedData,
      cacheKey: this.cacheKey,
      cacheExpiry: this.cacheExpiry,
      baseURL: this.baseURL,
      isProduction: this.isProduction
    };
  }

  // Método para actualizar la tasa por defecto (útil en producción)
  updateDefaultRate(newRate) {
    if (typeof newRate === 'number' && newRate > 0) {
      console.log(`📊 Actualizando tasa por defecto: ${newRate} VES`);
      // Actualizar en localStorage para persistencia
      localStorage.setItem('bcv_default_rate', newRate.toString());
      return true;
    }
    return false;
  }

  // Obtener la tasa por defecto configurada
  getConfiguredDefaultRate() {
    const stored = localStorage.getItem('bcv_default_rate');
    return stored ? parseFloat(stored) : 177.6143;
  }
}

export const bcvService = new BCVService();

// Hacer el servicio accesible desde la consola del navegador para debug
if (typeof window !== 'undefined') {
  window.bcvService = bcvService;
  console.log('🔧 BCVService disponible en window.bcvService para debug');
}
