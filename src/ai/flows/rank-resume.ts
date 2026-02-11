'use server';

import { generateObject } from '@/ai/genkit';
import { z } from 'zod';
import { loadPrompt } from '../prompt-loader';

// --- Schema ---
const RankResumeOutputSchema = z.object({
  match_score: z.number().describe("0-100 score of how well the resume matches the role"),
  strengths: z.string().describe("Key strong points"),
  weaknesses: z.string().describe("Areas lacking"),
  keywords_missing: z.array(z.string()).describe("Important keywords from the industry missing in the resume"),
  final_recommendation: z.string().describe("Actionable advice"),
});

export type RankResumeOutput = z.infer<typeof RankResumeOutputSchema>;

export interface RankResumeInput {
  pdfBase64: string;
  jobRole: string;
  field: string;
  jobDescription?: string; // <--- NEW OPTIONAL FIELD
}

export async function rankResumeFlow(input: RankResumeInput): Promise<RankResumeOutput> {
  const { pdfBase64, jobRole, field, jobDescription } = input;

  // 1. Load the text prompt
  let textPrompt = loadPrompt('torch-my-resume/ranker-prompt.md', {
    jobRole: jobRole,
    field: field,
  });

  // 2. Inject Specific JD if available
  if (jobDescription && jobDescription.length > 50) {
    textPrompt += `\n\nCRITICAL INSTRUCTION: Ignore generic assumptions about the role "${jobRole}". \nCompare the resume data strictly against the following provided JOB DESCRIPTION:\n\n"""\n${jobDescription}\n"""\n\nCalculate the match score and missing keywords based ONLY on the requirements listed above.`;
  }

  // 3. Construct Multimodal Prompt
  const promptParts = [
    { text: textPrompt },
    { media: { url: `data:application/pdf;base64,${pdfBase64}` } }
  ];

  try {
    // 4. Generate strict JSON
    const result = await generateObject<RankResumeOutput>(
      promptParts,
      'pro' 
    );

    return result;
  } catch (error) {
    console.error("Rank Resume Error:", error);
    throw new Error("Failed to rank resume. Ensure the PDF is valid.");
  }
}