const getCurrentTimeInSeconds = (): number => Math.floor(Date.now() / 1000);

export const getDefaultTimeRange = (): { start: number; end: number } => {
  const end = getCurrentTimeInSeconds();
  const start = end - 3600; // Last hour (3600 seconds)
  return { start, end };
};
