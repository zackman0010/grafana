import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessageChunk, HumanMessage, MessageContent } from '@langchain/core/messages';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import { ANTHROPIC_API_KEY } from './api-key';
import { tools, toolsByName } from './tools';

// Define the message type
export interface ChatMessage {
  id: string;
  content: MessageContent;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Initialize the LLM
const llm = new ChatAnthropic({
  model: 'claude-3-7-sonnet-20250219',
  temperature: 0,
  apiKey: ANTHROPIC_API_KEY,
});

// Create the agent
const agent = llm.bindTools(tools);

// Define the context type
interface AgentContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  askMessage: (message: string) => Promise<void>;
}

// Create the context
const AgentContext = createContext<AgentContextType | undefined>(undefined);

// Create the provider component
interface AgentProviderProps {
  children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [langchainMessages, setLangchainMessages] = useState<Array<HumanMessage | AIMessageChunk>>([]);

  const askMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) {
        return;
      }

      // Add user message to UI
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: message,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Set loading state
      setIsLoading(true);

      try {
        // Create a human message for LangChain
        const humanMessage = new HumanMessage(message);

        // Update LangChain messages
        const updatedLangchainMessages = [...langchainMessages, humanMessage];
        setLangchainMessages(updatedLangchainMessages);

        // Invoke the agent
        const aiMessage: AIMessageChunk = await agent.invoke(updatedLangchainMessages);

        // Add AI message to UI
        const aiChatMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: aiMessage.content,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiChatMessage]);

        // Update LangChain messages with AI response
        setLangchainMessages((prev) => [...prev, aiMessage]);

        // Handle tool calls if any
        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
          for (const toolCall of aiMessage.tool_calls) {
            const selectedTool = toolsByName[toolCall.name];
            if (selectedTool) {
              // Execute the tool
              const toolMessage = await selectedTool.invoke(toolCall);

              // Update LangChain messages with tool response
              setLangchainMessages((prev) => [...prev, toolMessage]);

              // Get final response after tool execution
              const finalAiMessage: AIMessageChunk = await agent.invoke([
                ...updatedLangchainMessages,
                aiMessage,
                toolMessage,
              ]);

              // Add final AI message to UI
              const finalAiChatMessage: ChatMessage = {
                id: (Date.now() + 2).toString(),
                content: finalAiMessage.content,
                sender: 'ai',
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, finalAiChatMessage]);

              // Update LangChain messages with final AI response
              setLangchainMessages((prev) => [...prev, finalAiMessage]);
            }
          }
        }
      } catch (error) {
        console.error('Error in agent communication:', error);

        // Add error message to UI
        const errorMessage: ChatMessage = {
          id: (Date.now() + 3).toString(),
          content: 'Sorry, there was an error processing your request. Please try again.',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [langchainMessages]
  );

  return <AgentContext.Provider value={{ messages, isLoading, askMessage }}>{children}</AgentContext.Provider>;
};

// Create the hook
export const useAgent = (): [ChatMessage[], boolean, (message: string) => Promise<void>] => {
  const context = useContext(AgentContext);

  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }

  return [context.messages, context.isLoading, context.askMessage];
};
