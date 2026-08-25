export interface IOcrProvider {
  /**
   * Procesa un comprobante (imagen o PDF) y extrae los datos contables en JSON.
   * La validación y formateo final se delegan a la función principal, este método
   * solo debe comunicarse con la API de IA específica.
   *
   * @param filePath Ruta del archivo en el bucket temp_ocr
   * @param signedUrl URL firmada temporal de Supabase Storage
   * @param apiKey Llave API del proveedor (desencriptada)
   * @param model Modelo a utilizar (ej. 'gemini-3.7-flash')
   * @param prompt Instrucciones del asistente contable
   * @param schema Schema JSON estricto esperado (opcional según si el modelo lo soporta)
   * @returns El objeto JSON resultante de la extracción
   */
  process(
    filePath: string,
    signedUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    schema?: any
  ): Promise<any>;

  /**
   * Genera texto libre para funcionalidad de Chat (sin forzar JSON estricto).
   * 
   * @param prompt El mensaje o arreglo de mensajes
   * @param apiKey Llave API del proveedor
   * @param model Modelo a utilizar
   * @returns Texto generado y metadata de tokens
   */
  generateText(
    prompt: string,
    apiKey: string,
    model: string
  ): Promise<{ text: string; usage: { promptTokenCount: number; candidatesTokenCount: number } }>;
}
