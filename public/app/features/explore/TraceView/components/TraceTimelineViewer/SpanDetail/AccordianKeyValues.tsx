// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { css } from '@emotion/css';
import cx from 'classnames';
import * as React from 'react';

import { GrafanaTheme2, TraceKeyValuePair } from '@grafana/data';
import { Icon, Tooltip, useStyles2 } from '@grafana/ui';

import { autoColor } from '../../Theme';
import { TraceLink, TNil, SpanLinkDef } from '../../types';

import * as markers from './AccordianKeyValues.markers';
import KeyValuesTable, { AccordionHeaderLink } from './KeyValuesTable';

export const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      textOverflow: 'ellipsis',
    }),
    header: css({
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      gap: '0.25em',
      label: 'header',
      cursor: 'pointer',
      overflow: 'hidden',
      padding: '0.25em 0.1em',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      background: autoColor(theme, '#e8e8e8'),

      '&:hover': {
        background: autoColor(theme, '#e8e8e8'),
      },
    }),
    headerTitle: css({
      display: 'flex',
    }),
    headerLink: css({
      display: 'inline-flex',
    }),
    headerEmpty: css({
      label: 'headerEmpty',
      background: 'none',
      cursor: 'initial',
    }),
    headerHighContrast: css({
      label: 'headerHighContrast',
      '&:hover': {
        background: autoColor(theme, '#ddd'),
      },
    }),
    emptyIcon: css({
      label: 'emptyIcon',
      color: autoColor(theme, '#aaa'),
    }),
    summary: css({
      label: 'summary',
      display: 'inline',
      listStyle: 'none',
      padding: 0,
    }),
    summaryItem: css({
      label: 'summaryItem',
      display: 'inline',
      paddingRight: '0.5rem',
      borderRight: `1px solid ${autoColor(theme, '#ddd')}`,
      '&:last-child': {
        paddingRight: 0,
        borderRight: 'none',
      },
    }),
    summaryLabel: css({
      label: 'summaryLabel',
      color: autoColor(theme, '#777'),
    }),
    summaryDelim: css({
      label: 'summaryDelim',
      color: autoColor(theme, '#bbb'),
      padding: '0 0.2em',
    }),
  };
};

export type AccordianKeyValuesProps = {
  className?: string | TNil;
  data: TraceKeyValuePair[];
  logName?: string;
  highContrast?: boolean;
  interactive?: boolean;
  isOpen: boolean;
  label: string | React.ReactNode;
  linksGetter?: ((pairs: TraceKeyValuePair[], index: number) => TraceLink[]) | TNil;
  onToggle?: null | (() => void);
  withSummary?: boolean;
  headerLink?: SpanLinkDef;
  links: SpanLinkDef[];
  widget?: React.ReactNode;
  tooltip?: React.ReactElement;
};

interface KeyValuesSummaryProps {
  data?: TraceKeyValuePair[] | null;
}

// export for tests
export function KeyValuesSummary({ data = null }: KeyValuesSummaryProps) {
  const styles = useStyles2(getStyles);

  if (!Array.isArray(data) || !data.length) {
    return null;
  }

  return (
    <ul className={styles.summary}>
      {data.map((item, i) => (
        // `i` is necessary in the key because item.key can repeat
        <li className={styles.summaryItem} key={`${item.key}-${i}`}>
          <span className={styles.summaryLabel}>{item.key}</span>
          <span className={styles.summaryDelim}>=</span>
          {String(item.value)}
        </li>
      ))}
    </ul>
  );
}

export default function AccordianKeyValues({
  className = null,
  data,
  logName,
  highContrast = false,
  interactive = true,
  isOpen,
  label,
  linksGetter,
  onToggle = null,
  withSummary = true,
  headerLink,
  links,
  widget: AssertionsWidget,
  tooltip,
}: AccordianKeyValuesProps) {
  const isEmpty = (!Array.isArray(data) || !data.length) && !logName;
  const styles = useStyles2(getStyles);
  const iconCls = cx({ [styles.emptyIcon]: isEmpty });
  let arrow: React.ReactNode | null = null;
  let headerProps: {} | null = null;
  const tableFields = logName ? [{ key: 'event name', value: logName }, ...data] : data;
  if (interactive) {
    arrow = isOpen ? (
      <Icon name={'angle-down'} className={iconCls} />
    ) : (
      <Icon name={'angle-right'} className={iconCls} />
    );
    headerProps = {
      'aria-checked': isOpen,
      onClick: isEmpty ? null : onToggle,
      role: 'switch',
    };
  }

  const showDataSummaryFields = data.length > 0 && !isOpen && withSummary;

  return (
    <div className={cx(className, styles.container)}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'space-between' }}>
        <div
          className={cx(styles.header, {
            [styles.headerEmpty]: isEmpty,
            [styles.headerHighContrast]: highContrast && !isEmpty,
          })}
          {...headerProps}
          data-testid="AccordianKeyValues--header"
        >
          {arrow}
          <strong className={styles.headerTitle} data-test={markers.LABEL}>
            {label}
            {showDataSummaryFields && ':'}
          </strong>
          {!headerLink && tooltip && (
            <Tooltip content={tooltip} interactive theme="info">
              <Icon name="info-circle" />
            </Tooltip>
          )}
          {headerLink && (
            <AccordionHeaderLink href={headerLink.href} title={headerLink.title} className={styles.headerLink} />
          )}
          {showDataSummaryFields && (
            <span>
              <KeyValuesSummary data={data} />
            </span>
          )}
        </div>
        {AssertionsWidget}
      </div>
      {isOpen && <KeyValuesTable data={tableFields} linksGetter={linksGetter} links={links} />}
    </div>
  );
}
