import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateDSSInsights = async (data: any) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following musical instrument shop data and provide strategic business insights.
    Data: ${JSON.stringify(data)}
    
    Provide the following in JSON format:
    1. criticalAlert: A high-priority business alert (e.g., supply chain, stock out, high demand).
    2. marketMetrics: 4 key metrics (label, value, trend).
    3. recommendation: A specific, actionable recommendation (title, description, currentPrice, recommendedPrice, targetSku).
    4. predictiveTrends: 3 upcoming trends based on the data (category, title, description, probability).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            criticalAlert: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                actionLabel: { type: Type.STRING }
              },
              required: ["title", "description", "actionLabel"]
            },
            marketMetrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  trend: { type: Type.STRING }
                },
                required: ["label", "value", "trend"]
              }
            },
            recommendation: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                currentPrice: { type: Type.NUMBER },
                recommendedPrice: { type: Type.NUMBER },
                targetSku: { type: Type.STRING },
                confidence: { type: Type.STRING }
              },
              required: ["title", "description", "currentPrice", "recommendedPrice", "targetSku", "confidence"]
            },
            predictiveTrends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  probability: { type: Type.STRING }
                },
                required: ["category", "title", "description", "probability"]
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating DSS insights:", error);
    return null;
  }
};
