import { tool } from '@langchain/core/tools';

export const getCurrentTimeTool = tool(
  async () => {
    const date = new Date();

    return JSON.stringify({
      time: date.toISOString(),
      unixTime: Math.floor(date.getTime() / 1000),
    });
  },
  {
    name: 'get_current_time',
    description:
      'Get the current time in ISO format and as a unix timestamp. Use the unix timestamp when the expected format is a number.',
  }
);
