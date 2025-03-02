import { sceneGraph, SceneObject } from '@grafana/scenes';

import { DashChat } from './DashChat';
import { DashIndicators } from './DashIndicators';
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
