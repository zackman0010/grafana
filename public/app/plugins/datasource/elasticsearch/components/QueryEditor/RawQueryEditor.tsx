import { EditorField, EditorRow, EditorRows } from '@grafana/plugin-ui';
import { CodeEditor, Combobox, Input } from '@grafana/ui';

import { ElasticsearchDataQuery } from '../../dataquery.gen';

interface RawQueryEditorProps {
  query: ElasticsearchDataQuery;
  onChange: (query: ElasticsearchDataQuery) => void;
}
export const RawQueryEditor = (props: RawQueryEditorProps) => {
  return (
    <>
      {/* for time series */}
      <EditorRows>
        <EditorRow>
          {/* define query response processing */}
          <EditorField label="Process query as" tooltip="Define how the query response should be processed.">
            <Combobox
              options={[
                { label: 'Metrics', value: 'metrics' },
                { label: 'Logs', value: 'logs' },
                { label: 'Raw data', value: 'raw_data' },
              ]}
              onChange={(e) =>
                props.onChange({
                  ...props.query,
                  rawQuerySettings: { ...props.query.rawQuerySettings, processAs: e.value },
                })
              }
              value={props.query.rawQuerySettings?.processAs}
            />
          </EditorField>
          {props.query.rawQuerySettings?.processAs === 'metrics' && (
            <EditorRow>
              <EditorField label="Aggregation IDs" description="Enter the aggregation ID(s) to be processed into data frames. In case of multiple, separate IDs with a comma">
                <Input
                  onChange={(e) =>
                    props.onChange({
                      ...props.query,
                      rawQuerySettings: { ...props.query.rawQuerySettings, valueField: e.currentTarget.value },
                    })
                  }
                />
              </EditorField>
            </EditorRow>
          )}
        </EditorRow>
      </EditorRows>
      <CodeEditor
        language="json"
        value={props.query.query || ''}
        height="200px"
        showLineNumbers={true}
        showMiniMap={false}
        onBlur={(e) => props.onChange({ ...props.query, query: e })}
      />
    </>
  );
};
