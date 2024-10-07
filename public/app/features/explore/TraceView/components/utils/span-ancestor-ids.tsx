import _find from 'lodash/find';
import _get from 'lodash/get';

import { TNil, TraceSpan } from '../types';

function getFirstAncestor(span: TraceSpan): TraceSpan | TNil {
  return _get(
    _find(
      span.references,
      ({ span: ref, refType }) => ref && ref.spanID && (refType === 'CHILD_OF' || refType === 'FOLLOWS_FROM')
    ),
    'span'
  );
}

export default function spanAncestorIds(span: TraceSpan | TNil): string[] {
  const ancestorIDs: string[] = [];
  if (!span) {
    return ancestorIDs;
  }
  let ref = getFirstAncestor(span);
  while (ref) {
    ancestorIDs.push(ref.spanID);
    ref = getFirstAncestor(ref);
  }
  return ancestorIDs;
}
