import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const getCurrentTimeSchema = z.object({});

export const getCurrentTimeTool = tool(
  async (input) => {
    // Parse the input using the schema
    getCurrentTimeSchema.parse(input);

    return JSON.stringify({
      time: new Date().toISOString(),
    });
  },
  {
    name: 'get_current_time',
    description: 'Get the current time in ISO format',
    schema: getCurrentTimeSchema,
  }
);
