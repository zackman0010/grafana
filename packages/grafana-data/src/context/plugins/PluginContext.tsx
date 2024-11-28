import { createContext } from 'react';

import { DataSourceInstanceSettings } from '../../types/datasource';
import { PluginMeta } from '../../types/plugin';
import { UserStorage } from '../../types/userStorage';

export interface PluginContextType {
  meta: PluginMeta;
  userStorage?: UserStorage;
}

export interface DataSourcePluginContextType extends PluginContextType {
  instanceSettings: DataSourceInstanceSettings;
  userStorage: UserStorage;
}

export const Context = createContext<PluginContextType | undefined>(undefined);
