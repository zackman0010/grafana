import { css } from '@emotion/css';
import { useEffect, useId, useState } from 'react';
import { SemVer } from 'semver';

import { getDefaultTimeRange, GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { EditorHeader, FlexItem } from '@grafana/plugin-ui';
import { Alert, InlineField, InlineLabel, Input, QueryField, RadioButtonGroup, useStyles2 } from '@grafana/ui';
import { useDispatch } from 'app/types';

import { ElasticDatasource } from '../../datasource';
import { useNextId } from '../../hooks/useNextId';
import { ElasticsearchOptions, ElasticsearchQuery, ElasticSearchQueryMode } from '../../types';
import { isSupportedVersion, isTimeSeriesQuery, unsupportedVersionMessage } from '../../utils';

import { BucketAggregationsEditor } from './BucketAggregationsEditor';
import { ElasticsearchProvider } from './ElasticsearchQueryContext';
import { MetricAggregationsEditor } from './MetricAggregationsEditor';
import { metricAggregationConfig } from './MetricAggregationsEditor/utils';
import { QueryTypeSelector } from './QueryTypeSelector';
import { RawQueryEditor } from './RawQueryEditor';
import { changeAliasPattern, changeQuery } from './state';

export type ElasticQueryEditorProps = QueryEditorProps<ElasticDatasource, ElasticsearchQuery, ElasticsearchOptions>;

// a react hook that returns the elasticsearch database version,
// or `null`, while loading, or if it is not possible to determine the value.
function useElasticVersion(datasource: ElasticDatasource): SemVer | null {
  const [version, setVersion] = useState<SemVer | null>(null);
  useEffect(() => {
    let canceled = false;
    datasource.getDatabaseVersion().then(
      (version) => {
        if (!canceled) {
          setVersion(version);
        }
      },
      (error) => {
        // we do nothing
        console.log(error);
      }
    );

    return () => {
      canceled = true;
    };
  }, [datasource]);

  return version;
}

const queryModeOptions: Array<SelectableValue<ElasticSearchQueryMode>> = [
  { value: ElasticSearchQueryMode.Builder, label: 'Query Builder' },
  { value: ElasticSearchQueryMode.Raw, label: 'Raw Query' },
];
export const QueryEditor = ({ query, onChange, onRunQuery, datasource, range }: ElasticQueryEditorProps) => {
  const elasticVersion = useElasticVersion(datasource);
  const showUnsupportedMessage = elasticVersion != null && !isSupportedVersion(elasticVersion);
  return (
    <ElasticsearchProvider
      datasource={datasource}
      onChange={onChange}
      onRunQuery={onRunQuery}
      query={query}
      range={range || getDefaultTimeRange()}
    >
      {showUnsupportedMessage && <Alert title={unsupportedVersionMessage} />}
      <EditorHeader>
        <FlexItem grow={1} />
        <RadioButtonGroup
          size="sm"
          aria-label="Query mode"
          value={query.queryMode ?? ElasticSearchQueryMode.Builder}
          options={queryModeOptions}
          onChange={(e) => onChange({ ...query, queryMode: e })}
          id={`elastic-query-mode-${query.refId}`}
        />
      </EditorHeader>
      <QueryEditorForm query={query} onChange={onChange} />
    </ElasticsearchProvider>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    display: 'flex',
  }),
  queryItem: css({
    flexGrow: 1,
    margin: theme.spacing(0, 0.5, 0.5, 0),
  }),
});

interface Props {
  query: ElasticsearchQuery;
  onChange: (query: ElasticsearchQuery) => void;

}

export const ElasticSearchQueryField = ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.queryItem}>
      <QueryField query={value} onChange={onChange} placeholder="Enter a lucene query" portalOrigin="elasticsearch" />
    </div>
  );
};

const QueryEditorForm = ({ query, onChange }: Props) => {
  const dispatch = useDispatch();
  const nextId = useNextId();
  const inputId = useId();
  const styles = useStyles2(getStyles);

  const isTimeSeries = isTimeSeriesQuery(query);

  const showBucketAggregationsEditor = query.metrics?.every(
    (metric) => metricAggregationConfig[metric.type].impliedQueryType === 'metrics'
  );
  
  if (!query.queryMode || query.queryMode === ElasticSearchQueryMode.Builder) {
    return <>
    <div className={styles.root}>
      <InlineLabel width={17}>Query type</InlineLabel>
      <div className={styles.queryItem}>
        <QueryTypeSelector />
      </div>
    </div>
    <div className={styles.root}>
      <InlineLabel width={17}>Lucene Query</InlineLabel>
      <ElasticSearchQueryField onChange={(query) => dispatch(changeQuery(query))} value={query?.query} />

      {isTimeSeries && (
        <InlineField
          label="Alias"
          labelWidth={15}
          tooltip="Aliasing only works for timeseries queries (when the last group is 'Date Histogram'). For all other query types this field is ignored."
          htmlFor={inputId}
        >
          <Input
            id={inputId}
            placeholder="Alias Pattern"
            onBlur={(e) => dispatch(changeAliasPattern(e.currentTarget.value))}
            defaultValue={query.alias}
          />
        </InlineField>
      )}
    </div>

    <MetricAggregationsEditor nextId={nextId} />
    {showBucketAggregationsEditor && <BucketAggregationsEditor nextId={nextId} />}
  </>
  } else {
    return <RawQueryEditor query={query} onChange={onChange} />;
  }
};

