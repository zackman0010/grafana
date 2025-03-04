import { MessageContent, StoredMessage } from '@langchain/core/messages';

import { PanelModel } from '@grafana/data';

export type CodeOverflow = 'scroll' | 'wrap';

export type Verbosity = 'concise' | 'educational';

export type Mode = 'floating' | 'sidebar';

export type Sender = 'user' | 'ai' | 'system' | 'tool_notification';

export interface ToolContent {
  type: string;
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface PanelConfiguration {
  title?: string;
  description?: string;
  type?: PanelModel['type'];
  pluginVersion?: PanelModel['pluginVersion'];
  options: PanelModel['options'];
  fieldConfig: PanelModel['fieldConfig'];
  datasource: PanelModel['datasource'];
  transformations?: PanelModel['transformations'];
  targets?: PanelModel['targets'];
}

export interface SerializedDashMessage {
  content: MessageContent;
  sender: Sender;
}

export interface SerializedDashMessages {
  messages: SerializedDashMessage[];
  langchainMessages: StoredMessage[];
}

export interface SerializedDashChatInstance {
  messages: SerializedDashMessages;
  timestamp: number;
}

export interface SerializedDashChat {
  name: string;
  versions: SerializedDashChatInstance[];
  versionIndex: number;
}

export interface SerializedDash {
  chats: SerializedDashChat[];
  chatIndex: number;
  chatNumber: number;
}
