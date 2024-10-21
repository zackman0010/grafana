import { isObject } from 'lodash';
import Prism from 'prismjs';
import { ReactElement, useState } from 'react';
import { useAsync } from 'react-use';
import AutoSizer from 'react-virtualized-auto-sizer';

import { Box, CodeEditor, RadioButtonGroup, Spinner, Stack } from '@grafana/ui';
import { Diffs } from 'app/features/dashboard-scene/settings/version-history/utils';

import { DiffGroup } from '../../../dashboard-scene/settings/version-history/DiffGroup';
import { DiffViewer } from '../../../dashboard-scene/settings/version-history/DiffViewer';

interface SaveDashboardDiffProps {
  oldValue?: unknown;
  newValue?: unknown;

  // calculated by parent so we can see summary in tabs
  diff?: Diffs;
  hasFolderChanges?: boolean;
  oldFolder?: string;
  newFolder?: string;
}

type DiffViewType = 'only-changes' | 'diff';

export const SaveDashboardDiff = ({
  diff,
  oldValue,
  newValue,
  hasFolderChanges,
  oldFolder,
  newFolder,
}: SaveDashboardDiffProps) => {
  const [viewId, setViewId] = useState<string>('diff');
  const views = [
    { value: 'diff', label: 'JSON diff' },
    { value: 'changes-only', label: 'Only changed properties' },
  ];

  const diffCount = Object.keys(diff ?? {}).length;
  const oldJSON = JSON.stringify(oldValue ?? {}, null, 2);
  const newJSON = JSON.stringify(newValue ?? {}, null, 2);

  // const loader = useAsync(async () => {
  //   const oldJSON = JSON.stringify(oldValue ?? {}, null, 2);
  //   const newJSON = JSON.stringify(newValue ?? {}, null, 2);

  //   // Schema changes will have MANY changes that the user will not understand
  //   let schemaChange: ReactElement | undefined = undefined;
  //   const diffs: ReactElement[] = [];
  //   let count = 0;

  //   if (diff) {
  //     for (const [key, changes] of Object.entries(diff)) {
  //       // this takes a long time for large diffs (so this is async)
  //       const g = <DiffGroup diffs={changes} key={key} title={key} />;
  //       if (key === 'schemaVersion') {
  //         schemaChange = g;
  //       } else {
  //         diffs.push(g);
  //       }
  //       count += changes.length;
  //     }
  //   }

  //   return {
  //     schemaChange,
  //     diffs,
  //     count,
  //     showDiffs: count < 15, // overwhelming if too many changes
  //     jsonView: <DiffViewer oldValue={oldJSON} newValue={newJSON} />,
  //   };
  // }, [diff, oldValue, newValue]);

  return (
    <Stack direction="column" gap={1} height={'100%'}>
      {hasFolderChanges && (
        <DiffGroup
          diffs={[
            {
              op: 'replace',
              value: newFolder,
              originalValue: oldFolder,
              path: [],
              startLineNumber: 0,
              endLineNumber: 0,
            },
          ]}
          key={'folder'}
          title={'folder'}
        />
      )}
      <div>
        <RadioButtonGroup options={views} value={viewId} onChange={(value) => setViewId(value)} />
      </div>
      {diffCount >= 1 && (
        <>
          {viewId === 'diff' && <DiffViewer oldValue={oldJSON} newValue={newJSON} />}
          {viewId === 'changes-only' && <ChangesOnly oldValue={oldValue} newValue={newValue} />}
        </>
      )}
      {diffCount === 0 && <Box paddingTop={1}>No changes in the dashboard JSON</Box>}
    </Stack>
  );
};

interface ChangesOnlyProps {
  newValue: unknown;
  oldValue: unknown;
}

function ChangesOnly(props: ChangesOnlyProps) {
  //@ts-ignore
  const diff = diffObjects(props.newValue, props.oldValue);
  const json = JSON.stringify(diff, undefined, 2);

  return (
    <Stack direction="column" grow={1}>
      <AutoSizer disableWidth>
        {({ height }) => (
          <CodeEditor
            width="100%"
            height={height}
            language="json"
            showLineNumbers={true}
            value={json}
            readOnly={true}
          />
        )}
      </AutoSizer>
    </Stack>
  );
}

function diffObjects(objA: Record<string, unknown>, objB: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const keys = new Set<string>([...Object.keys(objA), ...Object.keys(objB)]);

  keys.forEach((key) => {
    const valueA = objA[key];
    const valueB = objB[key];

    // Check if both values are objects and not null
    if (isObject(valueA) && isObject(valueB)) {
      //@ts-ignore
      const nestedDiff = diffObjects(valueA, valueB);
      if (Object.keys(nestedDiff).length > 0) {
        result[key] = nestedDiff; // Include nested differences
      }
    } else if (valueA !== valueB) {
      result[key] = valueB; // Change to valueA if you want to show objA differences
    }
  });

  return result;
}
