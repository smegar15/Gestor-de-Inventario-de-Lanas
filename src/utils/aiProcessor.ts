import { GoogleGenerativeAI } from "@google/generative-ai";

export async function processCatalogWithAI(apiKey: string, fileData: string, fileName: string) {
  // Limpiamos la clave de posibles espacios invisibles
  const cleanKey = apiKey.trim();
  const genAI = new GoogleGenerativeAI(cleanKey);
  
  // 👉 LA SOLUCIÓN: Usamos el modelo actual de 2026
  const model = genAI.getGenerativeModel(
    { model: "gemini-3.5-flash" }
  );

  console.log("Iniciando escaneo con Gemini 3.5 Flash (Generación 2026)...");

  // Extract base64 data and mime type
  const mimeType = fileData.split(';')[0].split(':')[1];
  const base64Content = fileData.split(',')[1];

  const prompt = `
    Analiza este catálogo de lanas (imagen o PDF) y extrae la información técnica y la lista completa de colores.
    
    Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
    {
      "name": "Nombre de la línea de lana",
      "brand": "Marca",
      "composition": "Composición (ej. 100% Acrílico)",
      "weightGrams": número de gramos por ovillo,
      "lengthMeters": número de metros por ovillo,
      "price": precio sugerido (número),
      "supplier": "Proveedor",
      "notes": "Breve descripción de propiedades",
      "colors": [
        { "code": "Código", "name": "Nombre del color", "hex": "Código HEX aproximado" }
      ]
    }
    
    Si hay muchas páginas o muchos colores, extráelos TODOS los que veas.
    Importante: No añadas explicaciones, solo el JSON.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Content,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    console.log("Raw AI Response:", text); // Para depurar
    
    // Limpiar posibles bloques de código markdown que la IA suele añadir
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", text);
      throw new Error("La IA no devolvió un formato de datos válido. Prueba a subir el archivo de nuevo.");
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("JSON Parse Error:", e, "Text:", jsonMatch[0]);
      throw new Error("Error al leer los datos de la IA. El formato del catálogo es muy complejo.");
    }
  } catch (error: any) {
    console.error("Error calling Gemini:", error);
    if (error.message?.includes('API_KEY_INVALID')) {
      throw new Error("La API Key de Gemini no es válida. Por favor, revísala en Configuración.");
    }
    if (error.message?.includes('SAFETY')) {
      throw new Error("La IA bloqueó el contenido por seguridad. Intenta con otra imagen o PDF.");
    }
    throw error;
  }
}

export async function extractDesignPaletteWithAI(
  apiKey: string,
  fileData: string,
  fileName: string
): Promise<{ palette: { hex: string; name: string; weight: number }[]; notes?: string }> {
  const cleanKey = apiKey.trim();
  const genAI = new GoogleGenerativeAI(cleanKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const mimeType = fileData.split(';')[0].split(':')[1];
  const base64Content = fileData.split(',')[1];

  const prompt = `
Analiza esta imagen (diseño/textura/patrón) y extrae una paleta de colores dominante para reproducirla.

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "palette": [
    { "hex": "#RRGGBB", "name": "Nombre color (es-ES)", "weight": 0.0 }
  ],
  "notes": "opcional"
}

Reglas:
- Devuelve entre 5 y 10 colores.
- "hex" debe estar en formato #RRGGBB.
- "weight" es un número entre 0 y 1 que representa importancia relativa (no tiene por qué sumar 1).
- No incluyas texto fuera del JSON.
`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Content,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("La IA no devolvió un formato de datos válido. Prueba a subir la imagen de nuevo.");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const paletteRaw = Array.isArray(parsed?.palette) ? parsed.palette : [];

    const palette = paletteRaw
      .map((item: any) => ({
        hex: typeof item?.hex === 'string' ? item.hex.trim() : '',
        name: typeof item?.name === 'string' ? item.name.trim() : '',
        weight: Number(item?.weight) || 0
      }))
      .filter((c: any) => c.hex);

    return {
      palette,
      notes: typeof parsed?.notes === 'string' ? parsed.notes : undefined
    };
  } catch (error: any) {
    console.error("Error calling Gemini:", error);
    if (error.message?.includes('API_KEY_INVALID')) {
      throw new Error("La API Key de Gemini no es válida. Por favor, revísala en Configuración.");
    }
    if (error.message?.includes('SAFETY')) {
      throw new Error("La IA bloqueó el contenido por seguridad. Intenta con otra imagen.");
    }
    throw error;
  }
}
