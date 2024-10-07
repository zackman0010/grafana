import memoize from 'lodash/memoize';

import { TraceSpan } from '../types';

export function _getTraceNameImpl(spans: TraceSpan[]) {
  // Use a span with no references to another span in given array
  // prefering the span with the fewest references
  // using start time as a tie breaker
  let candidateSpan: TraceSpan | undefined;
  const allIDs: Set<string> = new Set(spans.map(({ spanID }) => spanID));

  for (let i = 0; i < spans.length; i++) {
    const hasInternalRef =
      spans[i].references &&
      spans[i].references.some(({ traceID, spanID }) => traceID === spans[i].traceID && allIDs.has(spanID));
    if (hasInternalRef) {
      continue;
    }

    if (!candidateSpan) {
      candidateSpan = spans[i];
      continue;
    }

    const thisRefLength = (spans[i].references && spans[i].references.length) || 0;
    const candidateRefLength = (candidateSpan.references && candidateSpan.references.length) || 0;

    if (
      thisRefLength < candidateRefLength ||
      (thisRefLength === candidateRefLength && spans[i].startTime < candidateSpan.startTime)
    ) {
      candidateSpan = spans[i];
    }
  }
  return candidateSpan ? `${candidateSpan.process.serviceName}: ${candidateSpan.operationName}` : '';
}

export const getTraceName = memoize(_getTraceNameImpl, (spans: TraceSpan[]) => {
  if (!spans.length) {
    return 0;
  }
  return spans[0].traceID;
});

// Find header tags according to either old standard (e..g, `http.method`) or the
// standard OTEL semantic convention, as per https://opentelemetry.io/docs/specs/semconv/http/http-spans
// (e.g., `http.request.method`). Spans following the OTEL semantic convention are prioritized.
//
// Note that we are ignoring these cases:
// - conventions are mixed, e.g., a span with method in `http.method` but status code in `http.response.status_code`
// - tags are not in the same span, e.g., method in spans[0] but status in spans[1]
export function findHeaderTags(spans: TraceSpan[]) {
  // OTEL semantic convention
  for (let i = 0; i < spans.length; i++) {
    const method = spans[i].tags.filter((tag) => {
      return tag.key === 'http.request.method';
    });

    const status = spans[i].tags.filter((tag) => {
      return tag.key === 'http.response.status_code';
    });

    const url = spans[i].tags.filter((tag) => {
      return tag.key === 'http.route';
    });

    if (method.length > 0 || status.length > 0 || url.length > 0) {
      return { method, status, url };
    }
  }

  // Non-standard convention
  for (let i = 0; i < spans.length; i++) {
    const method = spans[i].tags.filter((tag) => {
      return tag.key === 'http.method';
    });

    const status = spans[i].tags.filter((tag) => {
      return tag.key === 'http.status_code';
    });

    const url = spans[i].tags.filter((tag) => {
      return tag.key === 'http.url' || tag.key === 'http.target' || tag.key === 'http.path';
    });

    if (method.length > 0 || status.length > 0 || url.length > 0) {
      return { method, status, url };
    }
  }

  return {};
}

export const getHeaderTags = memoize(findHeaderTags, (spans: TraceSpan[]) => {
  if (!spans.length) {
    return 0;
  }
  return spans[0].traceID;
});
