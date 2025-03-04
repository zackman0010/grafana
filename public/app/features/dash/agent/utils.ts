import { dateTime, makeTimeRange, TimeRange } from "@grafana/data";

const getCurrentTimeInSeconds = (): number => Math.floor(Date.now() / 1000);

export const getDefaultTimeRange = (): TimeRange => {
  const end = getCurrentTimeInSeconds();
  const start = end - 3600; // Last hour (3600 seconds)
  return makeTimeRange(dateTime(start), dateTime(end));
};
