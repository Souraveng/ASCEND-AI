// File: src/ai/genkit.ts
import { GoogleGenAI } from '@google/genai';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as dotenv from "dotenv";

dotenv.config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "";
const location = process.env.GOOGLE_CLOUD_LOCATION || "global";

if (!projectId) {
  console.warn("GOOGLE_CLOUD_PROJECT_ID is not set.");
}

// Initialize the Google Gen AI Client for Vertex AI
const client = new GoogleGenAI({
  vertexai: true,
  project: projectId,
  location: location,
});

// Models
export const FLASH_MODEL = "gemini-3-flash-preview"; 
export const PRO_MODEL   = "gemini-3-pro-preview"; 

// ---------- Types ----------
export interface AIResult {
  text: string;
  output: string;
  raw: any;
}

export interface TTSResult {
  audio: string | null;
  raw: unknown;
}

// --- Helper to format prompt for GoogleGenAI ---
function formatContent(prompt: any): any[] {
  if (typeof prompt === 'string') {
    return [{ role: 'user', parts: [{ text: prompt }] }];
  }
  if (Array.isArray(prompt)) {
    const parts = prompt.map((p: any) => {
      if (typeof p === 'string') return { text: p };
      if (p.text) return { text: p.text };
      if (p.media && p.media.url) {
        if (p.media.url.startsWith('data:')) {
          const [header, base64Data] = p.media.url.split(',');
          const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
          return { inlineData: { mimeType, data: base64Data } };
        }
        return { fileData: { fileUri: p.media.url } };
      }
      return null;
    }).filter(Boolean);
    return [{ role: 'user', parts }];
  }
  return [];
}

// ---------- Standalone Search Utility ----------

/**
 * REUSABLE GOOGLE SEARCH FUNCTION
 * Grounded search agent that can be called independently anywhere.
 */
export async function searchWithAI(query: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> {
  const modelName = modelType === 'pro' ? PRO_MODEL : FLASH_MODEL;
  
  // Define the grounding tool
  const groundingTool = {
    googleSearch: {},
  };

  // Define the config with tools
  const config = {
    tools: [groundingTool],
  };

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config,
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "No information found.";
    return text;
  } catch (error) {
    console.error("Standalone AI Search Error:", error);
    throw new Error("Google Search Agent failed to fetch live data.");
  }
}

// ---------- Wrappers ----------

/**
 * Generates content using the Flash model.
 */
export async function generateWithFlash(prompt: any, options: any = {}): Promise<AIResult> {
  try {
    const { tools, ...generationConfig } = options;

    const requestParams: any = {
      model: FLASH_MODEL,
      contents: formatContent(prompt),
      config: generationConfig, 
    };

    if (tools) {
      requestParams.config.tools = tools; 
    }

    const response = await client.models.generateContent(requestParams);
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { text, output: text, raw: response };
  } catch (error) {
    console.error("AI Generation Error (Flash):", error);
    throw error;
  }
}

/**
 * Generates content using the Pro model.
 */
export async function generateWithPro(prompt: any, options: any = {}): Promise<AIResult> {
  try {
    const { tools, ...generationConfig } = options;

    const requestParams: any = {
      model: PRO_MODEL,
      contents: formatContent(prompt),
      config: generationConfig,
    };

    if (tools) {
      requestParams.config.tools = tools;
    }

    const response = await client.models.generateContent(requestParams);
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { text, output: text, raw: response };
  } catch (error) {
    console.error("AI Generation Error (Pro):", error);
    throw error;
  }
}

/**
 * Helper to generate structured JSON objects directly.
 */
export async function generateObject<T>(
  prompt: any, 
  modelType: 'flash' | 'pro' = 'flash',
  options: any = {} 
): Promise<T> {
  
  const config: any = {
    responseMimeType: 'application/json',
    ...options 
  };
  
  const { text } = await (modelType === 'pro' ? generateWithPro(prompt, config) : generateWithFlash(prompt, config));
  
  try {
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch (e) {
    console.error("JSON Parse Error. Raw Text:", text);
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ---------- TTS Function ----------
export async function generateTTS(text: string): Promise<TTSResult> {
  const ttsClient = new TextToSpeechClient();

  const request = {
    input: { text: text },
    voice: { languageCode: 'en-IN', name: 'en-IN-Wavenet-D' },
    audioConfig: { audioEncoding: 'MP3' as const },
  };

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent;
    
    if (audioContent instanceof Uint8Array) {
        const audioBase64 = Buffer.from(audioContent).toString('base64');
        return {
            audio: audioBase64,
            raw: response,
        };
    }
    throw new Error('Invalid audio content received from the API.');

  } catch (error) {
    console.error("Error calling Google Cloud Text-to-Speech API:", error);
    throw new Error("Failed to generate speech. Ensure the API is enabled.");
  }
}

// --- Genkit-style Flow Shim ---
export const ai = {
  defineFlow: (config: any, fn: Function) => fn, 
};