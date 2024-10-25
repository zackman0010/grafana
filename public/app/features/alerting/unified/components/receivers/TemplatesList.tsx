import { isArray } from 'lodash';
import pluralize from 'pluralize';
import { ReactNode } from 'react';

import { Counter, Stack, Tooltip } from '@grafana/ui';
import { t, Trans } from 'app/core/internationalization';

import { ListItem } from '../../rule-list/components/ListItem';
import { ListSection } from '../../rule-list/components/ListSection';
import { useAlertmanager } from '../../state/AlertmanagerContext';
import { MetaText } from '../MetaText';
import { CodeText } from '../common/TextVariants';
import { useContactPointsWithStatus } from '../contact-points/useContactPoints';
import { NotificationTemplate } from '../contact-points/useNotificationTemplates';

import { getTemplateNames, parseTemplates } from './form/fields/utils';

interface TemplatesListProps {
  alertManagerName: string;
  templates: NotificationTemplate[];
}

export const TemplatesList = (props: TemplatesListProps) => {
  const { templates } = props;

  // @TODO find out which ones aren't used
  // @TODO add metadata which receivers are using the template
  const usedTemplates = templates;
  const unusedTemplates: NotificationTemplate[] = [];

  return (
    <Stack direction="column" gap={2}>
      <ListSection
        title={
          <Stack alignItems="center" gap={0}>
            Used <Counter value={usedTemplates.length} />
          </Stack>
        }
      >
        {usedTemplates.map((template) => (
          <TemplateListItem key={template.uid} template={template} />
        ))}
      </ListSection>

      <ListSection
        collapsed={true}
        title={
          <Stack alignItems="center" gap={0}>
            Unused <Counter value={unusedTemplates.length} />
          </Stack>
        }
      >
        {unusedTemplates.map((template) => (
          <ListItem key={template.uid} title={template.title} meta={[]} />
        ))}
      </ListSection>
    </Stack>
  );
};

type TemplateListItemProps = {
  template: NotificationTemplate;
};

const TemplateListItem = ({ template }: TemplateListItemProps) => {
  const { references, isLoading } = useContactPointReferences(template.content);

  const misconfiguredBadgeText = t(
    'alerting.templates.misconfigured-meta-text',
    'This notification template is misconfigured'
  );

  // @TODO add some sort of list of contact points or figure out how to link to them? See notification policies maybe?
  let meta: ReactNode[] = [
    <MetaText key="references-count" icon="at">
      {isLoading ? (
        '–'
      ) : (
        <>
          {references.length} {pluralize('contact point', references.length)}
        </>
      )}
    </MetaText>,
    // <MetaText key="sloc" icon="align-left">
    //   {sloc(template.content)} lines of code
    // </MetaText>,
  ];

  if (template.missing) {
    meta = [
      <Tooltip
        key="missing-template"
        content={
          <Trans i18nKey="alerting.templates.misconfigured-warning-details">
            Templates must be defined in both the <CodeText content="template_files" /> and{' '}
            <CodeText content="templates" /> sections of your alertmanager configuration.
          </Trans>
        }
      >
        <span>
          <MetaText color="error">{misconfiguredBadgeText}</MetaText>
        </span>
      </Tooltip>,
    ];
  }

  return <ListItem key={template.uid} title={template.title} meta={meta} />;
};

// function sloc(content: string) {
//   return content.split('\n').length;
// }

function useContactPointReferences(templateFileContent: string) {
  const { selectedAlertmanager } = useAlertmanager();
  const { contactPoints = [], ...rest } = useContactPointsWithStatus({
    alertmanager: selectedAlertmanager!,
    fetchPolicies: false,
    fetchStatuses: false,
  });

  // firstly we parse the template file content to see which sub-templates it contains
  const templates = parseTemplates(templateFileContent) ?? [];

  const references = contactPoints.filter((contactPoint) => {
    return contactPoint.grafana_managed_receiver_configs.some((receiver) => {
      if (!receiver.settings) {
        return false;
      }

      if (isArray(receiver.settings)) {
        return false;
      }

      return Object.values(receiver.settings).some((setting) => {
        if (typeof setting !== 'string') {
          return false;
        }

        return getTemplateNames(setting).some((name) => {
          return templates.some((template) => template.name === name);
        });
      });
    });
  });

  return { references, ...rest };
}
