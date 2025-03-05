import { TimeRange } from "@grafana/data";
import { ComponentSize } from "@grafana/ui";
import { usePluginComponent } from "app/features/plugins/extensions/usePluginComponent";

export enum EntityPropertyTypes {
  STRING = 'String',
  DOUBLE = 'Double',
}

export enum StringRules {
  EQUALS = '=',
  NOT_EQUALS = '<>',
  STARTS_WITH = 'STARTS WITH',
  CONTAINS = 'CONTAINS',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
}

export enum NumberRules {
  EQUALS = '=',
  NOT_EQUALS = '<>',
  GREATER = '>',
  GREATER_OR_EQUAL = '>=',
  LESS = '<',
  LESS_OR_EQUAL = '<=',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
}

interface EntityFilterPropertyMatcher {
  id: number;
  name: string;
  value: string | number;
  op: StringRules | NumberRules;
  type: EntityPropertyTypes;
  uom?: string | null;
}


interface EntityAssertionsWidgetProps {
  query: {
    entityName?: string;
    entityType?: string;
    start: number;
    end: number;
    additionalMatchers?: EntityFilterPropertyMatcher[];
    scope:
    | {
      env?: string;
      site?: string;
      namespace?: string;
    }
    | undefined;
  };
  size: ComponentSize;
  source?: string;
}

interface Props {
  name: string;
  namespace?: string;
  range: TimeRange;
}

export function EntityAssertion({ name, namespace, range }: Props) {
  const { component: EntityAssertionsWidgetExternal, isLoading } = usePluginComponent<EntityAssertionsWidgetProps>('grafana-asserts-app/entity-assertions-widget/v1')

  if (isLoading || !EntityAssertionsWidgetExternal) {
    return null;
  }

  const additionalMatchers = namespace
    ? [
      {
        id: 1,
        name: 'otel_namespace',
        value: namespace,
        op: StringRules.EQUALS,
        type: EntityPropertyTypes.STRING,
      },
    ]
    : undefined;


  return <EntityAssertionsWidgetExternal
    size="md"
    source="Application"
    query={{
      start: range.from.valueOf(),
      end: range.to.valueOf(),
      entityName: name,
      entityType: 'Service',
      additionalMatchers,
      scope: {},
    }}
  />

}
