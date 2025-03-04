import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { Annotation, MemorySaver, messagesStateReducer, StateGraph } from '@langchain/langgraph/web';
import { agent } from './agent';
import { tools } from './tools';
import { createReactAgent } from './react-agent';

// // Graph state
// const StateAnnotation = Annotation.Root({
//   messages: Annotation<BaseMessage[]>({
//     // `messagesStateReducer` function defines how `messages` state key should be updated
//     // (in this case it appends new messages to the list and overwrites messages with the same ID)
//     reducer: messagesStateReducer,
//   }),
//   // Add context to the state
//   context: Annotation<Record<string, any>>({
//     default: () => ({}),
//     value: (current, _) => current,
//   }),
//   // Add a flag to track if we're in the context gathering phase
//   inContextGathering: Annotation<boolean>({
//     default: () => true,
//     value: (current, _) => current,
//   }),
// });

// // Initialize memory to persist state between graph runs
// const checkpointer = new MemorySaver();

// c

// const contextGraph = new StateGraph(ContextRetrieverStateAnnotation);

// // Build workflow
// const graphExecution = new StateGraph(StateAnnotation)
//   .addNode('contextGathering', gatherContext)
//   .addNode('main', main)
//   .addNode('toolNode', new ToolNode(tools))
//   .addEdge('__start__', 'contextGathering')
//   .addConditionalEdges('contextGathering', shouldContinueFromContext)
//   .addConditionalEdges('main', shouldContinue)
//   .addConditionalEdges('toolNode', shouldRouteFromTool)
//   .compile({ checkpointer });

// // Define the function that determines whether to continue from context gathering
// async function shouldContinueFromContext(state: typeof StateAnnotation.State) {
//   const messages = state.messages;
//   const lastMessage = messages[messages.length - 1] as AIMessage;

//   // If the LLM makes a tool call to gather more context, route to toolNode
//   if (lastMessage.tool_calls?.length) {
//     return 'toolNode';
//   }

//   // If the agent has indicated context gathering is complete, move to main
//   if (!state.inContextGathering) {
//     return 'main';
//   }

//   // If still in context gathering phase, keep cycling through it
//   return 'contextGathering';
// }

// // Define the function that determines whether to continue or not
// async function shouldContinue(state: typeof StateAnnotation.State) {
//   const messages = state.messages;
//   const lastMessage = messages[messages.length - 1] as AIMessage;

//   // If the LLM makes a tool call, then we route to the "toolNode" node
//   if (lastMessage.tool_calls?.length) {
//     return 'toolNode';
//   }

//   // Otherwise, we stop (reply to the user)
//   return '__end__';
// }

// // Define the function that determines where to route after a tool is used
// async function shouldRouteFromTool(state: typeof StateAnnotation.State) {
//   // If we're still in the context gathering phase, go back to contextGathering
//   if (state.inContextGathering) {
//     return 'contextGathering';
//   }

//   // Otherwise, proceed to main
//   return 'main';
// }

// const mainSystemPrompt = `You are a helpful assistant for Grafana. You can help users understand their data and visualizations.
// You can use the tools available to you to gather information and provide responses to user queries.

// Use the context that was previously gathered to inform your response:

// CONTEXT SUMMARY:
// {{contextSummary}}

// All your messages should be in the form of a JSON object with the following structure:
// {
//   "message": "Your response message here",
//   "data": {
//     "panels": [...], // Any panel configurations
//     "queries": [...], // Any queries you want to include
//     "datasources": [...], // Datasources to use
//     "visualizations": [...] // Visualization suggestions
//   }
// }

// The "message" field should contain your detailed response to the user's query.
// The "data" field should contain structured data to help visualize or understand the information.
// Use the gathered context to provide accurate and helpful information.`;

// async function gatherContext(state: typeof StateAnnotation.State) {
//   if (state.messages.length === 0) {
//     // Initialize with context gathering system prompt
//     state.messages.push(new SystemMessage(contextGatheringPrompt));

//     // Add the user's query
//     const userQuery = 'What is the CPU usage in the loki-dev-005 namespace ?';
//     state.messages.push(new HumanMessage(userQuery));
//     // Invoke the agent with the current messages
//     const response = await agent.invoke(state.messages);
//     return { messages: [...state.messages, response] };
//   }

//   const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

//   // If it's not a tool call, then it's a content response that might have contextComplete
//   try {
//     // Check if the response indicates context gathering is complete
//     const responseContent = JSON.parse(lastMessage.content as string);

//     if (responseContent.data?.contextComplete === true) {
//       // Store the complete context information and mark context gathering as complete
//       return {
//         inContextGathering: false,
//         context: responseContent.data?.contextSummary,
//         messages: state.messages,
//       };
//     }
//   } catch (error) {
//     console.error('Failed to parse response:', error);
//   }

//   // If we're still gathering context, invoke the agent again
//   const response = await agent.invoke(state.messages);
//   return { messages: [...state.messages, response] };
// }

// async function main(state: typeof StateAnnotation.State) {
//   // Create a new conversation with the main system prompt that includes context
//   let mainPromptWithContext = mainSystemPrompt;

//   // Replace context placeholders
//   mainPromptWithContext = mainPromptWithContext.replace(
//     '{{contextSummary}}',
//     state.context.contextSummary || 'No context summary available.'
//   );

//   // Replace metrics information
//   const metricsInfo = state.context.metricsInfo || {};
//   mainPromptWithContext = mainPromptWithContext.replace(
//     '{{metricsSelectors}}',
//     Array.isArray(metricsInfo.selectors) ? metricsInfo.selectors.join(', ') : 'No metric selectors available.'
//   );
//   mainPromptWithContext = mainPromptWithContext.replace(
//     '{{labelNames}}',
//     Array.isArray(metricsInfo.labelNames) ? metricsInfo.labelNames.join(', ') : 'No label names available.'
//   );
//   mainPromptWithContext = mainPromptWithContext.replace(
//     '{{labelValues}}',
//     Array.isArray(metricsInfo.labelValues) ? metricsInfo.labelValues.join(', ') : 'No label values available.'
//   );

//   // Replace datasources
//   mainPromptWithContext = mainPromptWithContext.replace(
//     '{{datasources}}',
//     Array.isArray(state.context.datasources) ? state.context.datasources.join(', ') : 'No datasources available.'
//   );

//   // Replace other context
//   mainPromptWithContext = mainPromptWithContext.replace(
//     '{{otherContext}}',
//     state.context.otherContextData
//       ? JSON.stringify(state.context.otherContextData, null, 2)
//       : 'No additional context available.'
//   );

//   // Get the original user query (second message from the context gathering phase)
//   const userQuery = state.messages[1].content;

//   // Start a new conversation with the context-enhanced system prompt
//   const newMessages = [new SystemMessage(mainPromptWithContext), new HumanMessage(userQuery as string)];

//   // Invoke the agent with the new conversation
//   const response = await agent.invoke(newMessages);

//   // Add the response to the state
//   return { messages: newMessages.concat([response]) };
// }

// export { graphExecution as chain };

// Example of how to use the chain with state change streaming
window.setTimeout(async () => {
  try {
    console.log('Starting chain execution...');

    // Initialize with proper state
    let initialState = {
      messages: [new HumanMessage('What is the CPU usage in the loki-dev-005 namespace ?')],
    };

    // configure the thread id for that agent so that we can resume from where we left off on page refresh
    // The states need to be persisted between page reloads via localStorage
    const config = { configurable: { thread_id: '1' } };

    // Use the stream method with updates mode to track state changes
    const agent = createReactAgent();
    console.log('Setting up state change streaming...');
    for await (const update of await agent.stream(initialState, {
      ...config,
      streamMode: 'updates',
    })) {
      // Each update contains the node name and the state changes from that node
      for (const [nodeName, stateChanges] of Object.entries(update)) {
        console.log(`State update from node: ${nodeName}`, stateChanges);
      }
      if (update.messages?.length > 0) {
        initialState = {
          messages: [...update.messages],
        };
      }
    }

    console.log('Chain execution completed');
    initialState.messages.push(new HumanMessage('What about loki-dev-006 ?'));
    for await (const update of await agent.stream(
      {
        messages: initialState.messages,
        output: undefined,
      },
      {
        ...config,
        streamMode: 'updates',
      }
    )) {
      console.log('update', update);
    }
  } catch (error) {
    console.error('Error in chain execution:', error);
  }
}, 5000);
