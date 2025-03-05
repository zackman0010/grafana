import { GrafanaTheme2 } from '@grafana/data';
import { sceneGraph, SceneObject } from '@grafana/scenes';

import { Dash } from './Dash';
import { DashChat } from './DashChat';
import { DashChatInstance } from './DashChatInstance';
import { DashInput } from './DashInput';
import { DashMessage } from './DashMessage';
import { DashMessages } from './DashMessages';
import { DashSettings } from './DashSettings';
import { Sender } from './types';

const dashMap = new WeakMap<SceneObject, Dash>();
const settingsMap = new WeakMap<SceneObject, DashSettings>();
const chatMap = new WeakMap<SceneObject, DashChat>();
const chatInstanceMap = new WeakMap<SceneObject, DashChatInstance>();
const messagesMap = new WeakMap<SceneObject, DashMessages>();
const inputMap = new WeakMap<SceneObject, DashInput>();
const messageMap = new WeakMap<SceneObject, DashMessage>();

export function getDash(sceneObject: SceneObject): Dash {
  if (!dashMap.has(sceneObject) || !dashMap.get(sceneObject)) {
    dashMap.set(sceneObject, sceneGraph.getAncestor(sceneObject, Dash));
  }

  return dashMap.get(sceneObject)!;
}

export function getSettings(sceneObject: SceneObject): DashSettings {
  if (!settingsMap.has(sceneObject) || !settingsMap.get(sceneObject)) {
    settingsMap.set(sceneObject, getDash(sceneObject).state.settings);
  }

  return settingsMap.get(sceneObject)!;
}

export function getChat(sceneObject: SceneObject): DashChat {
  if (!chatMap.has(sceneObject) || !chatMap.get(sceneObject)) {
    chatMap.set(sceneObject, sceneGraph.getAncestor(sceneObject, DashChat));
  }

  return chatMap.get(sceneObject)!;
}

export function getChatInstance(sceneObject: SceneObject): DashChatInstance {
  if (!chatInstanceMap.has(sceneObject) || !chatInstanceMap.get(sceneObject)) {
    chatInstanceMap.set(sceneObject, sceneGraph.getAncestor(sceneObject, DashChatInstance));
  }

  return chatInstanceMap.get(sceneObject)!;
}

export function getMessages(sceneObject: SceneObject): DashMessages {
  if (!messagesMap.has(sceneObject) || !messagesMap.get(sceneObject)) {
    messagesMap.set(sceneObject, getChatInstance(sceneObject).state.messages);
  }

  return messagesMap.get(sceneObject)!;
}

export function getInput(sceneObject: SceneObject): DashInput {
  if (!inputMap.has(sceneObject) || !inputMap.get(sceneObject)) {
    inputMap.set(sceneObject, getChatInstance(sceneObject).state.input);
  }

  return inputMap.get(sceneObject)!;
}

export function getMessage(sceneObject: SceneObject): DashMessage {
  if (!messageMap.has(sceneObject) || !messageMap.get(sceneObject)) {
    messageMap.set(sceneObject, sceneGraph.getAncestor(sceneObject, DashMessage));
  }

  return messageMap.get(sceneObject)!;
}

export function getColors(sender: Sender, theme: GrafanaTheme2) {
  if (sender === 'user') {
    return {
      color: theme.colors.background.secondary,
      borderColor: theme.colors.border.medium,
    };
  }
  if (sender === 'ai') {
    return {
      color: theme.colors.background.primary,
      borderColor: theme.colors.border.medium,
    };
  }
  if (sender === 'system') {
    return {
      color: 'transparent',
      borderColor: 'transparent',
    };
  }
  return {
    color: theme.colors.background.secondary,
    borderColor: theme.colors.border.medium,
  };
}

export function persistSetting(setting: string, value: string) {
  localStorage.setItem(`grafana.settings.dash.${setting}`, value);
}

export function getPersistedSetting(setting: string): string | null {
  return localStorage.getItem(`grafana.settings.dash.${setting}`);
}
