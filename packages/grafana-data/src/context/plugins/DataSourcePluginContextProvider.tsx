import { PropsWithChildren, ReactElement, useMemo } from 'react';

import { DataSourceInstanceSettings } from '../../types/datasource';
import { UserStorage } from '../../types/userStorage';

import { Context, DataSourcePluginContextType } from './PluginContext';

export type DataSourcePluginContextProviderProps = {
  instanceSettings: DataSourceInstanceSettings;
  userStorage: UserStorage;
};

export function DataSourcePluginContextProvider(
  props: PropsWithChildren<DataSourcePluginContextProviderProps>
): ReactElement {
  const { children, instanceSettings, userStorage } = props;
  const value: DataSourcePluginContextType = useMemo(() => {
    return { instanceSettings, meta: instanceSettings.meta, userStorage };
  }, [instanceSettings, userStorage]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
