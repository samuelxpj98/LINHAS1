
import { GoogleGenAI, Type } from "@google/genai";

export async function getTheologicalInsight(concept: string, context: string): Promise<{ explanation: string; verse: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explique brevemente a conexão teológica entre o conceito "${concept}" e o contexto "${context}". Forneça também um versículo bíblico relevante.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING, description: 'Breve explicação teológica.' },
            verse: { type: Type.STRING, description: 'Referência e texto de um versículo bíblico.' }
          },
          required: ["explanation", "verse"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      explanation: result.explanation || "Sem explicação disponível.",
      verse: result.verse || "Referência não encontrada."
    };
  } catch (error) {
    console.error("Error fetching Gemini insight:", error);
    return {
      explanation: "Não foi possível carregar o insight teológico agora.",
      verse: "Tente novamente mais tarde."
    };
  }
}
