// src/ai/schemas.ts
import { z } from 'zod';

// --- Job Crawler Schemas ---
export const JobDetailsSchema = z.object({
  jobTitle: z.string().describe("The official job title"),
  company: z.string().describe("The company name"),
  location: z.string().optional().describe("The job location (e.g., city, remote)"),
  requiredSkills: z.array(z.string()).describe("List of essential technical and soft skills."),
  experienceLevel: z.string().describe("Years of experience or level (e.g., Junior, Senior, Lead)"),
  responsibilities: z.array(z.string()).describe("Key responsibilities as bullet points"),
  descriptionSummary: z.string().describe("A concise 2-3 sentence summary of the job description"),
});

export type JobDetails = z.infer<typeof JobDetailsSchema>;

// --- CV Forge Schemas ---
export const CVForgeInputSchema = z.object({
  userProfile: z.string().describe("JSON string of the user's current profile."),
  jobDetails: JobDetailsSchema.optional().describe("The structured job details object from the crawler agent."),
  customInstructions: z.string().optional().describe("User's specific requests."),
});

export type CVForgeInput = z.infer<typeof CVForgeInputSchema>;

export const CVForgeOutputSchema = z.object({
  markdownContent: z.string().describe("The full resume content in Markdown format."),
  atsScorePrediction: z.number().min(0).max(100).describe("A predicted ATS match score (0-100)."),
  tailoringNotes: z.string().describe("A brief explanation of how the resume was tailored."),
});

export type CVForgeOutput = z.infer<typeof CVForgeOutputSchema>;