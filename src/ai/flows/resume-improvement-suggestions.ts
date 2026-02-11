'use server';

import { generateWithFlash } from '@/ai/genkit';
import { z } from 'zod';

const ResumeImprovementInputSchema = z.object({
  resumeText: z.string(),
});
export type ResumeImprovementInput = z.infer<typeof ResumeImprovementInputSchema>;

const ResumeImprovementOutputSchema = z.object({
  suggestions: z.string(),
});
export type ResumeImprovementOutput = z.infer<typeof ResumeImprovementOutputSchema>;

export async function getResumeImprovementSuggestions(input: ResumeImprovementInput): Promise<ResumeImprovementOutput> {
  const prompt = `
    You are a resume expert. Review the following resume and provide suggestions for improvement.

    Resume:
    ${input.resumeText}

    Provide specific, actionable suggestions for improvement, such as rephrasing sentences, quantifying achievements, or adding missing keywords. 
    Focus on improving the overall quality and effectiveness.
    
    Return the advice as plain text (Markdown is okay).
  `;

  try {
    const result = await generateWithFlash(prompt);
    return { suggestions: result.text };
  } catch (error) {
    console.error("Resume Improvement Error:", error);
    return { suggestions: "Unable to generate suggestions at this time." };
  }
}