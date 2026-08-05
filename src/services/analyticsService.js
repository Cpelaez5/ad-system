/**
 * Servicio centralizado para manejar Google Analytics (vía GTM/gtag),
 * Meta Pixel (fbq) y preparación para Klaviyo.
 */

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    // Inicialización si es necesario
    // Nota: El script base de GTM y Meta Pixel ya están en index.html
    this.isInitialized = true;
  }

  /**
   * Registra una vista de página en todas las plataformas
   * @param {string} url - La ruta visitada
   */
  trackPageView(url) {
    if (typeof window === 'undefined') return;

    // 1. Google Analytics / GTM
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'page_view',
        page_path: url
      });
    }

    // 2. Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }

    // 3. Klaviyo (Placeholder)
    if (window.klaviyo) {
      // window.klaviyo.push(['track', 'Viewed Page', { url }]);
    }
    
    console.log(`[Analytics] PageView tracked: ${url}`);
  }

  /**
   * Registra un evento personalizado o estándar en las plataformas
   * @param {string} eventName - Nombre del evento (ej. 'CompleteRegistration', 'Purchase')
   * @param {object} payload - Datos adicionales del evento (value, currency, etc.)
   */
  trackEvent(eventName, payload = {}) {
    if (typeof window === 'undefined') return;

    // 1. Google Analytics / GTM
    if (window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        ...payload
      });
    }

    // 2. Meta Pixel
    // Mapeo de eventos estándar de Meta
    const metaStandardEvents = [
      'AddPaymentInfo', 'AddToCart', 'AddToWishlist', 'CompleteRegistration',
      'Contact', 'CustomizeProduct', 'Donate', 'FindLocation', 'InitiateCheckout',
      'Lead', 'Purchase', 'Schedule', 'Search', 'StartTrial', 'SubmitApplication',
      'Subscribe', 'ViewContent'
    ];

    if (window.fbq) {
      if (metaStandardEvents.includes(eventName)) {
        window.fbq('track', eventName, payload);
      } else {
        window.fbq('trackCustom', eventName, payload);
      }
    }

    // 3. Klaviyo (Placeholder)
    if (window.klaviyo) {
      // window.klaviyo.push(['track', eventName, payload]);
    }

    console.log(`[Analytics] Event tracked: ${eventName}`, payload);
  }
  
  /**
   * Identifica al usuario en las plataformas (útil post-login o registro)
   * @param {object} userData - Datos del usuario (email, id, role)
   */
  identifyUser(userData) {
    if (typeof window === 'undefined' || !userData) return;
    
    // Google / GTM
    if (window.dataLayer) {
      window.dataLayer.push({
        user_id: userData.id,
        user_role: userData.role
      });
    }
    
    // Klaviyo
    if (window.klaviyo && userData.email) {
      /*
      window.klaviyo.push(['identify', {
        '$email': userData.email,
        '$id': userData.id,
        'Role': userData.role
      }]);
      */
    }
    
    console.log(`[Analytics] User identified:`, userData.email || userData.id);
  }
}

export const analyticsService = new AnalyticsService();
