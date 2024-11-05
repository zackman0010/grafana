import { Alert, LoadingPlaceholder } from '@grafana/ui';

import { useAlertmanager } from '../../state/AlertmanagerContext';
import { isK8sApiEnabled } from '../../utils/k8s/utils';
import { stringifyErrorLike } from '../../utils/misc';
import { TemplatesList } from '../receivers/TemplatesList';
import { TemplatesTable } from '../receivers/TemplatesTable';

import { useNotificationTemplates } from './useNotificationTemplates';

export const NotificationTemplates = () => {
  const { selectedAlertmanager } = useAlertmanager();
  const kubernetesServerAPI = isK8sApiEnabled();

  const { data: templates, isLoading, error } = useNotificationTemplates({ alertmanager: selectedAlertmanager ?? '' });

  if (error) {
    return <Alert title="Failed to fetch notification templates">{stringifyErrorLike(error)}</Alert>;
  }

  if (isLoading) {
    return <LoadingPlaceholder text="Loading notification templates" />;
  }

  if (templates && kubernetesServerAPI) {
    return <TemplatesList alertManagerName={selectedAlertmanager!} templates={templates} />;
  } else if (templates) {
    return <TemplatesTable alertManagerName={selectedAlertmanager!} templates={templates} />;
  }

  return null;
};
