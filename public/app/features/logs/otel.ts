import { LogRowModel } from '@grafana/data';

import { LOG_LINE_BODY_FIELD_NAME } from './components/LogDetailsBody';

export interface OTelLogsDisplaySettings {
  name: string;
  matcher: OTelLogsLabelMatcher | OTelLogsCustomMatcher;
  displayFormat: OTelLogsDisplayFormat[];
}

interface OTelLogsLabelMatcher {
  labels: Record<string, string>;
  matcher?: never;
}

interface OTelLogsCustomMatcher {
  matcher(log: LogRowModel): boolean;
  labels?: never;
}

interface OTelLogsDisplayFormat {
  label: string;
  settings?: Record<string, string>;
}

export const definitions: OTelLogsDisplaySettings[] = [
  {
    name: 'Default OTel',
    matcher: {
      labels: {
        severity_number: '',
      },
    },
    displayFormat: [
      { label: 'severity_text' },
      { label: 'thread_name' },
      { label: 'scope_name' },
      { label: 'exception_type' },
      { label: 'exception_message' },
      { label: LOG_LINE_BODY_FIELD_NAME },
    ],
  },
];

export function getOtelDisplayMessage(log: LogRowModel): string {
  const definition = matchOtelDefinition(log);
  if (!definition) {
    return log.raw;
  }
  let line = '';
  for (const format of definition.displayFormat) {
    if (format.label === LOG_LINE_BODY_FIELD_NAME) {
      line += ` ${log.raw}`;
    } else {
      line += ` ${log.labels[format.label]}`;
    }
  }
  return line;
}

export function matchOtelDefinition(log: LogRowModel): OTelLogsDisplaySettings | undefined {
  for (const definition of definitions) {
    if (definition.matcher.labels && labelsMatchLog(log, definition.matcher)) {
      return definition;
    }
  }
  return undefined;
}

export function labelsMatchLog(log: LogRowModel, matcher: OTelLogsLabelMatcher) {
  for (const label in matcher.labels) {
    if (!log.labels[label] || (matcher.labels[label] !== '' && log.labels[label] !== matcher.labels[label])) {
      return false;
    }
  }
  return true;
}
