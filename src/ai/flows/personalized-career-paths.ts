'use server';

import { generateObject } from '@/ai/genkit';
import { z } from 'zod';

// --- Schemas ---
const SuggestCareerPathsInputSchema = z.object({
  resumeText: z.string(),
});
export type SuggestCareerPathsInput = z.infer<typeof SuggestCareerPathsInputSchema>;

const CareerPathSchema = z.object({
  title: z.string(),
  reason: z.string(),
  next: z.array(z.string()),
});

// The UI expects an array of these objects
export type SuggestCareerPathsOutput = z.infer<typeof CareerPathSchema>[];

// --- Flow Implementation ---
export async function suggestCareerPaths(input: SuggestCareerPathsInput): Promise<SuggestCareerPathsOutput> {
  const prompt = `
    You are an expert career counselor. Given the following resume text, suggest 3 potential career paths for the user.
    
    RESUME TEXT:
    ${input.resumeText}

    TASK:
    1. Analyze the skills and experience.
    2. Suggest 3 distinct career paths.
    3. Explain why each fits.
    4. Suggest specific skills to learn next.

    OUTPUT FORMAT:
    Return a JSON object with a "paths" array.
    {
      "paths": [
        { 
          "title": "Job Title", 
          "reason": "Why it fits...", 
          "next": ["Skill 1", "Skill 2"] 
        }
      ]
    }
  `;

  try {
    // We define a temporary interface for the raw LLM response
    type WrapperResponse = { paths: SuggestCareerPathsOutput };
    
    const result = await generateObject<WrapperResponse>(prompt, 'flash');
    
    return result.paths || [];
  } catch (error) {
    console.error("Career Path Suggestion Error:", error);
    // Return empty array on failure to prevent UI crash
    return [];
  }
}