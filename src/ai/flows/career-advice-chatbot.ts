// File: src/ai/flows/career-advice-chatbot.ts
'use server';

import { generateWithFlash } from '@/ai/genkit';
import { loadPrompt } from '../prompt-loader';

type Message = {
  role: 'user' | 'bot' | 'system';
  text: string;
};

export interface CareerAdviceChatbotInput {
  userInput: string;
  history?: Message[];
  userProfileJson?: string;
}

export interface CareerAdviceChatbotOutput {
  advice: string;
}

export async function careerAdviceChatbot(input: CareerAdviceChatbotInput): Promise<CareerAdviceChatbotOutput> {
  const { userInput, history = [], userProfileJson } = input;

  const systemPrompt = loadPrompt('chatbot/career-chatbot.md', {
    userProfileJson: userProfileJson || 'No profile data provided. Provide generic advice.',
  });

  const formattedHistory = history
    .map((message) => `${message.role === 'user' ? 'User' : 'AI'}: ${message.text}`)
    .join('\n');

  const finalPrompt = `${systemPrompt}\n\nHere is the conversation history:\n${formattedHistory}\n\nUser: ${userInput}\nAI:`;

  const response = await generateWithFlash(finalPrompt);

  return { advice: response.text };
}