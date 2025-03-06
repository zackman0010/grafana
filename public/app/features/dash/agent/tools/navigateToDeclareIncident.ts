import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

const navigateToDeclareIncidentSchema = z.object({
  title: z.string().optional().describe('The title of the incident'),
  url: z.string().url().optional().describe('Optional URL to link to the incident'),
  caption: z.string().optional().describe('Optional caption/description for the incident'),
  navigate: z.boolean().describe('Whether to navigate to the incident declaration page.'),
});

export const navigateToDeclareIncidentTool = tool(
  async (input) => {
    const { title, url, caption, navigate } = navigateToDeclareIncidentSchema.parse(input);

    const params = new URLSearchParams();
    params.append('title', title);

    if (url) {
      params.append('url', url);
    }

    if (caption) {
      params.append('caption', caption);
    }

    const fullUrl = `/a/grafana-incident-app/incidents/declare?${params.toString()}`;

    if (navigate) {
      locationService.push(fullUrl);
    }

    return fullUrl;
  },
  {
    name: 'navigate_to_declare_incident',
    description:
      'Use this tool when the user wants to declare a new incident in Grafana Incident. NEVER use it without asking the user for confirmation.',
    schema: navigateToDeclareIncidentSchema,
    metadata: {
      explainer: () => {
        return `Navigating to declare incident`;
      },
    },
    verboseParsingErrors: true,
  }
);
