-----

description: Link to trace IDs from logs and metrics
keywords:

- grafana
- tempo
- guide
- tracing
  labels:
  products:
  - cloud
  - enterprise
  - oss
    menuTitle: Link to a trace ID
    title: Link to a trace ID
    weight: 800
    aliases:
- ../link-trace-id/ \# /docs/grafana/latest/datasources/tempo/link-trace-id/

## refs: configure-grafana-feature-toggles: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/setup-grafana/configure-grafana/\#feature\_toggles - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/setup-grafana/configure-grafana/\#feature\_toggles explore: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/explore/ - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/explore/ provisioning-data-sources: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/administration/provisioning/\#data-sources - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/administration/provisioning/\#data-sources exemplars: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/fundamentals/exemplars/ - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/fundamentals/exemplars/ variable-syntax: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/dashboards/variables/variable-syntax/ - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/dashboards/variables/variable-syntax/ explore-trace-integration: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/explore/trace-integration/ - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/explore/trace-integration/ node-graph: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/panels-visualizations/visualizations/node-graph/ - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/panels-visualizations/visualizations/node-graph/ data-source-management: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/administration/data-source-management/ - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/administration/data-source-management/ build-dashboards: - pattern: /docs/grafana/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/dashboards/build-dashboards/ - pattern: /docs/grafana-cloud/ destination: /docs/grafana/\<GRAFANA\_VERSION\>/dashboards/build-dashboards/

# Link to a trace ID

You can link to Tempo traces from logs or metrics.

## Link to a trace ID from logs

You can link to Tempo traces from logs in Loki, Elasticsearch, Splunk, and other logs data sources by configuring an internal link.

To configure this feature, refer to the [Derived fields](../../../loki#configure-derived-fields) section of the Loki data source docs or the [Data links](../../../elasticsearch#data-links) section of the Elasticsearch or Splunk data source docs.

## Link to a trace ID from metrics

You can link to Tempo traces from metrics in Prometheus data sources by configuring an exemplar.

To configure this feature, refer to the [Exemplars](ref:exemplars) documentation.
