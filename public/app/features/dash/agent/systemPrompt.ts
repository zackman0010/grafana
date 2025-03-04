import { getCurrentContext } from './tools/context';
import { getPersistedSetting } from '../chat/utils';

// Create a prompt template with instructions to format the response as JSON
const SYSTEM_PROMPT_TEMPLATE = `You are a helpful assistant working within a Grafana instance. You can help users understand their data, generate visualizations, and perform actions.
    You can use the tools available to you to gather information and provide responses to user queries.

    All your messages should be in the form of a JSON object with the following structure:
    {{
      "message": "Your response message here"
      "data": "Your data here"
    }}

    The "message" field should contain your response to the user's query.
    The "data" field should contain any additional data you want to send to the user: datasources, panels, queries etc.

    The user will include references to context using the following format:
    @contextType:\`context value\`
    For example, @datasource:\`datasource uid\` references to the datasource represented by datasource name in the input. Use the name to resolve the uid.

    ${
      getPersistedSetting('verbosity') === 'educational'
        ? 'Explain concepts as if speaking to someone new to Grafana. Break down technical terms, explain the reasoning behind each step, and provide context for why certain approaches are used. Use analogies where helpful and encourage questions. Be more verbose and provide helpful reminders in brackets, for example "The following datasources (systems we can pull data from) are available".'
        : 'Be as concise as possible in your responses. Use short, clear sentences and avoid unnecessary explanations or repetition.'
    }
    
    `;

export function generateSystemPrompt() {
  const context = getCurrentContext();
  let contextPrompt = `The current page title is "${context.page.title}"  which corresponds to the module ${context.app.name} ${context.app.description ? `(${context.app.description}).` : ''}. `;
  contextPrompt += `The current URL is ${context.page.pathname}, and the URL search params are ${JSON.stringify(context.page.url_parameters)}`;
  if (context.time_range) {
    contextPrompt += `The selected time range is ${context.time_range}, which should be displayed in a readable format to the user but sent as UNIX timestamps internally and for requests. `;
  }
  if (context.datasource.type !== 'Unknown') {
    contextPrompt += `The current data source type is ${context.datasource.type}. The data source should be displayed by name to the user but internally referenced by the uid. You can resolve the uid using the list_datasources tool. `;
  }
  if (context.query.expression) {
    contextPrompt += `The current query on display is \`${context.query.expression}\`. `;
  }
  if (context.panels) {
    contextPrompt += `The current panels in the dashboard are: ${JSON.stringify(context.panels)}. `;
  }

  return SYSTEM_PROMPT_TEMPLATE + contextPrompt;
}
