'use server';

import { generateWithPro, generateObject } from '@/ai/genkit';
import { z } from 'zod';
import { loadPrompt } from '../prompt-loader';

// --- Schemas ---
const FeedbackItemSchema = z.object({ Metric: z.string(), Evaluation: z.string(), Score: z.string() });
const QuestionPairSchema = z.object({ 
  QuestionNumber: z.string(), 
  Question: z.string(), 
  FinalScore: z.string(), 
  Feedback: z.array(FeedbackItemSchema), 
  PotentialAreasOfImprovement: z.string(), 
  IdealAnswer: z.string() 
});

const InterviewEvaluationSchema = z.object({ 
  FinalEvaluation: z.object({ 
    SoftSkillScore: z.string(), 
    OverallFeedback: z.string() 
  }), 
  QuestionPairs: z.array(QuestionPairSchema) 
});

export type InterviewEvaluation = z.infer<typeof InterviewEvaluationSchema>;

export interface InterviewInput {
  resumeText?: string;
  candidateName: string;
  jobRole: string;
  focusField: string;
  difficulty: 'easy' | 'intermediate' | 'hard';
  history: any[];
  userResponse: string;
}

export interface InterviewOutput {
  question: string;
  history: any[];
  evaluation?: InterviewEvaluation;
}

export async function conductInterview(input: InterviewInput): Promise<InterviewOutput> {
  const { resumeText, candidateName, jobRole, focusField, difficulty, history, userResponse } = input;

  // 1. Setup System Context
  const promptPathMap = { 
    easy: 'mock-interview/easy-prompt.md', 
    intermediate: 'mock-interview/intermediate-prompt.md', 
    hard: 'mock-interview/hard-prompt.md' 
  };
  
  const systemInstruction = loadPrompt(promptPathMap[difficulty], { 
    interviewerName: 'Disha', 
    candidate_name: candidateName, 
    job_role: jobRole, 
    focus_field: focusField, 
    resumeText: resumeText || 'No resume provided.' 
  });

  // 2. Build History
  // Format: [{ role: 'system' | 'user' | 'model', text: string }]
  const chatHistory = history.length > 0 
    ? history 
    : [{ role: 'system', text: systemInstruction }]; // Inject system prompt if first turn

  chatHistory.push({ role: 'user', text: userResponse });

  // 3. Check Termination Conditions
  const modelTurns = chatHistory.filter((m: any) => m.role === 'model' || m.role === 'bot').length;
  const targetTurns = difficulty === 'easy' ? 8 : difficulty === 'intermediate' ? 12 : 20;
  
  // Regex to detect if user wants to quit
  const userRequestedEnd = /\b(end|finish|stop|thank you|evaluation)\b/i.test(userResponse);
  const isEnding = userRequestedEnd || modelTurns >= targetTurns;

  // 4. Construct Prompt Context for the AI
  const conversationText = chatHistory
    .map((m: any) => `${m.role === 'user' ? 'Candidate' : (m.role === 'system' ? 'System Instruction' : 'Interviewer')}: ${m.text}`)
    .join('\n');

  try {
    if (isEnding) {
      // --- BRANCH A: Generate Evaluation (JSON) ---
      const evalPrompt = `
        ${conversationText}
        
    - The interview is now complete.
- Your next response MUST be ONLY the final evaluation JSON.
- Base your evaluation STRICTLY on the questions asked by the Interviewer and the answers provided by the Candidate in the TRANSCRIPT above.
- Do NOT include any questions in your evaluation that were not asked in the transcript.
- For each question-answer pair in the transcript, generate a corresponding entry in the "QuestionPairs" array.`;
;

      // Use generateObject to enforce strict JSON schema
      const evaluation = await generateObject<InterviewEvaluation>(
        evalPrompt, 
        'pro', // Use Pro model for better reasoning on long contexts
        undefined // We handle schema validation via Zod below for safety
      );

      // Add a final closing message to history
      chatHistory.push({ role: 'model', text: "Interview finished. Generating report..." });

      return {
        question: "Interview finished!",
        history: chatHistory,
        evaluation: evaluation // Returns the structured object
      };

    } else {
      // --- BRANCH B: Continue Interview (Text) ---
      const nextQuestionPrompt = `
        ${systemInstruction}

        TRANSCRIPT:
        ${conversationText}

        SYSTEM: Continue the interview. Respond as the Interviewer.
        - Acknowledge the candidate's last answer briefly.
        - Ask the next relevant question based on the job role and difficulty.
        - Keep it professional and concise.
        - Do not help the candidate like helping them completing the answer.
      `;

      const response = await generateWithPro(nextQuestionPrompt);
      const aiText = response.text;

      chatHistory.push({ role: 'model', text: aiText });

      return {
        question: aiText,
        history: chatHistory
      };
    }
  } catch (error) {
    console.error("Interview Flow Error:", error);
    throw new Error("Failed to process interview response.");
  }
}