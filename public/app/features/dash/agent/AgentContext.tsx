import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SystemPromptTemplate } from './system-prompt';

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
  const systemMessage: SystemMessage = new SystemMessage(SystemPromptTemplate);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [langchainMessages, setLangchainMessages] = useState<Array<HumanMessage | AIMessageChunk | SystemMessage>>([
    systemMessage,
  ]);

  // Recursive function to handle tool calls
  const handleToolCalls = useCallback(
    async (
      aiMessage: AIMessageChunk,
      currentMessages: Array<HumanMessage | AIMessageChunk>,
      callCount = 0,
      maxCalls = 20
    ) => {
      // Base case: no tool calls or reached max calls
      if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0 || callCount >= maxCalls) {
        return;
      }

      // Process each tool call
      for (const toolCall of aiMessage.tool_calls) {
        const selectedTool = toolsByName[toolCall.name];
        if (selectedTool) {
          // Execute the tool
          const toolMessage = await selectedTool.invoke(toolCall);

          // Update LangChain messages with tool response
          setLangchainMessages((prev) => [...prev, toolMessage]);

          // Get next response after tool execution
          const nextMessages = [...currentMessages, aiMessage, toolMessage];
          const nextAiMessage: AIMessageChunk = await agent.invoke(nextMessages);

          // Add AI message to UI
          const nextAiChatMessage: ChatMessage = {
            id: (Date.now() + callCount).toString(),
            content: nextAiMessage.content,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, nextAiChatMessage]);

          // Update LangChain messages with AI response
          setLangchainMessages((prev) => [...prev, nextAiMessage]);

          // Recursively handle any further tool calls
          await handleToolCalls(nextAiMessage, nextMessages, callCount + 1, maxCalls);
        }
      }
    },
    []
  );

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

        // Handle tool calls recursively
        await handleToolCalls(aiMessage, updatedLangchainMessages);
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
    [langchainMessages, handleToolCalls]
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
