import { IconName, TraceKeyValuePair } from '@grafana/data';
import { Icon, Stack, Text } from '@grafana/ui';
import AccordianKeyValues from './AccordianKeyValues';
import { TraceLink, TraceSpan } from '../../types/trace';
import { TNil } from '../../types';
import { sortBy } from 'lodash';

export type AttributesProps = {
  span: TraceSpan;
  linksGetter: ((links: TraceKeyValuePair[], index: number) => TraceLink[]) | TNil;
  tagsToggle: (spanID: string) => void;
  processToggle: (spanID: string) => void;
  isTagsOpen: boolean;
  isProcessOpen: boolean;
};

export const Attributes = ({
  span,
  linksGetter,
  tagsToggle,
  processToggle,
  isTagsOpen,
  isProcessOpen,
}: AttributesProps) => {
  // Order matters
  const standardAttributeResources = {
    service: { icon: 'application-observability', title: 'Service' },
    'gf.feo11y': { icon: 'frontend-observability', title: 'Grafana RUM' },
    k8s: { icon: 'kubernetes', title: 'Kubernetes' },
    'telemetry.sdk': { icon: 'graph-bar', title: 'Telemetry SDK' },
    'telemetry.distro': { icon: 'graph-bar', title: 'Telemetry Distro' },
    cloud: { icon: 'cloud', title: 'Cloud' },
    host: { icon: 'cube', title: 'Host' },
    deployment: { icon: 'rocket', title: 'Deployment' },
    db: { icon: 'database', title: 'Database' },
    'process.runtime': { icon: 'process', title: 'Runtime' },
    process: { icon: 'process', title: 'Process' },
    // 'os': { icon: 'os-linux', title: 'OS' },
  } as const;
  const groupBy = (attributes: TraceKeyValuePair[]) =>
    attributes.reduce<Record<string, TraceKeyValuePair[]>>(
      (acc, attribute) => {
        const [key] = Object.entries(standardAttributeResources).find(([key]) => attribute.key.startsWith(key)) || [];

        if (key) {
          acc[key] = [...(acc[key] || []), attribute];
        } else {
          acc['other'] = [...(acc['other'] || []), attribute];
        }

        return acc;
      },
      { other: [] }
    );
  const groupedByResourceAttributes = Object.entries(groupBy(span.process.tags)).filter(
    ([, value]) => value.length > 0
  );
  const sortedGroupedByResourceAttributes = sortBy(groupedByResourceAttributes, ([attribute]) => {
    if (attribute === 'other') {
      return Number.MAX_VALUE; // Put 'other' at the end
    }
    return Object.keys(standardAttributeResources).findIndex((key) => attribute === key);
  });

  console.log(span);

  return (
    <>
      <AccordianKeyValues
        data={span.tags}
        label="Span Attributes"
        linksGetter={linksGetter}
        isOpen={isTagsOpen}
        onToggle={() => tagsToggle(span.spanID)}
      />

      {span.process.tags && (
        <>
          {' '}
          <Text weight="bold">Resource attributes</Text>
          {sortedGroupedByResourceAttributes.map(([key, attribute]) => {
            const { icon, title = 'Other' } =
              standardAttributeResources[key as keyof typeof standardAttributeResources] || {};
            return (
              <AccordianKeyValues
                key={key}
                data={attribute}
                label={getLabelTitle(title, icon)}
                linksGetter={linksGetter}
                isOpen={isProcessOpen}
                onToggle={() => processToggle(span.spanID)}
              />
            );
          })}
        </>
      )}
    </>
  );
};

function getLabelTitle(label: string, icon?: IconName) {
  return (
    <Stack direction="row" gap={1} alignItems="center">
      {icon && <Icon name={icon} />}
      {label}
    </Stack>
  );
}
