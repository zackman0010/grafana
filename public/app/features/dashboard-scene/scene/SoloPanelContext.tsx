import React, { useContext } from 'react';

export interface SoloPanelContextType {
  keyPath: string;
}

export const SoloPanelContext = React.createContext<SoloPanelContextType | null>(null);

export function useIsRenderingSoloPanel(keyPath?: string): boolean {
  const context = useContext(SoloPanelContext);
  if (context) {
    if (keyPath) {
      return context.keyPath.startsWith(keyPath);
    } else {
      return true;
    }
  }

  return false;
}
