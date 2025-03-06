import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const devSleepSchema = z.object({
  delay_ms: z
    .number()
    .optional()
    .describe('Optional delay in milliseconds. Defaults to 10000ms (10 seconds) if not specified'),
});

export const devSleep = tool(
  async (input) => {
    const { delay_ms = 10000 } = devSleepSchema.parse(input);

    await new Promise((resolve) => setTimeout(resolve, delay_ms));

    return `Slept for ${delay_ms}ms`;
  },
  {
    name: 'dev_sleep',
    description: 'Sleeps for a specified duration (defaults to 10 seconds) for testing and development purposes.',
    schema: devSleepSchema,
    metadata: {
      explainer: () => {
        return `Sleeping for testing`;
      },
    },
  }
);
