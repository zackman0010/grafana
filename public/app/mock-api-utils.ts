import { sendAppNotification } from './core/copy/appNotification';
import { AppNotificationSeverity } from './types';

export const STORAGE_MOCK_API_KEY = 'grafana.dev.mockApi';

export const currentMockApiState = () => {
  return window.localStorage.getItem(STORAGE_MOCK_API_KEY) === 'true';
};

export const toggleMockApiAndReload = () => {
  const currentState = currentMockApiState();
  window.localStorage.setItem(STORAGE_MOCK_API_KEY, String(!currentState));
  sendAppNotification(`Toggling Mock API`, 'Reloading...', AppNotificationSeverity.Info);
  setTimeout(() => {
    window.location.reload();
  }, 200);
};
