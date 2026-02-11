'use server';

import { generateObject } from '@/ai/genkit';
import { z } from 'zod';

const ExtractSkillsInputSchema = z.object({
  resumeText: z.string(),
});
export type ExtractSkillsFromResumeInput = z.infer<typeof ExtractSkillsInputSchema>;

const ExtractSkillsOutputSchema = z.object({
  skills: z.array(z.string()),
});
export type ExtractSkillsFromResumeOutput = z.infer<typeof ExtractSkillsOutputSchema>;

export async function extractSkillsFromResume(input: ExtractSkillsFromResumeInput): Promise<ExtractSkillsFromResumeOutput> {
  const prompt = `
    You are a resume parsing expert. 
    Extract a list of technical and soft skills from the resume below.
    
    RESUME:
    ${input.resumeText}
    
    Return strict JSON: { "skills": ["skill1", "skill2", ...] }
  `;

  try {
    return await generateObject<ExtractSkillsFromResumeOutput>(prompt, 'flash');
  } catch (error) {
    console.error("Skill Extraction Error:", error);
    return { skills: [] };
  }
}