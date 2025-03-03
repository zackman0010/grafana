import { AIMessageChunk, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ReactNode, useCallback, useMemo, useState } from 'react';

import { DashAgentContext, ChatMessage } from './DashAgentContext';
import { agent } from './agent';
import { generateSystemPrompt } from './systemPrompt';
import { toolsByName } from './tools';
import { getAiMessage, getSystemMessage, getUserMessage } from './utils';

export const DashAgentProvider = ({ children }: { children: ReactNode }) => {
  const systemMessage = useMemo(() => new SystemMessage(generateSystemPrompt()), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [langchainMessages, setLangchainMessages] = useState<Array<HumanMessage | AIMessageChunk | SystemMessage>>([
    systemMessage,
  ]);

  const handleToolCalls = useCallback(
    async (
      aiMessage: AIMessageChunk,
      currentMessages: Array<HumanMessage | AIMessageChunk>,
      callCount = 0,
      maxCalls = 20
    ) => {
      if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0 || callCount >= maxCalls) {
        return;
      }

      for (const toolCall of aiMessage.tool_calls) {
        const selectedTool = toolsByName[toolCall.name];
        if (selectedTool) {
          const toolMessage = await selectedTool.invoke(toolCall);
          setLangchainMessages((prev) => [...prev, toolMessage]);
          const nextMessages = [...currentMessages, aiMessage, toolMessage];
          const nextAiMessage = await agent.invoke(nextMessages);
          setMessages((prev) => [...prev, getAiMessage(nextAiMessage.content, callCount)]);
          setLangchainMessages((prev) => [...prev, nextAiMessage]);
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

      setMessages((prev) => [...prev, getUserMessage(message)]);
      setIsLoading(true);

      try {
        const updatedLangchainMessages = [...langchainMessages, new HumanMessage(message)];
        setLangchainMessages(updatedLangchainMessages);
        const aiMessage = await agent.invoke(updatedLangchainMessages);
        setMessages((prev) => [...prev, getAiMessage(aiMessage.content)]);
        setLangchainMessages((prev) => [...prev, aiMessage]);
        await handleToolCalls(aiMessage, updatedLangchainMessages);
      } catch (error) {
        console.error('Error in agent communication:', error);
        setMessages((prev) => [
          ...prev,
          getSystemMessage('Sorry, there was an error processing your request. Please try again.'),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [langchainMessages, handleToolCalls]
  );

  return <DashAgentContext.Provider value={{ messages, isLoading, askMessage }}>{children}</DashAgentContext.Provider>;
};
