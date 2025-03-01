import { MessageContent } from '@langchain/core/messages';

import { ChatMessage } from './DashAgentContext';

const getCurrentTimeInSeconds = (): number => Math.floor(Date.now() / 1000);

export const getDefaultTimeRange = (): { start: number; end: number } => {
  const end = getCurrentTimeInSeconds();
  const start = end - 3600; // Last hour (3600 seconds)
  return { start, end };
};

export function getMessage(content: string | MessageContent, sender: 'user' | 'ai' | 'system', idInc = 0): ChatMessage {
  const timestamp = new Date();

  return {
    id: (timestamp.getTime() + idInc).toString(),
    content,
    sender,
    timestamp,
  };
}

export function getUserMessage(content: string, idInc = 0): ChatMessage {
  return getMessage(content, 'user', idInc);
}

export function getAiMessage(content: MessageContent, idInc = 1): ChatMessage {
  return getMessage(content, 'ai', idInc);
}

export function getSystemMessage(content: string, idInc = 3): ChatMessage {
  return getMessage(content, 'system', idInc);
}
