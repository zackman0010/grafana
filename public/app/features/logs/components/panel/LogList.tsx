import { debounce } from 'lodash';
import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ListChildComponentProps, VariableSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

import { AbsoluteTimeRange, CoreApp, EventBus, LogRowModel, LogsSortOrder, TimeRange } from '@grafana/data';
import { Spinner, useTheme2 } from '@grafana/ui';

import { canScrollBottom, getVisibleRange } from '../InfiniteScroll';

import { LogLine } from './LogLine';
import { LogLineMessage } from './LogLineMessage';
import { preProcessLogs, ProcessedLogModel } from './processing';
import {
  getLogLineSize,
  init as initVirtualization,
  resetLogLineSizes,
  ScrollToLogsEvent,
  storeLogLineSize,
} from './virtualization';

interface Props {
  app: CoreApp;
  logs: LogRowModel[];
  containerElement: HTMLDivElement;
  eventBus: EventBus;
  forceEscape?: boolean;
  loadMore?: (range: AbsoluteTimeRange) => void;
  showTime: boolean;
  sortOrder: LogsSortOrder;
  timeRange: TimeRange;
  timeZone: string;
  wrapLogMessage: boolean;
}

type InfiniteLoaderState = 'loading' | 'out-of-bounds' | 'idle';

export const LogList = ({
  app,
  containerElement,
  loadMore,
  logs,
  eventBus,
  forceEscape = false,
  showTime,
  sortOrder,
  timeRange,
  timeZone,
  wrapLogMessage,
}: Props) => {
  const [processedLogs, setProcessedLogs] = useState<ProcessedLogModel[]>([]);
  const [listHeight, setListHeight] = useState(
    app === CoreApp.Explore ? window.innerHeight * 0.75 : containerElement.clientHeight
  );
  const theme = useTheme2();
  const listRef = useRef<VariableSizeList | null>(null);
  const widthRef = useRef(containerElement.clientWidth);
  const logsRef = useRef<LogRowModel[]>([]);
  const infiniteLoaderStateRef = useRef<InfiniteLoaderState>('idle');

  useEffect(() => {
    initVirtualization(theme);
  }, [theme]);

  useEffect(() => {
    const subscription = eventBus.subscribe(ScrollToLogsEvent, (e: ScrollToLogsEvent) =>
      handleScrollToEvent(e, processedLogs.length, listRef.current)
    );
    return () => subscription.unsubscribe();
  }, [eventBus, processedLogs.length]);

  useEffect(() => {
    setProcessedLogs(preProcessLogs(logs, { wrap: wrapLogMessage, escape: forceEscape, order: sortOrder, timeZone }));
    handleNewLogsReceived(logs, logsRef.current, listRef.current, infiniteLoaderStateRef);
    logsRef.current = logs;
  }, [forceEscape, logs, sortOrder, timeZone, wrapLogMessage]);

  useEffect(() => {
    const handleResize = debounce(() => {
      setListHeight(app === CoreApp.Explore ? window.innerHeight * 0.75 : containerElement.clientHeight);
    }, 50);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [app, containerElement.clientHeight]);

  useLayoutEffect(() => {
    if (widthRef.current === containerElement.clientWidth) {
      return;
    }
    resetLogLineSizes();
    listRef.current?.resetAfterIndex(0);
    widthRef.current = containerElement.clientWidth;
  });

  const handleOverflow = useCallback(
    (index: number, id: string, height: number) => {
      if (containerElement) {
        storeLogLineSize(id, containerElement, height);
        listRef.current?.resetAfterIndex(index);
      }
    },
    [containerElement]
  );

  const isItemLoaded = useCallback(
    (index: number) => {
      return processedLogs[index] != null || infiniteLoaderStateRef.current !== 'idle';
    },
    [infiniteLoaderStateRef, processedLogs]
  );

  const handleLoadMore = useCallback(() => {
    if (infiniteLoaderStateRef.current === 'out-of-bounds') {
      return;
    }
    const newRange = canScrollBottom(getVisibleRange(processedLogs), timeRange, timeZone, sortOrder);
    if (!newRange) {
      infiniteLoaderStateRef.current = 'out-of-bounds';
      return;
    }
    infiniteLoaderStateRef.current = 'loading';
    loadMore?.(newRange);
  }, [loadMore, processedLogs, sortOrder, timeRange, timeZone]);

  const Renderer = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      if (!processedLogs[index]) {
        const message =
          infiniteLoaderStateRef.current === 'loading' ? (
            <>
              Loading {sortOrder === LogsSortOrder.Ascending ? 'newer' : 'older'} logs <Spinner inline />
            </>
          ) : (
            <>End of the selected time range.</>
          );
        return <LogLineMessage style={style}>{message}</LogLineMessage>;
      }
      return (
        <LogLine
          index={index}
          log={processedLogs[index]}
          showTime={showTime}
          style={style}
          wrapLogMessage={wrapLogMessage}
          onOverflow={handleOverflow}
        />
      );
    },
    [handleOverflow, infiniteLoaderStateRef, processedLogs, showTime, sortOrder, wrapLogMessage]
  );

  if (!containerElement || listHeight == null) {
    // Wait for container to be rendered
    return null;
  }

  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={processedLogs.length && loadMore ? processedLogs.length + 1 : processedLogs.length}
      loadMoreItems={handleLoadMore}
      threshold={1}
    >
      {({ onItemsRendered, ref }) => (
        <VariableSizeList
          height={listHeight}
          itemCount={processedLogs.length && loadMore ? processedLogs.length + 1 : processedLogs.length}
          itemSize={getLogLineSize.bind(null, processedLogs, containerElement, { wrap: wrapLogMessage, showTime })}
          itemKey={(index: number) => (processedLogs[index] ? processedLogs[index].uid : index)}
          layout="vertical"
          onItemsRendered={onItemsRendered}
          ref={(element) => {
            ref(element);
            listRef.current = element;
          }}
          style={{ overflowY: 'scroll' }}
          width="100%"
        >
          {Renderer}
        </VariableSizeList>
      )}
    </InfiniteLoader>
  );
};

function handleScrollToEvent(event: ScrollToLogsEvent, logsCount: number, list: VariableSizeList | null) {
  if (event.payload.scrollTo === 'top') {
    list?.scrollTo(0);
  } else {
    list?.scrollToItem(logsCount - 1);
  }
}

function handleNewLogsReceived(
  newLogs: LogRowModel[],
  prevLogs: LogRowModel[],
  list: VariableSizeList | null,
  infiniteLoaderStateRef: MutableRefObject<InfiniteLoaderState>
) {
  list?.resetAfterIndex(0);
  if (infiniteLoaderStateRef.current === 'idle' || infiniteLoaderStateRef.current === 'out-of-bounds') {
    list?.scrollTo(0);
    infiniteLoaderStateRef.current = 'idle';
  } else if (infiniteLoaderStateRef.current === 'loading') {
    infiniteLoaderStateRef.current = newLogs.length === prevLogs.length ? 'out-of-bounds' : 'idle';
  }
}
