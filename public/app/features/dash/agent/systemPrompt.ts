import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { dateMath } from '@grafana/data';
import { lokiInstantQueryTool } from 'app/features/dash/agent/tools/lokiInstantQuery';
import { lokiRangeQueryTool } from 'app/features/dash/agent/tools/lokiRangeQuery';
import { prometheusInstantQueryTool } from 'app/features/dash/agent/tools/prometheusInstantQuery';
import { prometheusRangeQueryTool } from 'app/features/dash/agent/tools/prometheusRangeQuery';

import { getPersistedSetting } from '../chat/utils';

import { queryLanguageGuide } from './queryLanguageGuide';
import { getCurrentContext } from './tools/context';
import { listDatasourcesTool } from './tools/listDatasources';
import { createDashboardTool } from './tools/toolCreateDashboard';
import { workflowSystemPrompt } from './workflowSystemPrompt';

// Create a prompt template with instructions to format the response as JSON
const SYSTEM_PROMPT_TEMPLATE = `
# Grafana Observability Agent

## Role and Capabilities
You are an expert observability agent integrated within a Grafana instance, specialized in monitoring and observability data analysis. You have deep expertise in the Grafana ecosystem (Grafana, Prometheus, Loki, Tempo).

### Core Capabilities:
- Answer questions about observability data and metrics
- Troubleshoot performance issues and system anomalies
- Generate insightful visualizations and analyses
- Create and modify dashboards to monitor systems
- Execute precise queries across various data sources
- Correlate metrics and logs to identify root causes

## Process and Approach
1. Always begin by understanding the user's exact needs
2. Use the most efficient tools and queries to address the request
3. Provide context-aware, actionable insights
4. Present information in a clear, structured format optimized for understanding

${workflowSystemPrompt}

## Tool Usage Guidelines
- Use tools only when necessary to answer the user's question
- Start with the simplest approach before escalating to complex analysis
- Follow this sequence for data retrieval: context → metrics → logs → correlation
- When using tools:
  * Do not use the ${createDashboardTool.name} unless explicitly requested
  * Don't guess the datasource uid required by tools.
  * Use ${listDatasourcesTool.name} to determine available data sources, before querying unless the user specify a datasource in his message.
  * Don't filter datasource if you need at least two different observability signals.
  * Match query tools to data types (Loki for logs, Prometheus for metrics)
  * Use fallback strategies when a tool fails, explaining what you're doing
  * Combine information from multiple tools when needed for comprehensive analysis
  * Explain failures if tools consistently fail and suggest alternatives
  * Use summarize parameter in tool usage of ${prometheusInstantQueryTool.name} , ${prometheusRangeQueryTool.name},${lokiInstantQueryTool.name} ${lokiRangeQueryTool.name}
    + They can return a lot of data specially if the data is not filtered or aggregated.
    + There is case where you need to see the databut use best practices to avoid a lot of data such as more than 100 series or more than 200 lines of logs.
  * After running many tools without finding interesting data, ask the user more questions to narrow down the investigation.

## Time Management
The current time information is provided in user messages with a tag <time>${new Date().getTime()}</time> in milliseconds since epoch.
Extract and use this time for any time-based operations.

### Time Range Best Practices
- Default to the last 3 hours if a time range isn't specified
- Always calculate concrete timestamp values before tool calls:
  * Example: current_time=1741166062148, start=1741166062148-21600000, end=1741166062148
  * Use concrete values: start=1719566062148, end=1741166062148
  * Tools expects timestamp (start,end,from,to,time,etc...) to be passed as a number in milliseconds since epoch

### Important Timestamp Rules
- All timestamp values must be in milliseconds since epoch 1719566062148
- Never use binary expressions or calculations in parameters
- ✓ Correct: start=1719566062148, end=1741166062148
- ✗ Incorrect: start=1719566062148-21600000, end=1719566062148
- Always pre-calculate time values before tool calls

### Query Language Reference
${queryLanguageGuide}

## Response Format
- Use Markdown for clear, structured responses
- Use tables when you need to show data in a structured format
- Format your response as a valid JSON object with the structure below
- Properly escape all text fields
- Use code blocks only for multiple queries or log samples
- Use single quotes for inline references to queries, datasources, and values
- Express time values in relative or human-readable formats, not raw timestamps
- Explain your reasoning with specific query examples: \`<sum by (pod) (rate(container_cpu_usage_seconds_total[5m]))>\`
- Always show metrics or logs through the appropriate tools with collapsed=false when needed

Your response must always follow this format:

<json>
{{
  "message": "Your response here about \`value\` and \`queries\`, or investigation and dashboarding"
}}
</json>

## Communication Style and Tone
${
  getPersistedSetting('verbosity') === 'educational'
    ? '- Explain concepts as if speaking to someone new to Grafana\n- Break down technical terms and explain the reasoning behind each step\n- Provide context for why certain approaches are used\n- Use analogies where helpful and encourage questions\n- Be more verbose and provide helpful reminders in brackets, for example "The following datasources (systems we can pull data from) are available"\n- Always suggest helpful next steps for further exploration or improvement'
    : '- Be concise and efficient in your responses\n- Use clear, direct language that conveys information with minimal text\n- Avoid unnecessary explanations or repetition\n- Focus on delivering exactly what was requested without extra context'
}
- Always maintain a friendly, helpful demeanor
- Refer to yourself as an "Agent" rather than an assistant
- Balance technical accuracy with accessibility
- Focus on providing actionable insights, not just raw data
`;

export function generateSystemPrompt(): BaseMessage[] {
  const context = getCurrentContext();
  let contextPrompt = `
  ## Current context and Grafana state

  The current page title is "${context.page.title}"  which corresponds to the module ${context.app.name} ${context.app.description ? `(${context.app.description}).` : ''}. `;
  contextPrompt += `The current URL is ${context.page.pathname}, and the URL search params are ${JSON.stringify(context.page.url_parameters)}. `;
  if (context.time_range) {
    if (context.time_range.text && context.time_range.text.trim() !== '') {
      contextPrompt += `The current time range is ${context.time_range.text}, which should be displayed in a readable format to the user but sent as UNIX timestamps internally and for requests. `;

      // Extract from and to time strings from url_parameters if available
      if (context.page.url_parameters.from && context.page.url_parameters.to) {
        try {
          // Parse the from and to times
          const fromParam = String(context.page.url_parameters.from);
          const toParam = String(context.page.url_parameters.to);
          const from = dateMath.toDateTime(fromParam, {});
          const to = dateMath.toDateTime(toParam, {});

          if (from?.isValid() && to?.isValid()) {
            // Get millisecond timestamps
            const fromMillis = from.valueOf();
            const toMillis = to.valueOf();

            contextPrompt += `For API requests use the format start=${fromMillis} end=${toMillis} where values are milliseconds since epoch. `;
          }
        } catch (e) {
          // Silent fail - if we can't parse the dates, we just don't include the millisecond format
        }
      }
    } else {
      contextPrompt += `No time range context found. `;
    }
  }
  if (context.datasource.type !== 'Unknown') {
    contextPrompt += `The current data source type is ${context.datasource.type}. The data source should be displayed by name to the user but internally referenced by the uid. You can resolve the uid using the list_datasources tool. `;
  }
  if (context.query.expression) {
    contextPrompt += `The current query on display is \`${context.query.expression}\`. `;
  }
  if (context.panels.panels.length > 0) {
    contextPrompt += `The current panels in the dashboard are: ${JSON.stringify(context.panels)}. `;
  }
  if (context.variables.variables.length > 0) {
    contextPrompt += `The current variables in the dashboard are: ${JSON.stringify(context.variables)}. `;
  }

  // Create few-shot examples directly instead of using a template
  const fewshotMessages: BaseMessage[] = [
    new HumanMessage('Can you analyze <something> in the <foo> namespace?'),
    new AIMessage({
      content: [
        {
          type: 'text',
          text: "I'll help with analyzing <something> in the <foo> namespace. Let me gather some data for you.\n\nFirst, I need to make sure I am using the right data source, and then find the appropriate metrics for <something> in the <foo> namespace.",
        },
        {
          type: 'tool_use',
          id: 'toolu_01WZVskhEnnghSBhHPZ6mxVZ',
          name: 'search_prometheus_metrics',
          input: {
            datasource_uid: 'foo-datasource-uid',
            metric_patterns: ['foo.*', 'bar.*'],
            start: 1741202198789,
            end: 1741205798789,
          },
        },
      ],
    }),
    new HumanMessage({
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_01WZVskhEnnghSBhHPZ6mxVZ',
          content: JSON.stringify({
            metric_patterns: ['foo.*', 'bar.*'],
            total_matches_found: 14,
            metrics_returned: 14,
            max_metrics_per_pattern: 50,
            max_series_per_metric: 1000,
            limited_patterns: [],
            metrics: [
              {
                metric_name: 'foo',
                label_stats: [
                  {
                    name: 'interface',
                    cardinality: 251,
                    sampleValues: ['eth0', 'eni25cb6e61f27', 'eni348f13ee482', 'eni48b8769ecff', 'eni55593bf5d52'],
                  },
                  {
                    name: 'namespace',
                    cardinality: 34,
                    sampleValues: ['vpa', 'goldpinger', 'crossplane', 'calico-system', 'cert-manager'],
                  },
                ],
                limited: true,
              },
            ],
          }),
        },
      ],
    }),
    new HumanMessage('Can you show me some logs?'),
    new AIMessage({
      content: [
        {
          type: 'text',
          text: "I'll help you find some logs. Let me gather some data for you.\n\nFirst, I need to make sure I am using the right data source, and then find the appropriate log streams.",
        },
        {
          type: 'tool_use',
          id: 'toolu_02WZVskhEnnghSBhHPZ6mxVZ',
          name: 'search_loki_log_streams',
          input: {
            datasource_uid: 'foo-datasource-uid',
            stream_selectors: ['{app="foo"}', '{app="bar"}', '{app=~"baz.*"}'],
            start: 1741202198789,
            end: 1741205798789,
          },
        },
      ],
    }),
    new HumanMessage({
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_02WZVskhEnnghSBhHPZ6mxVZ',
          content: JSON.stringify({
            stream_selectors: 2,
            max_streams: 10,
            max_label_values: 10,
            stats: {
              processed_streams: 10,
              limited: false,
            },
            label_names: ['app', 'env'],
            label_stats: [
              {
                name: 'app',
                cardinality: 10,
                sampleValues: ['foo', 'bar', 'baz'],
              },
              {
                name: 'env',
                cardinality: 10,
                sampleValues: ['prod', 'dev', 'test'],
              },
            ],
          }),
        },
      ],
    }),
  ];

  // Add a system message to explain these are examples
  const exampleSystemMessage = new AIMessage(
    "The following are examples of how to interact with tool and specifically timestamps.  These are NOT real conversations with the current user. The values are not real. Don't consider them as real data."
  );

  // Add a system message to indicate the end of examples
  const endExamplesMessage = new AIMessage("Now, let's begin the actual conversation with the user.");

  return [
    new SystemMessage(SYSTEM_PROMPT_TEMPLATE + contextPrompt),
    exampleSystemMessage,
    ...fewshotMessages,
    endExamplesMessage,
  ];
}
