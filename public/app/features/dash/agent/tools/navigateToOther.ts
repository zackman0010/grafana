import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

const navigateToOtherSchema = z.object({
  url: z.string().describe('URL to navigate to'),
  navigate: z.boolean().describe('Whether to navigate to the URL. Only ever set this to true if the user has confirmed to navigate to the URL.'),
});

export const navigateToOtherTool = tool(
  async (input) => {
    const { url, navigate } = navigateToOtherSchema.parse(input);

    if (navigate) {
      locationService.push(url);
    }

    return url;
  },
  {
    name: 'navigate_to_other',
    description:
      'Use this tool when the user wants to navigate to a URL. NEVER use it without asking the user for confirmation.',
    schema: navigateToOtherSchema,
    metadata: {
      explainer: () => {
        return `Navigating to URL`;
      },
    },
  }
);
