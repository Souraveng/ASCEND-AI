// File: src/ai/flows/resume-analysis.ts
'use server';

import { generateObject } from '../genkit';
import { z } from 'zod';

const ResumeAnalysisOutputSchema = z.object({
  name: z.string(),
  job_role: z.string(),
  focus_field: z.string(),
  summary: z.string(),
});

export type ResumeAnalysisInput = { file: FormData };
export type ResumeAnalysisOutput = z.infer<typeof ResumeAnalysisOutputSchema>;

export async function analyzeResume(input: ResumeAnalysisInput): Promise<ResumeAnalysisOutput> {
  try {
    const uploaded = input.file.get('file') as File;
    if (!uploaded) throw new Error('No file uploaded');

    const arrayBuffer = await uploaded.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    const promptParts = [
      { 
        text: `Analyze this PDF resume. Extract:
        - name (full name)
        - job_role (implied or stated)
        - focus_field (primary skill area)
        - summary (3-4 sentences)` 
      },
      { 
        media: { url: `data:application/pdf;base64,${base64Data}` } // Our genkit.ts formatContent handles this
      }
    ];

    // Using Pro model for better PDF extraction
    const result = await generateObject<ResumeAnalysisOutput>(promptParts, 'pro');

    return {
      name: result.name || 'Candidate',
      job_role: result.job_role || 'Software Engineer',
      focus_field: result.focus_field || 'Technology',
      summary: result.summary || 'Summary unavailable'
    };

  } catch (error) {
    console.error('Resume Analysis Error:', error);
    return {
      name: 'Candidate',
      job_role: 'Unknown',
      focus_field: 'Unknown',
      summary: 'Failed to analyze resume.'
    };
  }
}