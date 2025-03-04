import { listDatasourcesTool } from './tools/listDatasources';
import { prometheusLabelValuesTool } from './tools/prometheusLabelValues';
import { prometheusLabelNamesTool } from './tools/prometheusLabelNames';
import { prometheusInstantQueryTool } from './tools/prometheusInstantQuery';
import { prometheusRangeQueryTool } from './tools/prometheusRangeQuery';
import { dashboardPanelsTool } from './tools/dashboardPanels';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph/web';
import { messagesStateReducer } from '@langchain/langgraph/web';
import { BaseMessage, SystemMessage } from '@langchain/core/messages';
import { workflowAgent } from './agent';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { RunnableConfig } from '@langchain/core/runnables';

export function createContextRetriever() {
  const tools = [
    listDatasourcesTool,
    prometheusLabelValuesTool,
    prometheusLabelNamesTool,
    prometheusInstantQueryTool,
    prometheusRangeQueryTool,
    dashboardPanelsTool,
  ];

  const contextGatheringPrompt = `
You are a helpful assistant for Grafana to help categorize the user's question into one of categories and build required context.

You're a veteran SRE engineer and knows about Grafana ecosystem and Grafana Cloud.
You excel at understanding the user's question and know how to build the right observability context to answer the user query.

## Supported Categories:

- Investigation questions.
  - These are questions that require an investigation into the data to answer the user query.
  - We also want to suggest dashboard related
  - Example: "What is the CPU usage in the loki-dev-005 namespace?"
- Visualization questions
  - These are questions that require a visualization of the data to answer the user query.
  - Example: "Show me a graph of the CPU usage in the loki-dev-005 namespace."
- Other
  - These are questions that don't fit into the other categories.
  - Example: "How many dashboards in the Loki folder?"

Your job is to determine and build required context using the tools provided before processing the user's question. You will NOT
process the user question until you have gathered all the necessary context.
You should avoid instant queries to the datasources as much as possible. Specially if their labels cardinality is high.
Before querying the datasources for an instant query always make sure the cardinality is above 1000.
Also include labels that have cardinality that are not high cardinality  and can be interesting to group by in the context.
You should also try to infer the metric type based on the metric name and the labels if possible.

You'll include all the metrics and labels that could be relevant to answer the user query in the context.

Context you need to gather:
- The timerange requested based on the user query. Default to 1h if not specified.
- All useful Metric selectors including labels filtering and grouping based on the user query if it's about metrics.
- Description of the customer query
- Category of the user query


When you have gathered all the necessary context or determined that you don't need additional context,
respond with a JSON message in this format:

{{
  // Whether more user input is needed or the context gathering is complete
  "status": "need_user_input" | "completed",
  "data": {{
    // AI Message on the context gathering
    "message": "Perfect, I have gathered all the necessary context",

    "context": {{
       // A brief description of what the query or request is about
      "description": "Loki CPU usage in the loki-dev-005 namespace",
       // Whether context gathering has finished successfully
      "category": "investigation" | "visualization" | "other",
      // The timerange requested based on the user query
      "timerange": {{
        "from": "2024-01-01T00:00:00Z",
        "to": "2024-01-01T01:00:00Z"
      }},
       // Array of metric selectors with their datasource information
       // Try to include as many metrics as possible based on the user query that will be required to answer the user query
      "metricsSelectors": [{{
        // The actual PromQL metric query selector based on the user query
        // The metric selector should only select series that match the user query
        // It should not be a full PromQL query with aggregation functions (sum,rate,etc..)
        "selector": "container_cpu_usage{{namespace=\"loki-dev-005\"}}",
        // Multiple low cardinality labels to group by <1000 values
        "group_by": ["namespace","container","cluster"],
        // The unique identifier of the datasource to query from
        "datasourceUid": "cortex-dev-001",
        // The type of the metric name in the metric selector
        "type": "counter" | "gauge" | "histogram" | "summary",
        // A description of the metric selector including labels filtering based on the user query
        "description": "Container CPU usage in the loki-dev-005 namespace"
    }}],
    }}
  }}
}}

If the user query is not clear or if it requires more information than the current context,
respond with a JSON message in this format:

{{
  "status": "need_user_input",
  "data": {{
    // Replace with the actual message to the user tailored for the specific case
    "message": "Please provide more information or clarify your request."
  }}
}}

The final response should be in JSON format only and only the JSON content should be returned.
<json>
...
</json>
`;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', contextGatheringPrompt],
    ['placeholder', '{messages}'],
  ]);

  type ContextResultState = {
    status: 'need_user_input' | 'completed' | 'gathering_context';
    data: {
      message: string;
      context: {
        description: string;
        category: 'investigation' | 'visualization' | 'other';
        timerange: {
          from: Date;
          to: Date;
        };
        metricsSelectors: {
          selector: string;
          datasourceUid: string;
          description: string;
          type: 'counter' | 'gauge' | 'histogram' | 'summary';
          group_by: string[];
        }[];
      };
    };
  };

  const ContextRetrieverStateAnnotation = Annotation.Root({
    result: Annotation<ContextResultState>({
      value: (current, next) => next ?? current,
    }),
    messages: Annotation<BaseMessage[]>({
      default: () => [],
      reducer: messagesStateReducer,
    }),
  });

  const callModel = async (state: typeof ContextRetrieverStateAnnotation.State, config?: RunnableConfig) => {
    // Check if the last message contains a result
    if (state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1];
      if ('content' in lastMessage && typeof lastMessage.content === 'string') {
        try {
          // Extract JSON content between <json> tags if present
          const match = (lastMessage.content as string).match(/<json>(.*?)<\/json>/s);
          if (match) {
            const jsonContent = match[1];
            const content = JSON.parse(jsonContent.trim());
            if (content.status) {
              // Update state with the parsed result
              return {
                result: {
                  status: content.status,
                  data: content.data,
                },
                messages: state.messages,
              };
            }
          }
        } catch (e) {
          // If parsing fails, continue with existing state
          console.debug('Failed to parse message content as JSON', e);
        }
      }
    }

    const prompt = await promptTemplate.invoke({ messages: state.messages });
    const agent = workflowAgent.withTools(tools);
    const response = await agent.invoke(prompt, config);

    return {
      // Preserve the current result state
      result: state.result ?? { status: 'gathering_context' },
      messages: [response],
    };
  };

  const shouldContinue = (state: typeof ContextRetrieverStateAnnotation.State) => {
    if (state.result && state.result.status !== 'gathering_context') {
      return END;
    }
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
      return 'tools';
    }

    return 'agent';
  };

  const toolsNode = new ToolNode(tools);

  return new StateGraph(ContextRetrieverStateAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolsNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')
    .compile();
}
