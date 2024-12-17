import uFuzzy from '@leeoniya/ufuzzy';
import { uniq } from 'lodash';
import { useMemo } from 'react';

import { RECEIVER_META_KEY } from 'app/features/alerting/unified/components/contact-points/constants';
import { ContactPointWithMetadata } from 'app/features/alerting/unified/components/contact-points/utils';

import { ContactPointsFilterState } from './components/useContactPointsFilter';

const fuzzyFinder = new uFuzzy({
  intraMode: 1,
  intraIns: 1,
  intraSub: 1,
  intraDel: 1,
  intraTrn: 1,
});

// let's search in two different haystacks, the name of the contact point and the type of the receiver(s)
export const useContactPointsSearch = (
  contactPoints: ContactPointWithMetadata[],
  filters: ContactPointsFilterState = {}
): ContactPointWithMetadata[] => {
  const hasFilters = Object.values(filters).some(Boolean);
  const { search, type } = filters;

  const nameHaystack = useMemo(() => {
    return contactPoints.map((contactPoint) => contactPoint.name);
  }, [contactPoints]);

  const typeHaystack = useMemo(() => {
    return contactPoints.map((contactPoint) =>
      // we're using the resolved metadata key here instead of the "type" property – ex. we alias "teams" to "microsoft teams"
      contactPoint.grafana_managed_receiver_configs.map((receiver) => receiver[RECEIVER_META_KEY].name).join(' ')
    );
  }, [contactPoints]);

  if (!hasFilters) {
    return contactPoints;
  }

  const results: ContactPointWithMetadata[] = [];

  if (search) {
    fuzzyFinder.filter(nameHaystack, search)?.forEach((id) => {
      results.push(contactPoints[id]);
    });
  }

  if (type) {
    fuzzyFinder.filter(typeHaystack, type)?.forEach((id) => {
      results.push(contactPoints[id]);
    });
  }

  return uniq(results);
};
