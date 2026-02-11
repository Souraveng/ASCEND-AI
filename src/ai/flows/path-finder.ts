// File: src/ai/flows/path-finder.ts

import { generateObject, generateWithFlash } from "@/ai/genkit";

// ... scoreAnswers function remains identical (omitted for brevity) ...
export function scoreAnswers(answers: Record<string, any>) {
  const getLikertValue = (qid: string): number => {
    const val = answers[qid];
    if (typeof val === 'number' && val >= 1 && val <= 5) return val;
    return 3; 
  };
  const getStringValue = (qid: string): string => {
    const val = answers[qid];
    if (typeof val === 'object' && val?.selected) return val.text ? `${val.selected}: ${val.text}` : val.selected;
    return String(val ?? '');
  };

  const analytical = (getLikertValue("logicVsCreativity") + getLikertValue("problemSolvingStyle")) / 2;
  const creative = (6 - getLikertValue("logicVsCreativity"));
  const independence = getLikertValue("workStyle");
  const teamwork = 6 - independence;
  const stability = getLikertValue("workEnvironment");

  return {
    analytical: isNaN(analytical) ? 3 : analytical,
    creative: isNaN(creative) ? 3 : creative,
    teamwork: isNaN(teamwork) ? 3 : teamwork,
    independent: isNaN(independence) ? 3 : independence,
    stability: isNaN(stability) ? 3 : stability,
    education: getStringValue("educationLevel"),
    specialization: getStringValue("specialization"),
    industry_interest: getStringValue("industryPreference"),
    goal: getStringValue("dreamCareer") || getStringValue("futureVision"),
    constraint: getStringValue("constraints"),
  };
}

// ---------- Gemini Explain Roles (For Signup) ----------
export async function geminiExplainRoles(scores: Record<string, any>, answers: Record<string, any>) {
    const prompt = `
The user has completed a 20-question career questionnaire.
  Scores: ${JSON.stringify(scores, null, 2)}
  Answers: ${JSON.stringify(answers, null, 2)}
  Task:
  1. Suggest the top 3 broad career **fields of interest** (e.g., Data Science, Cloud Computing, UX/UI Design).
  2. Do not suggest specific job roles.
  3. Return strictly as JSON: { "fields": ["Field 1", "Field 2", "Field 3"] }`;

    try {
      // Use helper for strict JSON
      const result = await generateObject<{ fields: string[] }>(prompt, 'flash');
      return result.fields || [];
    } catch (e) {
      console.error("Gemini Role Error:", e);
      return [];
    }
}

// ---------- Gemini Explain Full ----------
export async function geminiExplainFull(scores: Record<string, any>, answers: Record<string, any>) {
    const prompt = `
  The user has completed a 20-question career questionnaire.

  Scores:
  ${JSON.stringify(scores, null, 2)}

  Answers:
  ${JSON.stringify(answers, null, 2)}

  Task:
  1. Suggest exactly 3 career paths that match their profile.
  2. For each path, provide:
    - "role": The role name (string)
    - "why_it_fits": 2-3 sentences on why this role matches
    - "how_to_prepare": 2-3 bullet points with concrete preparation steps
  3. Return strictly JSON in this schema:
  {
    "scores": { "analytical": number, "creative": number, /* ...etc */ },
    "roles": [
      {
        "role": "string",
        "why_it_fits": "string",
        "how_to_prepare": ["point1", "point2", "point3"]
      }
    ]
  }`;

    try {
      const result = await generateObject<any>(prompt, 'flash');
      return {
        scores: result.scores ?? scores,
        roles: result.roles ?? [],
      };
    } catch {
      return { scores, roles: [] };
    }
}

// ---------- Gemini Generate Roadmap ----------
export async function geminiGenerateRoadmap(scores: Record<string, any>, answers: Record<string, any>, selectedRole: string) {
    const prompt = `
    A user has completed a career questionnaire and selected their desired career path.
    Selected Career Path: ${selectedRole}
    User's Scores: ${JSON.stringify(scores, null, 2)}
    User's Answers: ${JSON.stringify(answers, null, 2)}

    Task:
    Generate a detailed, personalized career roadmap. Return a JSON object with this structure:
    {
      "introduction": "Brief, encouraging intro.",
      "timeline_steps": [
        { 
          "duration": "Months 0-3: Foundation", 
          "title": "Build Core Skills",
          "description": "Focus on the fundamentals to create a strong base.",
          "details": [
            { "category": "Skills to Learn", "items": ["Skill 1", "Skill 2"] },
            { "category": "Projects to Build", "items": ["Simple project idea"] },
            { "category": "Key Actions", "items": ["Action 1", "Action 2"] }
          ]
        },
        { 
          "duration": "Months 4-6: Application", 
          "title": "Apply Your Knowledge",
          "description": "Move from theory to practice by building tangible things.",
          "details": [
            { "category": "Skills to Master", "items": ["Advanced Skill 1"] },
            { "category": "Projects to Build", "items": ["Intermediate project idea"] },
            { "category": "Key Actions", "items": ["Action 1", "Action 2"] }
          ]
        }
      ],
      "final_advice": "A concluding motivational tip."
    }
    Ensure the response is strictly in the specified JSON format and provides at least 3-4 and more timeline steps.`;

    
    try {
      return await generateObject(prompt, 'flash');
    } catch {
      return null;
    }
}