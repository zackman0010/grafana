import { StructuredTool } from '@langchain/core/tools';
import { ChatAnthropic } from '@langchain/anthropic';
import { tools } from './tools';

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const llm = new ChatAnthropic({
  model: 'claude-3-7-sonnet-20250219',
  temperature: 0,
  apiKey: ANTHROPIC_API_KEY,
});

export const agent = llm.bindTools(tools);

export const workflowAgent = {
  llm: llm,
  tools: tools,
  withTools(tools: StructuredTool[]) {
    return llm.bindTools(tools);
  },
};
