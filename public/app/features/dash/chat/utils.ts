import { sceneGraph, SceneObject } from '@grafana/scenes';

import { DashChat } from './DashChat';
import { DashIndicators } from './DashIndicators';
import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';
import { DashSettings } from './DashSettings';

export function getChat(sceneObject: SceneObject): DashChat {
  return sceneGraph.getAncestor(sceneObject, DashChat);
}

export function getIndicators(sceneObject: SceneObject): DashIndicators {
  return getChat(sceneObject).state.indicators;
}

export function getSettings(sceneObject: SceneObject): DashSettings {
  return getChat(sceneObject).state.settings;
}

export function getMessages(sceneObject: SceneObject): DashMessages {
  return getChat(sceneObject).state.messages;
}

export function getInput(sceneObject: SceneObject): DashInput {
  return getChat(sceneObject).state.input;
}
