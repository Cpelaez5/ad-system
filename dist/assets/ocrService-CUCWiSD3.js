const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-JvN1eBc0.js","assets/index-P-Gd2Nvo.js","assets/index-BSY0w4uV.css","assets/_commonjs-dynamic-modules-TDtrdbi3.js"])))=>i.map(i=>d[i]);
import{a as m}from"./index-P-Gd2Nvo.js";const p=`Analiza esta factura y extrae los siguientes datos en formato JSON estricto.

IMPORTANTE: Retorna SOLO el objeto JSON, sin texto adicional, sin markdown, sin explicaciones.

Estructura requerida:
{
  "invoiceNumber": "número de factura completo",
  "issueDate": "fecha de emisión en formato YYYY-MM-DD",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "client": {
    "companyName": "nombre completo de la empresa cliente",
    "rif": "RIF del cliente en formato J-12345678-9 o similar",
    "address": "dirección completa del cliente",
    "phone": "teléfono del cliente o null",
    "email": "email del cliente o null"
  },
  "issuer": {
    "companyName": "nombre del emisor de la factura",
    "rif": "RIF del emisor"
  },
  "items": [
    {
      "description": "descripción del producto o servicio",
      "quantity": número (sin formato, solo el número),
      "unitPrice": número (sin formato, solo el número),
      "amount": número (sin formato, solo el número)
    }
  ],
  "subtotal": número (sin formato, solo el número),
  "tax": número del impuesto (sin formato, solo el número),
  "taxRate": porcentaje del impuesto como número (ej: 16 para 16%),
  "total": número total (sin formato, solo el número),
  "currency": "VES" o "USD" o "BS" (detectar de la factura),
  "notes": "observaciones o notas adicionales o null"
}

Reglas:
- Si un campo no está presente en la factura, usa null
- Los números deben ser sin formato (sin puntos, comas, símbolos)
- Las fechas deben estar en formato YYYY-MM-DD
- El RIF debe incluir el prefijo (J-, V-, G-, etc.)
- Si hay múltiples items, incluye todos en el array
- Retorna SOLO el JSON, nada más`;class h{constructor(){this.activeProvider="nvidia",this.deepseekApiKey="sk-b7a81f2875dd47dd9dbe8c67f325b844",this.deepseekApiUrl="https://api.deepseek.com/v1/chat/completions",this.nvidiaApiKey="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",this.nvidiaApiUrl="/api/ai",this.nvidiaModel="google/gemma-3n-e4b-it",this.maxImageSize=1024}async extractInvoiceData(o){try{console.log("📄 Iniciando extracción de factura:",o.name),this.validateFile(o);let t=o;o.type==="application/pdf"&&(console.log("📑 Convirtiendo PDF a imagen..."),t=await this.convertPdfToImage(o)),console.log("🗜️ Comprimiendo imagen...");const r=await this.compressImage(t),e=await this.fileToBase64(r);try{console.log(`🤖 Intentando Vision API (${this.activeProvider})...`);const n=await this.callVisionAPI(e);return console.log(`✅ Vision API (${this.activeProvider}) respondió correctamente`),this.parseInvoiceResponse(n)}catch(n){console.warn(`⚠️ Vision API falló (${n.message}), intentando fallback con Tesseract...`),console.log("👁️ Ejecutando OCR local con Tesseract...");const i=await this.performLocalOCR(r);console.log("📝 Texto extraído, analizando con API...");const a=await this.analyzeTextAPI(i);return this.parseInvoiceResponse(a)}}catch(t){throw console.error("❌ Error en extracción:",t),new Error(`Error al extraer datos: ${t.message}`)}}async performLocalOCR(o){const r=await(await m(()=>import("./index-JvN1eBc0.js").then(n=>n.i),__vite__mapDeps([0,1,2,3]))).createWorker("spa"),{data:{text:e}}=await r.recognize(o);return await r.terminate(),e}async analyzeTextAPI(o,t=p){var r;try{let e="",n="",i={};this.activeProvider==="nvidia"?(e=`${this.nvidiaApiUrl}/chat/completions`,n=this.nvidiaApiKey,i={model:this.nvidiaModel,messages:[{role:"user",content:`Analiza el siguiente texto extraído y obtén los datos en JSON:

${t}

TEXTO EXTRAÍDO:
${o}`}],temperature:.1,max_tokens:2e3,stream:!1}):(e=this.deepseekApiUrl,n=this.deepseekApiKey,i={model:"deepseek-chat",messages:[{role:"user",content:`Analiza el siguiente texto extraído y obtén los datos en JSON:

${t}

TEXTO EXTRAÍDO:
${o}`}],temperature:.1});const a=await fetch(e,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify(i)});if(!a.ok){const c=await a.json().catch(()=>({}));throw new Error(`API Error: ${c.detail||((r=c.error)==null?void 0:r.message)||a.statusText}`)}return(await a.json()).choices[0].message.content}catch(e){throw console.error("Error en análisis de texto:",e),e}}validateFile(o){if(!["application/pdf","image/jpeg","image/jpg","image/png"].includes(o.type))throw new Error("Tipo de archivo no válido. Use PDF, JPG o PNG.");if(o.size>10485760)throw new Error("El archivo es demasiado grande. Máximo 10MB.")}async convertPdfToImage(o){try{const t=await m(()=>import("./pdf-CHhNo-mi.js"),[]),r=new URL("/assets/pdf.worker.min-Cpi8b8z3.mjs",import.meta.url).href;t.GlobalWorkerOptions.workerSrc=r;const e=await o.arrayBuffer(),i=await(await t.getDocument({data:e}).promise).getPage(1),a=i.getViewport({scale:2}),s=document.createElement("canvas"),c=s.getContext("2d");return s.width=a.width,s.height=a.height,await i.render({canvasContext:c,viewport:a}).promise,new Promise(d=>{s.toBlob(l=>{d(new File([l],"converted.jpg",{type:"image/jpeg"}))},"image/jpeg",.9)})}catch(t){throw console.error("Error convirtiendo PDF:",t),new Error("No se pudo convertir el PDF a imagen")}}async compressImage(o){return new Promise((t,r)=>{const e=new FileReader;e.onload=n=>{const i=new Image;i.onload=()=>{let a=i.width,s=i.height;(a>this.maxImageSize||s>this.maxImageSize)&&(a>s?(s=s/a*this.maxImageSize,a=this.maxImageSize):(a=a/s*this.maxImageSize,s=this.maxImageSize));const c=document.createElement("canvas");c.width=a,c.height=s,c.getContext("2d").drawImage(i,0,0,a,s),c.toBlob(l=>{t(new File([l],o.name,{type:"image/jpeg"}))},"image/jpeg",.85)},i.onerror=r,i.src=n.target.result},e.onerror=r,e.readAsDataURL(o)})}async fileToBase64(o){return new Promise((t,r)=>{const e=new FileReader;e.onload=()=>{const n=e.result.split(",")[1];t(n)},e.onerror=r,e.readAsDataURL(o)})}async callVisionAPI(o,t=p){var r;try{let e="",n="",i={};this.activeProvider==="nvidia"?(e=`${this.nvidiaApiUrl}/chat/completions`,n=this.nvidiaApiKey,i={model:this.nvidiaModel,messages:[{role:"user",content:`${t}

<img src="data:image/jpeg;base64,${o}" />`}],temperature:.1,max_tokens:2e3,stream:!1}):(e=this.deepseekApiUrl,n=this.deepseekApiKey,i={model:"deepseek-chat",messages:[{role:"user",content:[{type:"image_url",image_url:{url:`data:image/jpeg;base64,${o}`}},{type:"text",text:t}]}],temperature:.1,max_tokens:2e3});const a=await fetch(e,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify(i)});if(!a.ok){const c=await a.json().catch(()=>({}));throw new Error(`API Error: ${c.detail||((r=c.error)==null?void 0:r.message)||a.statusText}`)}return(await a.json()).choices[0].message.content}catch(e){throw console.error("Error llamando a Vision API:",e),e}}parseInvoiceResponse(o){try{let t=o.trim();t=t.replace(/```json\n?/g,"").replace(/```\n?/g,"");const r=t.match(/\{[\s\S]*\}/);if(!r)throw new Error("No se encontró JSON en la respuesta");const e=JSON.parse(r[0]);if(!e.invoiceNumber&&!e.total)throw new Error("Respuesta JSON no contiene datos válidos de factura");return e.currency&&(e.currency=e.currency.toUpperCase(),(e.currency==="BS"||e.currency==="BSF"||e.currency==="BSS")&&(e.currency="VES")),e.extractedAt=new Date().toISOString(),e.confidence=this.calculateConfidence(e),e}catch(t){throw console.error("Error parseando respuesta:",t),console.log("Respuesta original:",o),new Error("No se pudo parsear la respuesta de la API")}}calculateConfidence(o){const t=["invoiceNumber","issueDate","client.companyName","client.rif","items","total"];let r=0;const e=t.length;return t.forEach(n=>{const i=n.includes(".")?n.split(".").reduce((a,s)=>a==null?void 0:a[s],o):o[n];i!=null&&i!==""&&(Array.isArray(i)&&i.length>0?r++:Array.isArray(i)||r++)}),Math.round(r/e*100)/100}}const w=new h;export{w as o};
