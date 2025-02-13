import { cx, css } from '@emotion/css';
import { useMemo } from 'react';

import { DataSourceSettings as DataSourceSettingsType, PluginExtensionPoints, GrafanaTheme2 } from '@grafana/data';
import { usePluginLinks } from '@grafana/runtime';
import { Link, useTheme2 } from '@grafana/ui';

import { contextSrv } from '../../../core/core';

const getStyles = (theme: GrafanaTheme2, hasTitle: boolean) => {
    return {
        content: css({
            color: theme.colors.text.secondary,
            paddingTop: hasTitle ? theme.spacing(1) : 0,
            maxHeight: '50vh',
            overflowY: 'auto',
        }),
        disabled: css({
            pointerEvents: 'none',
            color: theme.colors.text.secondary,
        }),
    };
};

type AlertSuccessExploreLinkProps = {
    exploreUrl: string;
    dataSource: DataSourceSettingsType;
};

export type DataSourceTestSuccessExploreLinkContextV1 = {
    dataSource: DataSourceSettingsType;
};

export function AlertSuccessExploreLink(props: AlertSuccessExploreLinkProps): React.ReactElement {
    const { exploreUrl, dataSource } = props;
    const theme = useTheme2();
    const styles = getStyles(theme, false);
    const canExploreDataSources = contextSrv.hasAccessToExplore();
    const extensionContext = useMemo<DataSourceTestSuccessExploreLinkContextV1>(() => ({ dataSource }), [dataSource]);

    const { isLoading, links } = usePluginLinks({
        extensionPointId: PluginExtensionPoints.DataSourceConfigTestSuccessfulExploreLink,
        context: extensionContext,
    });

    const exploreLink = useMemo(() => {
        // maybe have some kind of sorting that select link to use based on
        // some criteria. Maybe use the explore-logs if it is available but select
        // another link if it is not available.
        return links.find((link) => link.pluginId === 'grafana-lokiexplore-app');
    }, [links]);

    if (isLoading) {
        return <div>return some kind of loading state..</div>;
    }

    if (!exploreLink) {
        // This is the default case. But maybe we should hide the link if no link is available?
        return (
            <Link
                aria-label={`Explore data`}
                className={cx('external-link', {
                    [`${styles.disabled}`]: !canExploreDataSources,
                    'test-disabled': !canExploreDataSources,
                })}
                href={exploreUrl}
            >
                Explore view
            </Link>
        );
    }

    return (
        <Link
            aria-label={exploreLink.title}
            className={cx('external-link', {
                [`${styles.disabled}`]: !canExploreDataSources,
                'test-disabled': !canExploreDataSources,
            })}
            href={exploreLink.path}
            onClick={exploreLink.onClick}
        >
            {exploreLink.title}
        </Link>
    );
}
