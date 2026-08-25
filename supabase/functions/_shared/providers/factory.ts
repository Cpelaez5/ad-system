import { IOcrProvider } from './types.ts';
import { GeminiProvider } from './gemini.ts';
import { DeepseekProvider } from './deepseek.ts';

export function createProvider(providerName: string): IOcrProvider {
  const provider = providerName.toLowerCase();
  
  if (provider === 'gemini') {
    return new GeminiProvider();
  } else if (provider === 'deepseek') {
    return new DeepseekProvider();
  }
  
  throw { code: 'UNSUPPORTED_PROVIDER', message: `El proveedor '${providerName}' no está soportado.` };
}
