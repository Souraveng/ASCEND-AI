'use server';

import { generateObject } from '@/ai/genkit';
import { z } from 'zod';
import { loadPrompt } from '../prompt-loader';

// --- Schema ---
const RoastResumeOutputSchema = z.object({
  roast_comments: z.array(z.string()).describe("Sarcastic, funny, yet professional critiques"),
  improvement_tips: z.array(z.string()).describe("Actually useful advice to fix the roasted parts"),
});

export type RoastResumeOutput = z.infer<typeof RoastResumeOutputSchema>;

export interface RoastResumeInput {
  pdfBase64: string;
  jobRole: string;
  field: string;
}

export async function roastResumeFlow(input: RoastResumeInput): Promise<RoastResumeOutput> {
  const { pdfBase64, jobRole, field } = input;

  const textPrompt = loadPrompt('torch-my-resume/roaster-prompt.md', {
    jobRole: jobRole,
    field: field,
  });

  const promptParts = [
    { text: textPrompt },
    { media: { url: `data:application/pdf;base64,${pdfBase64}` } }
  ];

  try {
    const result = await generateObject<RoastResumeOutput>(
      promptParts,
      'pro' // Using Pro for better image/PDF understanding
    );

    return result;
  } catch (error) {
    console.error("Roast Resume Error:", error);
    throw new Error("Failed to roast resume.");
  }
}