// codeowner string that references a GH team or user
// the value must match the format used in the CODEOWNERS file
export type Codeowner = string;

export const Codeowners: { [key: string]: Codeowner } = {
  grafanaAppPlatformSquad: '@grafana/grafana-app-platform-squad',
  grafanaDashboardsSquad: '@grafana/dashboards-squad',
  grafanaDatavizSquad: '@grafana/dataviz-squad',
  grafanaFrontendPlatformSquad: '@grafana/grafana-frontend-platform',
  grafanaBackendGroup: '@grafana/grafana-backend-group',
  grafanaBackendServicesSquad: '@grafana/grafana-backend-services-squad',
  grafanaSearchAndStorageSquad: '@grafana/search-and-storage',
  grafanaPluginsPlatformSquad: '@grafana/plugins-platform-backend',
  grafanaAsCodeSquad: '@grafana/grafana-as-code',
  identityAccessTeam: '@grafana/identity-access-team',
  grafanaObservabilityLogsSquad: '@grafana/observability-logs',
  grafanaObservabilityTracesAndProfilingSquad: '@grafana/observability-traces-and-profiling',
  grafanaObservabilityMetricsSquad: '@grafana/observability-metrics',
  grafanaAlertingSquad: '@grafana/alerting-squad',
  hostedGrafanaTeam: '@grafana/hosted-grafana-team',
  awsDatasourcesSquad: '@grafana/aws-datasources',
  appO11ySquad: '@grafana/app-o11y',
  grafanaPartnerPluginsSquad: '@grafana/partner-datasources',
  grafanaOperatorExperienceSquad: '@grafana/grafana-operator-experience-squad',
  enterpriseDatasourcesSquad: '@grafana/enterprise-datasources',
  grafanaSharingSquad: '@grafana/sharing-squad',
  grafanaDatabasesFrontend: '@grafana/databases-frontend',
  grafanaOSSBigTent: '@grafana/oss-big-tent',
  growthAndOnboarding: '@grafana/growth-and-onboarding',
};
