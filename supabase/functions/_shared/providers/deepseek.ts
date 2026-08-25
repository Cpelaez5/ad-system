import { IOcrProvider } from './types.ts';

export class DeepseekProvider implements IOcrProvider {
  async process(
    filePath: string,
    signedUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    schema?: any
  ): Promise<any> {
    
    // LIMITACIÓN DOCUMENTADA: DeepSeek Vision actualmente requiere imágenes
    // No acepta PDFs nativos como Gemini, y no acepta URIs en todos los endpoints,
    // suele requerir Base64 directo de la imagen.
    // 
    // Para simplificar la arquitectura actual del Edge Function, lanzaremos
    // un error si se intenta procesar un PDF con DeepSeek hasta que se
    // implemente un conversor de PDF a JPG interno o DeepSeek soporte PDF.
    
    if (filePath.toLowerCase().endsWith('.pdf')) {
      throw {
        code: 'UNSUPPORTED_FORMAT',
        message: 'Deepseek no soporta archivos PDF directamente. Conviértalos a imagen primero.'
      };
    }

    // Aquí iría el fetch de la imagen via signedUrl para convertirla a base64
    // dado que la API de OpenAI/Deepseek standard vision requiere base64:
    // const imageResponse = await fetch(signedUrl);
    // const imageArrayBuffer = await imageResponse.arrayBuffer();
    // const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
    
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Deepseek Provider estructurado pendiente de implementación de fetch base64'
    };
  }

  async generateText(
    prompt: string,
    apiKey: string,
    model: string
  ): Promise<{ text: string; usage: { promptTokenCount: number; candidatesTokenCount: number } }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000); // 55s timeout

    const payload = {
      model: model,
      messages: [
        { role: 'system', content: 'Eres un asistente inteligente.' },
        { role: 'user', content: prompt }
      ]
    };

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const code = response.status === 401 ? 'INVALID_KEY'
                   : response.status === 402 ? 'QUOTA_EXCEEDED'
                   : response.status === 429 ? 'QUOTA_EXCEEDED'
                   : 'PROVIDER_ERROR';
        throw {
          code: code,
          message: errBody?.error?.message ?? `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      
      return {
        text: data.choices[0]?.message?.content || '',
        usage: {
          promptTokenCount: data.usage?.prompt_tokens || 0,
          candidatesTokenCount: data.usage?.completion_tokens || 0,
        }
      };
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw { code: 'TIMEOUT', message: 'El proveedor tardó demasiado en responder.' };
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
