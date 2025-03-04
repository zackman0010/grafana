import { listDatasourcesTool } from './tools/listDatasources';
import { prometheusLabelValuesTool } from './tools/prometheusLabelValues';
import { prometheusLabelNamesTool } from './tools/prometheusLabelNames';
import { prometheusInstantQueryTool } from './tools/prometheusInstantQuery';
import { prometheusRangeQueryTool } from './tools/prometheusRangeQuery';
import { dashboardPanelsTool } from './tools/dashboardPanels';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { Annotation, END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph/web';
import { messagesStateReducer } from '@langchain/langgraph/web';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  MessageContent,
  MessageContentComplex,
  MessageContentText,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { workflowAgent } from './agent';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { RunnableConfig } from '@langchain/core/runnables';
import { tools } from './tools';

// Custom message reducer that merges AI messages and filters out tool messages
const customMessagesReducer = (currentMessages: BaseMessage[] = [], newMessages: BaseMessage[] = []): BaseMessage[] => {
  const mergedResponse = messagesStateReducer(currentMessages, newMessages);

  // If the last message is a tool call, we need go through the rest of the message and compress AIMessage with tool call summary
  const lastMessage = mergedResponse[mergedResponse.length - 1];
  if (lastMessage instanceof AIMessage) {
    const aiMessage = lastMessage as AIMessage;
    const inProgressToolCalls = aiMessage.tool_calls?.filter((toolCall) => toolCall.id);

    // todo remove ToolMessage and AIMessage that have matching tool_call_id that and are not in inProgressToolCalls but compressed into a last AIMessage with their respective AIMessage text.

    const compressedMessages: BaseMessage[] = [];
    for (const message of mergedResponse.slice(0, -1)) {
      if (message instanceof AIMessage) {
        // If there are tool calls that are completed or no tool calls at all, compress the message
        if (
          !message.tool_calls?.length ||
          message.tool_calls.some(
            (toolCall) => !inProgressToolCalls || !inProgressToolCalls.map((t) => t.id).includes(toolCall.id ?? '')
          )
        ) {
          if (typeof message.content === 'string') {
            compressedMessages.push(
              new AIMessage({
                content: message.content as string,
                id: message.id ?? '',
              })
            );
            continue;
          }
          let compressedThoughts = '';
          if (message.content as MessageContentComplex[]) {
            for (const content of message.content as MessageContentComplex[]) {
              if (content.type === 'text') {
                compressedThoughts += content.text;
              }
            }
          }
          if (compressedThoughts) {
            compressedMessages.push(
              new AIMessage({
                content: compressedThoughts,
                id: message.id ?? '',
              })
            );
          }
        }
      }
      if (message instanceof ToolMessage) {
        // if the ToolMessage is not in inProgressToolCalls, then it's a completed tool call we can remove
        if (!inProgressToolCalls!.filter((toolCall) => toolCall.id === message.tool_call_id).length) {
          continue;
        }
        compressedMessages.push(message);
      }
      if (message instanceof HumanMessage) {
        compressedMessages.push(message);
      }
    }

    compressedMessages.push(aiMessage);
    console.log('compressedMessages', compressedMessages);
    return compressedMessages;
  }
  return mergedResponse;
};

function getLastTextMessage(messages: MessageContent): string {
  let text = '';
  if (typeof messages === 'string') {
    return messages;
  }
  for (const message of messages) {
    if (message.type === 'text') {
      text = message.text;
    }
  }
  return text;
}

export function createReactAgent() {
  const contextGatheringPrompt = `
You are a helpful assistant for Grafana. You can help users understand their data and visualizations.
You're a veteran SRE engineer and knows about Grafana ecosystem and Grafana Cloud.
You excel at understanding the user's question and use the right tools to gather information and provide responses to user queries.


You can use the tools available to you to gather information and provide responses to user queries.


Defines a plan of action step by step and returns it the first time.

Then fetch the information you need using the tools provided to you provided

At each step, provide a summary of the information you have gathered so far in your responses.

Summary:
- If found the following datasources:
  - datasource1
  - datasource2
- If found the following panels:
  - panel1
  - panel2
- If found the following interesting metrics:
  - cpu_usage{{namespace="loki-dev-005"}}
- If found the following interesting labels:
  - namespace
  - pod
  - container
- If found something interesting in the data queries:
  - Observation/Summary about a metric range query
  - Observation/Summary about a metric instant query
  - Observation/Summary about a metric label values
  - Observation/Summary about a metric label names
  - Observation/Summary about a metric metadata
  - Observation/Summary about a metric series
  - Observation/Summary about a metric series labels
  - Observation/Summary about a metric series values

You should think about you current state and what you need to do next.

Once you have gathered all the information you need, provide the final answer to the user's query in json format as defined below:
Summary:
- FinalAnswer:
{{
  "message": "Your final answer to the user's query",
  // additional data you want to send to the user: datasources, panels, queries etc.
  "data": "Your data here"
}}

Begin !
`;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', contextGatheringPrompt],
    ['placeholder', '{messages}'],
  ]);

  const AgentContextStateAnnotation = Annotation.Root({
    output: Annotation<any>({
      value: (current, next) => next ?? current,
    }),
    messages: Annotation<BaseMessage[]>({
      default: () => [],
      reducer: customMessagesReducer,
    }),
    lastResponse: Annotation<BaseMessage | null>({
      default: () => null,
      value: (current, next) => next ?? current,
    }),
  });

  const callModel = async (state: typeof AgentContextStateAnnotation.State, config?: RunnableConfig) => {
    // Check if the last message contains a result
    if (state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage instanceof AIMessage) {
        const lastMessageContent = getLastTextMessage(lastMessage.content);
        // Extract JSON content between <json> tags if present
        const match = lastMessageContent.match(/Final Answer:(.*)/s);
        if (match) {
          try {
            const jsonContent = match[1];
            const content = JSON.parse(jsonContent.trim());
            // Update state with the parsed result
            debugger;
            return {
              output: content,
              messages: state.messages,
            };
          } catch (e) {
            // If parsing fails, continue with existing state
            console.debug('Failed to parse message content as JSON', e);
          }
        }
      }
    }
    const prompt = await promptTemplate.invoke({ messages: state.messages });
    const agent = workflowAgent.withTools(tools);
    const response = await agent.invoke(prompt, config);

    return {
      // Preserve the current result state
      output: state.output,
      messages: [...state.messages, response],
      lastResponse: response, // Store the raw response
    };
  };

  const shouldContinue = (state: typeof AgentContextStateAnnotation.State) => {
    if (state.output) {
      debugger;
      return END;
    }

    // Check the lastResponse for tool calls
    const lastResponse = state.lastResponse;
    if (
      lastResponse &&
      'tool_calls' in lastResponse &&
      Array.isArray(lastResponse.tool_calls) &&
      lastResponse.tool_calls?.length
    ) {
      return 'tools';
    }

    return 'agent';
  };

  const toolsNode = new ToolNode(tools);
  const checkpointer = new MemorySaver();

  return new StateGraph(AgentContextStateAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolsNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')
    .compile({ checkpointer });
}
