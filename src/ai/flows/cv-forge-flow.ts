'use server';

import { generateObject, generateWithPro, searchWithAI } from '@/ai/genkit';
import { z } from 'zod';

// --- SCHEMA DEFINITIONS ---

// The schema for extracting Style + Content from a PDF
// We keep this for TypeScript inference (type ExtractedResume)
const ExtractedResumeSchema = z.object({
  markdown: z.string().describe("The full resume content converted to clean Markdown format."),
  style: z.object({
    alignment: z.enum(['left', 'center', 'right']).describe("How is the Name and Contact Info header aligned?"),
    fontCategory: z.enum(['serif', 'sans', 'mono']).describe("Is the main font Serif (like Times) or Sans (like Arial)?"),
    headerCase: z.enum(['uppercase', 'titlecase']).describe("Are section headers (e.g. EXPERIENCE) written in ALL CAPS?"),
    hasUnderlines: z.boolean().describe("Do the section headers have a horizontal line separator underneath them?"),
    density: z.enum(['compact', 'comfortable']).describe("Is the page layout very tight/dense (small margins) or spacious?"),
  })
});

// Infer the type from the schema to use in TypeScript
type ExtractedResume = z.infer<typeof ExtractedResumeSchema>;

// Input/Output for standard generation
const CVForgeOutputSchema = z.object({
  markdownContent: z.string(),
  atsScorePrediction: z.number(),
  tailoringNotes: z.string(),
});

/**
 * Stage 2a: Import Resume (Text + Style Extraction)
 * Uses Vision model to "see" the layout and "read" the text.
 */
export async function importResumeFromPdf(pdfBase64: string): Promise<ExtractedResume> {
  const prompt = [
    { text: `
      TASK: Analyze this resume image and extract the content and styling rules.
      
      You MUST return a single valid JSON object. Do not include markdown formatting like \`\`\`json.
      
      The JSON object must have this EXACT structure:
      {
        "markdown": "The full text of the resume in clean Markdown format. Use headers (#, ##) and bullet points (-). Keep all dates and details exactly as they appear.",
        "style": {
          "alignment": "center" OR "left" (How is the Name/Header aligned?),
          "fontCategory": "serif" OR "sans" OR "mono" (Visual font style),
          "headerCase": "uppercase" OR "titlecase" (Are section titles like EXPERIENCE in all caps?),
          "hasUnderlines": true OR false (Do section headers have a line under them?),
          "density": "compact" OR "comfortable" (Is the text tight/dense or spacious?)
        }
      }
    `},
    { media: { url: `data:application/pdf;base64,${pdfBase64}` } }
  ];
  
  // FIX: Removed 'schema' option. We rely on the strict prompt instructions + responseMimeType in generateObject
  const result = await generateObject<ExtractedResume>(prompt, 'pro', { 
    maxOutputTokens: 8192, // High limit for full text extraction
    temperature: 0.2       // Low temperature for consistent JSON structure
  });

  return result;
}

/**
 * Stage 2b: Build Foundation from Profile/Form
 */
export async function generateResumeFromForm(formData: any, templateStyle: string): Promise<string> {
  const prompt = `
    You are a Professional Resume Writer. Create a resume in Markdown format based on the provided data.
    
    DATA:
    ${JSON.stringify(formData, null, 2)}

    STYLE INSTRUCTION:
    Format the markdown to match a "${templateStyle}" style.
    
    OUTPUT:
    Return ONLY the markdown content string. No JSON.
  `;
  
  const result = await generateWithPro(prompt, { maxOutputTokens: 4096 });
  return result.text;
}

/**
 * Stage 3: The Agentic Chat Refiner
 */
export async function refineResumeWithAgent(
  currentMarkdown: string, 
  userInput: string
): Promise<{ updatedMarkdown: string; reply: string }> {
  
  let context = "";

  // Check for external job links to crawl
  const isJobSearchRequest = /(http|https|job|role|description|analyze)/i.test(userInput);
  
  if (isJobSearchRequest) {
    try {
        // Use the standalone search tool to get job context
        context = await searchWithAI(`Extract job requirements and keywords from: ${userInput}`);
    } catch (e) {
        console.error("Search failed", e);
    }
  }

  const prompt = `
    You are a Resume Editor Agent. 
    CURRENT RESUME:
    ${currentMarkdown}

    USER INSTRUCTION:
    ${userInput}

    ${context ? `JOB CONTEXT (Tailor the resume for this): \n${context}` : ''}

    TASK:
    Update the resume based on the instruction.
    - If context is provided, inject keywords naturally.
    - Maintain valid Markdown structure.
    
    Return JSON: { "updatedMarkdown": "...", "reply": "short message" }
  `;

  return await generateObject<{ updatedMarkdown: string; reply: string }>(prompt, 'flash');
}