import { PropsWithChildren, ReactElement } from 'react';

import { PluginMeta } from '../../types/plugin';
import { UserStorage } from '../../types/userStorage';

import { Context } from './PluginContext';

export type PluginContextProviderProps = {
  meta: PluginMeta;
  userStorage: UserStorage;
};

export function PluginContextProvider(props: PropsWithChildren<PluginContextProviderProps>): ReactElement {
  const { children, ...rest } = props;
  return <Context.Provider value={rest}>{children}</Context.Provider>;
}
