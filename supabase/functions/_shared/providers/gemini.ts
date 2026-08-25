import { IOcrProvider } from './types.ts';
import { encodeBase64 } from "jsr:@std/encoding/base64";

export class GeminiProvider implements IOcrProvider {
  async process(
    filePath: string,
    signedUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    schema?: any
  ): Promise<any> {
    
    // Determinar MIME type según la extensión del archivo
    let mimeType = 'application/pdf';
    if (filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (filePath.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    }

    // Descargar el archivo desde Storage y convertirlo a Base64
    const fileResponse = await fetch(signedUrl);
    if (!fileResponse.ok) {
      throw { code: 'PROVIDER_ERROR', message: 'No se pudo leer el archivo de Storage para enviarlo a la IA.' };
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64Data = encodeBase64(arrayBuffer);

    const payload: any = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Data } },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    if (schema) {
      payload.generationConfig.responseSchema = schema;
    }

    // Para control de costos en Gemini Pro (opcional)
    if (model.includes('pro')) {
      payload.generationConfig.thinkingConfig = { thinkingBudget: 'medium' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000); // 55s timeout (Supabase corta a los 60s)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const code = response.status === 429 ? 'QUOTA_EXCEEDED'
                   : response.status === 401 ? 'INVALID_KEY'
                   : 'PROVIDER_ERROR';
                   
        const isPreviewRateLimit = response.status === 429 && errBody?.error?.message?.includes('rate');
        throw {
          code: isPreviewRateLimit ? 'PREVIEW_RATE_LIMIT' : code,
          message: errBody?.error?.message ?? `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      let resultJson: any;
      try {
        resultJson = JSON.parse(data.candidates[0].content.parts[0].text);
      } catch {
        throw { code: 'PARSE_ERROR', message: 'El proveedor devolvió una respuesta que no es JSON válido' };
      }

      return {
        data: resultJson,
        usage: {
          promptTokenCount: data.usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: data.usageMetadata?.candidatesTokenCount || 0,
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

  async generateText(
    prompt: string,
    apiKey: string,
    model: string
  ): Promise<{ text: string; usage: { promptTokenCount: number; candidatesTokenCount: number } }> {
    const payload = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseMimeType: 'text/plain',
      },
    };

    if (model.includes('pro')) {
      payload.generationConfig.thinkingConfig = { thinkingBudget: 'medium' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000); // 55s timeout

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const code = response.status === 429 ? 'QUOTA_EXCEEDED'
                   : response.status === 401 ? 'INVALID_KEY'
                   : 'PROVIDER_ERROR';
                   
        const isPreviewRateLimit = response.status === 429 && errBody?.error?.message?.includes('rate');
        throw {
          code: isPreviewRateLimit ? 'PREVIEW_RATE_LIMIT' : code,
          message: errBody?.error?.message ?? `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return {
        text,
        usage: {
          promptTokenCount: data.usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: data.usageMetadata?.candidatesTokenCount || 0,
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
