import { debounce } from 'lodash';
import { useState, useCallback, useMemo } from 'react';

import { itemFilter } from './filter';
import { ComboboxOption } from './types';
import { StaleResultError, useLatestAsyncCall } from './useLatestAsyncCall';

type AsyncOptions<T extends string | number> =
  | Array<ComboboxOption<T>>
  | ((inputValue: string) => Promise<Array<ComboboxOption<T>>>);

/**
 * Abstracts away sync/async options for MultiCombobox (and later Combobox).
 * It also filters options based on the user's input.
 *
 * Returns:
 *  - options either filtered by user's input, or from async options fn
 *  - function to call when user types (to filter, or call async fn)
 *  - loading and error states
 */
export function useOptions<T extends string | number>(rawOptions: AsyncOptions<T>) {
  const isAsync = typeof rawOptions === 'function';

  const loadOptionsBase = useCallback(
    (searchTerm: string) => {
      if (isAsync) {
        return rawOptions(searchTerm);
      }

      return rawOptions.filter(itemFilter(searchTerm));
    },
    [rawOptions, isAsync]
  );

  const loadOptions = useLatestAsyncCall(loadOptionsBase);

  const debouncedLoadOptions = useMemo(
    () =>
      debounce((searchTerm: string) => {
        console.log('debouncedLoadOptions', searchTerm);
        const result = loadOptions(searchTerm);

        if (!(result instanceof Promise)) {
          setAsyncLoading(false);
          setAsyncOptions(result);
          return;
        }

        result
          .then((options) => {
            setAsyncOptions(options);
            setAsyncLoading(false);
            setAsyncError(false);
          })
          .catch((error) => {
            if (!(error instanceof StaleResultError)) {
              setAsyncError(true);
              setAsyncLoading(false);

              if (error) {
                console.error('Error loading async options for Combobox', error);
              }
            }
          });
      }, 200),
    [loadOptions]
  );

  const [asyncOptions, setAsyncOptions] = useState<Array<ComboboxOption<T>>>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncError, setAsyncError] = useState(false);

  const updateOptions = useCallback(
    (inputValue: string) => {
      setAsyncLoading(true); // Set loading while it's debouncing
      debouncedLoadOptions(inputValue);
    },
    [debouncedLoadOptions]
  );

  const finalOptions = useMemo(() => {
    return asyncOptions;
  }, [asyncOptions]);

  return { options: finalOptions, updateOptions, asyncLoading, asyncError };
}
