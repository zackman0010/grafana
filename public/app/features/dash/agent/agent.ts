import { ChatAnthropic } from '@langchain/anthropic';

import { tools } from './tools';

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export function createAgent() {
  const llm = new ChatAnthropic({
    model: 'claude-3-7-sonnet-20250219',
    temperature: 0,
    apiKey: ANTHROPIC_API_KEY,
  });

  return llm.bindTools(tools);
}

// Create initial agent instance
export const agent = createAgent();
