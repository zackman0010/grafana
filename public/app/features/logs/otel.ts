import { LogRowModel } from "@grafana/data";

export interface OTelLogsDisplaySettings {
  name: string;
  matcher: OTelLogsLabelMatcher | OTelLogsCustomMatcher;
  displayFormat: OTelLogsDisplayFormat[];
}

interface OTelLogsLabelMatcher {
  labels: Record<string, string>;
}

interface OTelLogsCustomMatcher {
  matcher(log: LogRowModel): boolean;
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
      }
    },
    displayFormat: [
      { label: 'severity_text' },
      { label: 'thread_name' },
      { label: 'scope_name' },
      { label: 'exception_type' },
      { label: 'exception_message' },
      { label: '__line__' },
    ]
  }
];
