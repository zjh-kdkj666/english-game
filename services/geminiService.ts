import { GoogleGenAI, Schema, Type } from "@google/genai";
import { LessonData, FileAttachment } from '../types';

// Lazy initialization to prevent startup crashes if env is not ready
let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

const lessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "A fun title for the content" },
    towerWords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          english: { type: Type.STRING, description: "The exact word or phrase found in the text" },
          chinese: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array containing the correct english word/phrase and 3 incorrect ones (distractors)."
          }
        },
        required: ["english", "chinese", "options"]
      }
    },
    kitchenOrders: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          chinese: { type: Type.STRING, description: "Translation of the sentence" },
          englishFull: { type: Type.STRING, description: "Complete English sentence" },
          ingredients: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "The words of the sentence broken apart"
          },
          distractors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2-3 extra words that don't belong in the sentence"
          }
        },
        required: ["chinese", "englishFull", "ingredients", "distractors"]
      }
    },
    matchingPairs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          english: { type: Type.STRING, description: "English word or short phrase" },
          chinese: { type: Type.STRING, description: "Chinese translation" }
        },
        required: ["english", "chinese"]
      },
      // UPDATE: Requesting more pairs to cover full content
      description: "Extract as many key word/phrase pairs as possible (aim for 20-30 pairs) to cover the entire text content comprehensively."
    },
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          english: { type: Type.STRING },
          chinese: { type: Type.STRING },
          visualPrompt: { type: Type.STRING, description: "A simple, child-friendly scene description. Focus on the main object or action described by the English text." }
        },
        required: ["english", "chinese", "visualPrompt"]
      }
    }
  },
  required: ["topic", "towerWords", "matchingPairs", "flashcards"]
};

export const generateGameContent = async (text: string, attachments: FileAttachment[] = []): Promise<LessonData> => {
  try {
    const parts: any[] = [];
    
    // Process Attachments
    if (attachments && attachments.length > 0) {
      attachments.forEach(file => {
        if (file.type === 'image' || file.type === 'pdf') {
            // PDF and Images can be sent as inline data
            parts.push({
                inlineData: {
                  mimeType: file.mimeType,
                  data: file.content
                }
            });
        } else if (file.type === 'text') {
            // Extracted text (e.g. from Word) is appended as text
            parts.push({
                text: `[Content from file: ${file.name}]:\n${file.content}\n`
            });
        }
      });
    }

    // Add main text prompt
    const promptIntro = attachments.length > 0 ? "Analyze these images/documents and the following text." : "Analyze this text:";
    parts.push({
        text: `${promptIntro} "${text}". Create game data for: 1. Multiple Choice Vocabulary (Tower), 2. Matching Pairs (Mix Match), 3. Visual Flashcards.`
    });

    const response = await getAi().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonSchema,
        systemInstruction: `You are an educational game designer. 
        1. Tower Words: Extract specific vocabulary or phrases DIRECTLY from the provided text/image/document. Do not invent words. For 'options', provide the correct word mixed with 3 confusing distractors.
        2. Matching Pairs: Extract key words, phrases, or short sentences and provide their Chinese translation. Create enough pairs (aim for 20-30) to cover ALL key content.
        3. Flashcards: Create a comprehensive set of flashcards covering ALL vocabulary words, key phrases, AND sentences found in the text. Do not summarize; include the actual content. Write a 'visualPrompt' for each that clearly depicts the meaning.
        Output pure JSON.`,
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from AI");

    const data = JSON.parse(jsonText) as any;
    
    const processedTowerWords = (data.towerWords || []).map((w: any) => ({
      ...w,
      options: w.options.sort(() => 0.5 - Math.random())
    }));

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      topic: data.topic || "English Adventure",
      towerWords: processedTowerWords,
      kitchenOrders: data.kitchenOrders || [],
      matchingPairs: data.matchingPairs || [],
      flashcards: data.flashcards || []
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export type ImageModelProvider = 
  | 'GEMINI' 
  | 'POLLINATIONS_DEFAULT' 
  | 'POLLINATIONS_ANIME' 
  | 'POLLINATIONS_REALISTIC'
  | 'POLLINATIONS_WATERCOLOR'
  | 'POLLINATIONS_TURBO';

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface GenerateImageOptions {
  prompt: string;
  provider: ImageModelProvider;
  aspectRatio: AspectRatio;
  referenceImageBase64?: string | null;
}

export const generateImage = async (options: GenerateImageOptions): Promise<string | null> => {
  const { prompt, provider, aspectRatio, referenceImageBase64 } = options;

  try {
    let styledPrompt = prompt;
    const qualityTags = ", sharp focus, 8k, high quality, masterpiece, vivid colors, highly detailed";

    if (provider.startsWith('POLLINATIONS')) {
        // Pollinations.ai - Free
        const seed = Math.floor(Math.random() * 1000000);
        let model = 'flux'; // Default to Flux for quality

        switch (provider) {
            case 'POLLINATIONS_ANIME':
                styledPrompt = prompt + ", anime style, studio ghibli, vibrant, cel shaded" + qualityTags;
                break;
            case 'POLLINATIONS_REALISTIC':
                styledPrompt = prompt + ", photorealistic, raw photo, cinematic lighting, photography" + qualityTags;
                break;
            case 'POLLINATIONS_WATERCOLOR':
                styledPrompt = prompt + ", watercolor painting, soft edges, artistic, dreamlike" + qualityTags;
                break;
            case 'POLLINATIONS_TURBO':
                model = 'turbo';
                styledPrompt = prompt + ", cartoon style, vibrant";
                break;
            case 'POLLINATIONS_DEFAULT':
            default:
                styledPrompt = prompt + ", children's book illustration, cartoon style, cute, vector art, white background" + qualityTags;
                break;
        }

        let width = 768;
        let height = 1024;
        switch (aspectRatio) {
            case '1:1': width = 1024; height = 1024; break;
            case '3:4': width = 768; height = 1024; break;
            case '4:3': width = 1024; height = 768; break;
            case '9:16': width = 576; height = 1024; break;
            case '16:9': width = 1024; height = 576; break;
        }

        const safePrompt = encodeURIComponent(styledPrompt);
        // CRITICAL UPDATE: Return the URL directly instead of fetching blob -> base64.
        const url = `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&seed=${seed}&width=${width}&height=${height}&model=${model}`;
        return url;

    } else {
        // Google Gemini (Requires API Key, returns Base64)
        const parts: any[] = [];
        if (referenceImageBase64) {
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64 }
            });
            parts.push({ text: styledPrompt + " . Cartoon style, maintain composition of source image but make it cute and colorful." });
        } else {
            const geminiPrompt = styledPrompt + " . Cartoon style, cute, colorful, children's book illustration, vector art, white background. No text.";
            parts.push({ text: geminiPrompt });
        }

        const response = await getAi().models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

export const evaluateAudio = async (text: string, audioBase64: string): Promise<{ score: number; feedback: string }> => {
  try {
    const response = await getAi().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
          { text: `Analyze audio for: "${text}". Return JSON: {score: integer(0-100), feedback: string(Chinese)}.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.INTEGER },
                feedback: { type: Type.STRING }
            },
            required: ["score", "feedback"]
        }
      }
    });
    
    const result = JSON.parse(response.text || '{}');
    return {
        score: result.score || 0,
        feedback: result.feedback || "无法评分"
    };
  } catch (error) {
    console.error("Audio evaluation error:", error);
    return { score: 0, feedback: "评分服务暂时不可用" };
  }
};