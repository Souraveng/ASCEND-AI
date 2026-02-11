'use server';

import { searchWithAI } from '@/ai/genkit';

export async function fetchJobDescriptionFromUrl(url: string): Promise<string | null> {
  // We use the existing grounded search agent
  const query = `Go to this URL: ${url}. 
  
  Task: Extract the full Job Description text. 
  
  Output: Return ONLY the raw text content (Responsibilities, Requirements, Skills). 
  If the link is invalid or not a job posting, return exactly: "INVALID_JOB_POST"`;

  try {
    const result = await searchWithAI(query, 'flash'); // Flash is fast and good for extraction

    if (result.includes("INVALID_JOB_POST") || result.length < 50) {
      return null;
    }
    
    return result;
  } catch (error) {
    console.error("JD Fetch Error:", error);
    return null;
  }
}