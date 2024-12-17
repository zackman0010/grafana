import { useCallback, useDeferredValue, useEffect, useState } from 'react';

import { useURLSearchParams } from '../../../hooks/useURLSearchParams';

export type ContactPointsFilterState = {
  search?: string;
  type?: string;
};

export function useContactPointsFilter() {
  const [searchParams, setSearchParams] = useURLSearchParams();
  const [filters, setFilters] = useState<ContactPointsFilterState>({
    search: searchParams.get('search') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  });
  const filtersDeferred = useDeferredValue(filters);

  const clear = useCallback(() => {
    setFilters({ search: '', type: '' });
  }, []);

  const updateFilter = useCallback((update: Partial<ContactPointsFilterState>) => {
    setFilters((filters) => ({ ...filters, ...update }));
  }, []);

  // // when the filters are updated (deferred) update the search params
  useEffect(() => {
    setSearchParams(filtersDeferred, true);
  }, [filtersDeferred, setSearchParams]);

  // When URL params change, update filters
  useEffect(() => {
    setFilters({
      search: searchParams.get('search') ?? undefined,
      type: searchParams.get('type') ?? undefined,
    });
  }, [searchParams]);

  return {
    clear,
    filters: filtersDeferred,
    updateFilter,
  };
}
