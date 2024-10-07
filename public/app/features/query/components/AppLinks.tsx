import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';

import { AbstractQuery, DataQuery, DataSourceApi, DataSourceRef, hasQueryExportSupport } from '@grafana/data';
import { QueryToAppPluginContext } from '@grafana/data/src/types/pluginExtensions';
import { getDataSourceSrv, usePluginLinks } from '@grafana/runtime';
import { Badge, Counter, LinkButton, Modal } from '@grafana/ui';

type Props = {
  query?: DataQuery;
  abstractQuery?: AbstractQuery;
};

/**
 * A hook to load the datasource API
 */
function useDatasource(dataSourceRef?: DataSourceRef | undefined) {
  const [value, setValue] = useState<DataSourceApi | undefined>(undefined);
  useEffect(() => {
    dataSourceRef &&
      getDataSourceSrv()
        .get(dataSourceRef)
        .then((api) => setValue(api));
  }, [dataSourceRef]);
  return value;
}

function useDefaultDatasources(): Record<string, DataSourceRef> | undefined {
  const list = getDataSourceSrv().getList();

  const loki = list.filter((ds) => ds.type === 'loki')[0];
  const tempo = list.filter((ds) => ds.type === 'tempo')[0];
  const prometheus = list.filter((ds) => ds.type === 'prometheus')[0];
  const pyroscope = list.filter((ds) => ds.type === 'grafana-pyroscope-datasource')[0];

  const value = {
    loki,
    tempo,
    prometheus,
    pyroscope,
  };

  return Object.keys(value).length === 4 ? (value as Record<string, DataSourceRef>) : undefined;
}

const containerStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

const listStyle = css({
  display: 'flex',
  flexDirection: 'column',
});

const buttonsStyle = css({
  display: 'flex',
  gap: '5px',
  alignItems: 'flex-end',
  marginLeft: 'auto',
});

const modalStyle = css({
  width: '50%',
});

const moreButtonStyle = css({
  cursor: 'pointer',
});

export const AppLinks = ({ query, abstractQuery }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [abstractQueryValue, setAbstractQueryValue] = useState<AbstractQuery | undefined>(abstractQuery);
  const [abstractQueryValueChecked, setAbstractQueryValueChecked] = useState<boolean | undefined>(!!abstractQuery);

  const defaultDatasources = useDefaultDatasources();
  const datasource = useDatasource(query?.datasource);

  useEffect(() => {
    setAbstractQueryValueChecked(false);
  }, [query]);

  const context: QueryToAppPluginContext = {
    query,
    abstractQuery: abstractQueryValue || ({ labelMatchers: [] } as AbstractQuery),
    datasource: query?.datasource as DataSourceRef,
    from: 'now-1h',
    to: 'now',
    defaultDatasources,
  };

  const links = usePluginLinks({
    extensionPointId: 'grafana/query/query-to-app-plugin',
    context,
  });

  if (!abstractQueryValueChecked && datasource) {
    if (hasQueryExportSupport(datasource)) {
      datasource.exportToAbstractQueries([query]).then((queries) => {
        setAbstractQueryValue(queries[0]);
        setAbstractQueryValueChecked(true);
      });
    } else {
      setAbstractQueryValueChecked(true);
    }
  }

  if (!abstractQueryValueChecked || !defaultDatasources) {
    return undefined;
  }

  return (
    <>
      <Badge
        className={moreButtonStyle}
        text="Explore more!"
        color="orange"
        icon="rocket"
        onClick={() => setIsOpen(true)}
      />
      <Modal className={modalStyle} title="Explore more" isOpen={isOpen} onDismiss={() => setIsOpen(false)}>
        <p>You can explore more with the following apps:</p>
        <ul className={listStyle}>
          {links.links.map((link, i) => {
            return (
              <div key={link.path + i}>
                <hr />
                <span className={containerStyle}>
                  <span>{link.description}</span>
                  <Badge text={link.title} color="orange" icon="rocket" />
                  <div className={buttonsStyle}>
                    <LinkButton href={link.path} variant="secondary" size="sm">
                      Open
                    </LinkButton>
                  </div>
                </span>
              </div>
            );
          })}
        </ul>
      </Modal>
    </>
  );
};
