import { sortBy } from 'lodash';
import { useMemo } from 'react';

import { IconName, TraceKeyValuePair } from '@grafana/data';
import { Icon, Stack, Text } from '@grafana/ui';
import { getTimeRange } from 'app/core/utils/explore';

import { SpanLinkDef, TNil } from '../../types';
import { TraceLink, TraceSpan } from '../../types/trace';

import AccordianKeyValues from './AccordianKeyValues';
import { EntityAssertion } from './EntityAssertion';
import { getAttributeLinks } from './span-utils';

export type AttributesProps = {
  span: TraceSpan;
  linksGetter: ((links: TraceKeyValuePair[], index: number) => TraceLink[]) | TNil;
  tagsToggle: (spanID: string) => void;
  processToggle: (spanID: string) => void;
  isProcessOpen: boolean;
  links: SpanLinkDef[];
  resourceAttributesState: { isOpen: boolean; openedItems: Set<any> };
  isTagsOpen: boolean;
  detailAttributeItemToggle: (spanID: string, attribute: any) => void;
};

interface GroupedAttributes {
  attributes: TraceKeyValuePair[];
  // Map of links where the link.href is the key
  linksMap: Record<string, SpanLinkDef>;
}

export const Attributes = ({
  span,
  linksGetter,
  tagsToggle,
  processToggle,
  isTagsOpen,
  links,
  resourceAttributesState,
  detailAttributeItemToggle,
}: AttributesProps) => {
  const timeRange = useMemo(() => getTimeRange('utc', { to: 'now', from: 'now-1d' }, 0), []);
  // Order matters
  const standardAttributeResources = {
    service: {
      icon: 'application-observability',
      title: 'Service',
      component: ({ span }: { span: TraceKeyValuePair[] }) => {
        const serviceName = span.find((attribute) => attribute.key === 'service.name')?.value;
        if (!serviceName) {
          return null;
        }

        const serviceNamespace = span.find((attribute) => attribute.key === 'service.namespace')?.value;
        return <EntityAssertion name={`otel-demo-${serviceName}`} namespace={serviceNamespace} range={timeRange} />;
      },
    },
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
    attributes.reduce<Record<string, GroupedAttributes>>(
      (acc, attribute) => {
        const [key] = Object.entries(standardAttributeResources).find(([key]) => attribute.key.startsWith(key)) || [];

        if (key) {
          const scopedLinks = getAttributeLinks(attribute.key, links).reduce<Record<string, SpanLinkDef>>(
            (linkMap, link) => {
              linkMap[link.href] = link;
              return linkMap;
            },
            {}
          );
          if (acc[key]) {
            acc[key].attributes.push(attribute);
            acc[key].linksMap = { ...acc[key].linksMap, ...scopedLinks };
          } else {
            acc[key] = {
              attributes: [attribute],
              linksMap: scopedLinks,
            };
          }
        } else {
          acc['other'].attributes.push(attribute);
        }

        return acc;
      },
      { other: { attributes: [], linksMap: {} } }
    );
  const groupedByResourceAttributes = Object.entries(groupBy(span.process.tags)).filter(
    ([, group]) => group.attributes.length > 0
  );
  const sortedGroupedByResourceAttributes = sortBy(groupedByResourceAttributes, ([attribute]) => {
    if (attribute === 'other') {
      return Number.MAX_VALUE; // Put 'other' at the end
    }
    return Object.keys(standardAttributeResources).findIndex((key) => attribute === key);
  });

  return (
    <>
      <AccordianKeyValues
        data={span.tags}
        label="Span Attributes"
        linksGetter={linksGetter}
        links={links}
        isOpen={isTagsOpen}
        onToggle={() => tagsToggle(span.spanID)}
      />

      {span.process.tags && (
        <>
          <Text weight="bold">Resource attributes</Text>
          {sortedGroupedByResourceAttributes.map(([key, { attributes, linksMap }]) => {
            const {
              icon,
              title = 'Other',
              component: AssertionsWidget,
            } = standardAttributeResources[key as keyof typeof standardAttributeResources] || {};
            const headerLink = sortBy(Object.values(linksMap), (link) => link.href.length ?? 0)
              .reverse()
              .at(0);
            return (
              <>
                <AccordianKeyValues
                  key={key}
                  widget={AssertionsWidget ? <AssertionsWidget span={attributes} /> : undefined}
                  data={attributes}
                  label={getLabelTitle(title, icon)}
                  linksGetter={linksGetter}
                  isOpen={resourceAttributesState.openedItems.has(key)}
                  onToggle={() => detailAttributeItemToggle(span.spanID, key)}
                  headerLink={headerLink}
                  links={links}
                  withSummary={!!AssertionsWidget ? false : true}
                />
              </>
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
