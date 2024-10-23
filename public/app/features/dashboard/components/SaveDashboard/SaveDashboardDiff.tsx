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
  const diff = getDifferences(props.newValue, props.oldValue);
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

function getDifferences<T>(objA: T, objB: T): unknown {
  if (objA && !objB) {
    return objA;
  }

  if (objB && !objA) {
    return objB;
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    // If both are arrays, compare each element
    const diffArray: unknown[] = [];
    const maxLength = Math.max(objA.length, objB.length);

    for (let i = 0; i < maxLength; i++) {
      const diff = getDifferences(objA[i], objB[i]);
      if (diff !== undefined) {
        diffArray.push(diff);
      } else {
        diffArray.push(undefined);
      }
    }

    // Remove trailing undefined elements
    while (diffArray.length && diffArray[diffArray.length - 1] === undefined) {
      diffArray.pop();
    }

    return diffArray.length ? diffArray : undefined;
  }

  if (typeof objA === 'object' && typeof objB === 'object') {
    const result: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

    keys.forEach((key) => {
      const diff = getDifferences((objA as any)[key], (objB as any)[key]);
      if (diff !== undefined) {
        result[key] = diff;
      }
    });

    return Object.keys(result).length ? result : undefined;
  }

  // If they are different primitives, return objA
  return objA !== objB ? objA : undefined;
}
