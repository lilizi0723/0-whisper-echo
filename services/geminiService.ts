import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; text: string }[],
  userMessage: string,
  context: string
): Promise<string> => {
  if (!apiKey) {
    return "API Key 未配置，请在 .env.local 中设置 GEMINI_API_KEY。";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `你是嵌入在播客播放器 "Whisper & Echo" 中的 AI 助手。
    你可以访问当前单集的逐字稿摘要。
    请根据上下文回答用户的问题。
    回答要简洁、温暖且有见地。
    
    当前单集背景:
    ${context}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I couldn't generate a response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "抱歉，思考过程中遇到了一些问题。";
  }
};