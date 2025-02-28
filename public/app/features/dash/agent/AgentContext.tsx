import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import { ANTHROPIC_API_KEY } from './api-key';
import { SystemPromptTemplate } from './system-prompt';
import { tools, toolsByName } from './tools';

// Define the message type
export interface ChatMessage {
  id: string;
  content: MessageContent;
  sender: 'user' | 'ai' | 'system';
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

      //todo(cyriltovena): We should add a system message to ask LLM to check if we need to find a metrics name.
      // If yes, we should fork the conversation to a new thread to first find the metrics name and potentially labels selectors.
      // This will allow us to reduce the main conversation size, and drop any tool results that are not relevant anymore.
      // This is basically what we call starting a new langchain !

      // In this discovery metrics conversation, we should teach LLM to use selector to find metrics
      //  aka count by (__name__)({pod=pod-123}) which returns less broad results than label/__name__/values api calls.
      // May be a good workflow
      // 1. find label names that are revelant.
      // 2. find relevant values for these labels.
      // 3. verify if the metrics is a popular one, if yes, see if it exits and get labels names. match[]=<series_selector>
      // 4. try to find metrics names that are relevant for these values via instant query count by (__name__)({namespace="loki-dev-005"}) using regex.
      // 5. try to find metrics name using label/__name__/values

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
          sender: 'system',
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
