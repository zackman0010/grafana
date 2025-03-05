import { StructuredTool } from "@langchain/core/tools";

import { BusEventWithPayload } from "@grafana/data";

import { getAppEvents } from "../appEvents";

export class ToolAddedEvent extends BusEventWithPayload<{
  tool: StructuredTool;
}> {
  static type = 'tool-added';
}

export function registerTool(tool: StructuredTool) {
  getAppEvents().publish(new ToolAddedEvent({ tool }));
}
