import { ChatAnthropic } from '@langchain/anthropic';
import { StructuredTool } from '@langchain/core/tools';

import { tools } from './tools';

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const llm = new ChatAnthropic({
  model: 'claude-3-5-sonnet-latest',
  temperature: 0,
  apiKey: ANTHROPIC_API_KEY,
});

export function getAgent() {
  return {
    llm: llm,
    tools: tools,
    withTools: (tools: StructuredTool[]) => llm.bindTools(tools),
  };
}
