import { GrafanaTheme2 } from '@grafana/data';
import { sceneGraph, SceneObject } from '@grafana/scenes';

import { Dash } from './Dash';
import { DashChat } from './DashChat';
import { DashChatContainer } from './DashChatContainer';
import { DashInput } from './DashInput';
import { DashMessage, DashMessageState } from './DashMessage/DashMessage';
import { DashMessages } from './DashMessages';
import { DashSettings } from './DashSettings';

export function getDash(sceneObject: SceneObject): Dash {
  return sceneGraph.getAncestor(sceneObject, Dash);
}

export function getSettings(sceneObject: SceneObject): DashSettings {
  return getDash(sceneObject).state.settings;
}

export function getChatContainer(sceneObject: SceneObject): DashChatContainer {
  return sceneGraph.getAncestor(sceneObject, DashChatContainer);
}

export function getChat(sceneObject: SceneObject): DashChat {
  return sceneGraph.getAncestor(sceneObject, DashChat);
}

export function getMessages(sceneObject: SceneObject): DashMessages {
  return getChat(sceneObject).state.messages;
}

export function getInput(sceneObject: SceneObject): DashInput {
  return getChat(sceneObject).state.input;
}

export function getMessage(sceneObject: SceneObject): DashMessage {
  return sceneGraph.getAncestor(sceneObject, DashMessage);
}

export function getColors(sender: DashMessageState['sender'], theme: GrafanaTheme2) {
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
