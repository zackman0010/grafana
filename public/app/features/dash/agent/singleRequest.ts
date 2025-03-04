import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import { workflowAgent } from './agent';

export interface SingleRequestOptions {
  systemPrompt?: string;
  userMessage: string;
}

export async function makeSingleRequest({ systemPrompt, userMessage }: SingleRequestOptions): Promise<string> {
  const messages = [];

  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }

  messages.push(new HumanMessage(userMessage));

  try {
    const response = await workflowAgent.llm.invoke(messages);
    return response.content.toString();
  } catch (error) {
    return `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
