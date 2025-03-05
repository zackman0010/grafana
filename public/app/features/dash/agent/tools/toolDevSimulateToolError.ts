import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const simulateToolErrorSchema = z.object({
  error_message: z.string().describe('The error message to simulate'),
  delay_ms: z.number().optional().describe('Optional delay in milliseconds before throwing the error'),
});

export const simulateToolError = tool(
  async (input) => {
    const { error_message, delay_ms } = simulateToolErrorSchema.parse(input);

    if (delay_ms) {
      await new Promise((resolve) => setTimeout(resolve, delay_ms));
    }

    throw new Error(error_message);
  },
  {
    name: 'dev_simulate_tool_error',
    description: 'Simulates a tool error for testing and dev purposes. Use this to test error handling in the UI.',
    schema: simulateToolErrorSchema,
  }
);
