import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getDSSRecommendation(inventoryData: any, salesData: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Analyze the following inventory and sales data for Fermata Musical Instrument Shop and provide a strategic recommendation in JSON format.
      
      Inventory: ${JSON.stringify(inventoryData)}
      Sales: ${JSON.stringify(salesData)}
      
      The response should include:
      - recommendationTitle: A bold title for the recommendation
      - analysisText: A detailed explanation of why this is recommended
      - currentPrice: The current price of the affected product
      - recommendedPrice: The new suggested price
      - confidenceScore: A percentage (e.g., "94.2%")
      - targetSku: The SKU of the product
      - alertTitle: A warning title for a critical alert if any
      - alertDescription: Description of the critical alert
      
      Return ONLY the JSON object.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("DSS AI Error:", error);
    return null;
  }
}
