import { usePluginContext } from './usePluginContext';

export function usePluginUserStorage() {
  const context = usePluginContext();
  if (!context) {
    throw new Error(`No PluginContext found. The useUserStorage() hook can only be used from a plugin.`);
  }
  return context.userStorage;
}
