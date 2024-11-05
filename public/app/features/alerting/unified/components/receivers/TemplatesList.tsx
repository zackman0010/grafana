import { isArray } from 'lodash';
import pluralize from 'pluralize';
import { type ReactNode } from 'react';

import { Dropdown, Icon, LinkButton, Menu, Stack, Tooltip } from '@grafana/ui';
import { t, Trans } from 'app/core/internationalization';

import { AlertmanagerAction, useAlertmanagerAbility } from '../../hooks/useAbilities';
import { ListItem } from '../../rule-list/components/ListItem';
import { ListWrapper } from '../../rule-list/components/ListSection';
import { useAlertmanager } from '../../state/AlertmanagerContext';
import { isGrafanaRulesSource } from '../../utils/datasource';
import { isProvisionedProvenance } from '../../utils/k8s/utils';
import { makeAMLink } from '../../utils/misc';
import { Authorize } from '../Authorize';
import { MetaText } from '../MetaText';
import MoreButton from '../MoreButton';
import { ProvisioningBadge } from '../Provisioning';
import { CodeText } from '../common/TextVariants';
import { useContactPointsWithStatus } from '../contact-points/useContactPoints';
import { NotificationTemplate } from '../contact-points/useNotificationTemplates';

import { getTemplateNames, parseTemplates } from './form/fields/utils';

interface TemplatesListProps {
  alertManagerName: string;
  templates: NotificationTemplate[];
}

export const TemplatesList = (props: TemplatesListProps) => {
  const { templates, alertManagerName } = props;

  return (
    <ListWrapper>
      {templates.map((template) => (
        <TemplateListItem key={template.uid} template={template} alertManagerName={alertManagerName} />
      ))}
    </ListWrapper>
  );
};

type TemplateListItemProps = {
  alertManagerName: string;
  template: NotificationTemplate;
};

const TemplateListItem = ({ template, alertManagerName }: TemplateListItemProps) => {
  const { uid, title, content, provenance, missing } = template;
  const { references, subtemplates, isLoading } = useContactPointReferences(content);

  const [supportsDuplication, allowedToDuplicate] = useAlertmanagerAbility(AlertmanagerAction.CreateContactPoint);
  const [supportsDeleting, allowedToDelete] = useAlertmanagerAbility(AlertmanagerAction.DeleteNotificationTemplate);

  const canDuplicate = supportsDuplication && allowedToDuplicate;
  const canDelete = supportsDeleting && allowedToDelete;

  // a notification template is _actually_ a file that can contain several more templates! We'll call these "subtemplates".
  const hasSubTemplates = !isLoading && subtemplates.length > 1;
  const isProvisioned = isProvisionedProvenance(provenance);

  const detailHref = makeAMLink(`/alerting/notifications/templates/${encodeURIComponent(uid)}/edit`, alertManagerName);
  const duplicateHref = makeAMLink(
    `/alerting/notifications/templates/${encodeURIComponent(uid)}/duplicate`,
    alertManagerName
  );

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
          {references.length > 0 ? (
            <>
              Used by {references.length} {pluralize('contact point', references.length)}
            </>
          ) : (
            <>Unused template</>
          )}
        </>
      )}
    </MetaText>,
    hasSubTemplates ? (
      <MetaText key="subtemplates-count">
        Contains {subtemplates.length} {pluralize('sub template', subtemplates.length)}
      </MetaText>
    ) : null,
  ];

  if (missing && !isGrafanaRulesSource(alertManagerName)) {
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

  return (
    <ListItem
      key={uid}
      title={
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Icon name="file-alt" /> {title} {isProvisioned && <ProvisioningBadge />}
        </Stack>
      }
      meta={meta}
      actions={
        <>
          {isProvisioned ? (
            <LinkButton icon="eye" href={detailHref} variant="secondary" size="sm">
              View
            </LinkButton>
          ) : (
            <Authorize actions={[AlertmanagerAction.UpdateNotificationTemplate]}>
              <LinkButton icon="pen" href={detailHref} variant="secondary" size="sm">
                Edit
              </LinkButton>
            </Authorize>
          )}
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item icon="copy" label="Duplicate" url={duplicateHref} disabled={!canDuplicate} />
                {!isProvisioned && (
                  <>
                    <Menu.Divider />
                    <Menu.Item icon="trash-alt" label="Delete" destructive onClick={() => {}} disabled={!canDelete} />
                  </>
                )}
              </Menu>
            }
          >
            <MoreButton aria-label="more actions for notification template" data-testid="more-actions" />
          </Dropdown>
        </>
      }
    />
  );
};

function useContactPointReferences(templateFileContent: string) {
  const { selectedAlertmanager } = useAlertmanager();
  const { contactPoints = [], ...rest } = useContactPointsWithStatus({
    alertmanager: selectedAlertmanager!,
    fetchPolicies: false,
    fetchStatuses: false,
  });

  // firstly we parse the template file content to see which sub-templates it contains
  const subtemplates = parseTemplates(templateFileContent) ?? [];

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
          return subtemplates.some((template) => template.name === name);
        });
      });
    });
  });

  return { references, subtemplates, ...rest };
}
