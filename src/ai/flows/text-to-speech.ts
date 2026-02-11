'use server';

import { generateTTS } from '@/ai/genkit';
import { z } from 'zod';

const TextToSpeechInputSchema = z.object({
  text: z.string(),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audio: z.string().describe("The generated audio as a base64 encoded string."),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  // Call the centralized TTS helper
  const { audio } = await generateTTS(input.text);
  
  if (!audio) {
    throw new Error('No audio media was returned from the service.');
  }
  
  return { audio };
}