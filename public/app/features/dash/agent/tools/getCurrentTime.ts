import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const getCurrentTimeTool = tool(
  async () => {
    const date = new Date();

    return JSON.stringify({
      time: date.toISOString(),
      unixTimeMillisecond: date.getTime(),
    });
  },
  {
    name: 'get_current_time',
    description:
      'Get the current time in ISO format and as a unix millisecond timestamp. Use the unix millisecond timestamp when the expected format is a number.',
    schema: z.object({}),
    metadata: {
      explainer: () => {
        return `Getting current time`;
      },
    },
    verboseParsingErrors: true,
  }
);
