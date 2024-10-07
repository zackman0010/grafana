import _values from 'lodash/values';

import TreeNode from 'app/features/explore/TraceView/components/utils/TreeNode';

import traceGenerator from '../demo/trace-generators';
import { TraceResponse } from '../types/trace';

import { getSpanId, getSpanParentId } from './span';
import * as traceSelectors from './trace';
import { followsFromRef } from './trace.fixture';

const generatedTrace: TraceResponse = traceGenerator.trace({ numberOfSpans: 45 });

it('getTraceSpansAsMap() should return a map of all of the spans', () => {
  const spanMap = traceSelectors.getTraceSpansAsMap(generatedTrace);
  [...spanMap.entries()].forEach((pair) => {
    expect(pair[1]).toEqual(generatedTrace.spans.find((span) => getSpanId(span) === pair[0]));
  });
});

describe('getTraceSpanIdsAsTree()', () => {
  it('builds the tree properly', () => {
    const tree = traceSelectors.getTraceSpanIdsAsTree(generatedTrace);
    const spanMap = traceSelectors.getTraceSpansAsMap(generatedTrace);

    tree.walk((value: string, node: TreeNode<string>) => {
      const expectedParentValue = value === traceSelectors.TREE_ROOT_ID ? null : value;
      node.children.forEach((childNode) => {
        expect(getSpanParentId(spanMap.get(childNode.value))).toBe(expectedParentValue);
      });
    });
  });

  it('#115 - handles FOLLOW_FROM refs', () => {
    expect(() => traceSelectors.getTraceSpanIdsAsTree(followsFromRef)).not.toThrow();
  });
});
