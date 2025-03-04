import { Icon as IconUI } from '@grafana/ui';

import { DashMessageState } from './DashMessage';

interface Props {
  sender: DashMessageState['sender'];
}

export const Icon = ({ sender }: Props) => {
  if (sender === 'system') {
    return null;
  }

  return <IconUI name={sender === 'ai' ? 'ai' : 'user'} />;
};
