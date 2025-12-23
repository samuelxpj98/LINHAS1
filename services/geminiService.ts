
import { GoogleGenAI, Type } from "@google/genai";

export async function getTheologicalInsight(concept: string, context: string): Promise<{ word: string; verse: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Dado o conceito teológico "${concept}" e o contexto bíblico "${context}", sugira EXATAMENTE UMA PALAVRA (em português) que sintetize a conexão entre eles. Forneça também um versículo bíblico curto que embase essa sugestão.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING, description: 'Exatamente uma única palavra que conecta o conceito e o contexto.' },
            verse: { type: Type.STRING, description: 'Referência e texto de um versículo bíblico curto.' }
          },
          required: ["word", "verse"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      word: result.word?.trim().toUpperCase() || "CONEXÃO",
      verse: result.verse || "Referência não encontrada."
    };
  } catch (error) {
    console.error("Error fetching Gemini insight:", error);
    return {
      word: "LUMEN",
      verse: "Tente novamente mais tarde."
    };
  }
}
