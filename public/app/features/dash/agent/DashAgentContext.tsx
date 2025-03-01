import { MessageContent } from '@langchain/core/messages';
import { createContext, useContext } from 'react';

export interface ChatMessage {
  id: string;
  content: MessageContent;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
}

export interface DashAgentContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  askMessage: (message: string) => Promise<void>;
}

export const DashAgentContext = createContext<DashAgentContextType | undefined>(undefined);

export const useDashAgent = (): [ChatMessage[], boolean, (message: string) => Promise<void>] => {
  const context = useContext(DashAgentContext);

  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }

  return [context.messages, context.isLoading, context.askMessage];
};
