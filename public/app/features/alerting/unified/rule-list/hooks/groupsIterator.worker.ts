import * as comlink from 'comlink';
import { AsyncIterableX, from } from 'ix/asynciterable/index';
import { merge } from 'ix/asynciterable/merge';
import { filter, flatMap, map, take } from 'ix/asynciterable/operators';

import { type ExternalRulesSourceIdentifier } from 'app/types/unified-alerting';
import type {
  GrafanaPromRuleDTO,
  GrafanaPromRuleGroupDTO,
  PromRuleDTO,
  PromRuleGroupDTO,
} from 'app/types/unified-alerting-dto';

import { PromRulesResponse } from '../../api/prometheusApi';
import type { RulesFilter } from '../../search/rulesSearchParser';

import type { GrafanaRuleWithOrigin, PromRuleWithOrigin } from './useFilteredRulesIterator';

export class PrometheusGroupsProvider {
  private iterator: AsyncIterator<PromRuleWithOrigin | GrafanaRuleWithOrigin>;

  constructor(rulesSources: ExternalRulesSourceIdentifier[], filterState: RulesFilter) {
    const generator = filteredRulesGenerator(rulesSources, filterState);
    this.iterator = generator[Symbol.asyncIterator]();
  }

  async takeNext(): Promise<PromRuleWithOrigin | GrafanaRuleWithOrigin | undefined> {
    const result = await this.iterator.next();
    return result.done ? undefined : result.value;
  }
}

comlink.expose(PrometheusGroupsProvider);

function filteredRulesGenerator(rulesSources: ExternalRulesSourceIdentifier[], filterState: RulesFilter) {
  const groupLimit = 2000;

  const grafanaIterator = from(grafanaGroupsGenerator(groupLimit, filterState)).pipe(
    // filter((group) => groupFilter(group, filterState)), // Filtering at this level has a big performance penalty
    flatMap((group) => group.rules.map((rule) => [group, rule] as const)),
    // filter(([_, rule]) => ruleFilter(rule, filterState)),
    map(([group, rule]) => mapGrafanaRuleToRuleWithOrigin(group, rule))
  );

  const [source, ...iterables] = rulesSources.map((ds) => {
    return from(prometheusGroupsGenerator(ds, groupLimit, filterState)).pipe(map((group) => [ds, group] as const));
  });

  const dataSourcesIterator = merge(source, ...iterables).pipe(
    // filter(([_, group]) => groupFilter(group, filterState)),
    flatMap(([rulesSource, group]) => group.rules.map((rule) => [rulesSource, group, rule] as const)),
    // filter(([_, __, rule]) => ruleFilter(rule, filterState)),
    map(([rulesSource, group, rule]) => mapRuleToRuleWithOrigin(rulesSource, group, rule))
  );

  return merge(grafanaIterator, dataSourcesIterator);
}

async function* prometheusGroupsGenerator(
  rulesSource: ExternalRulesSourceIdentifier,
  groupLimit: number,
  filterState: RulesFilter
) {
  try {
    const response = await fetchPrometheusGroups(rulesSource, { groupLimit });

    if (!response.ok) {
      console.error(`Failed to fetch rules from ${rulesSource.uid}: ${response.status}`);
      return;
    }

    const data = (await response.json()) as PromRulesResponse<PromRuleGroupDTO>;

    yield* getMatchingGroups(data.data.groups, filterState);

    let lastToken: string | undefined = undefined;
    if (data.data.groupNextToken) {
      lastToken = data.data.groupNextToken;
    }

    while (lastToken) {
      const response = await fetchPrometheusGroups(rulesSource, { groupLimit, groupNextToken: lastToken });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as PromRulesResponse<PromRuleGroupDTO>;

      if (data.data.groups) {
        yield* getMatchingGroups(data.data.groups, filterState);
      }

      lastToken = data.data.groupNextToken;
    }
  } catch (error) {
    console.error(error);
    return;
  }
}

async function* grafanaGroupsGenerator(groupLimit: number, filterState: RulesFilter) {
  try {
    const response = await fetchGrafanaGroups({ groupLimit });

    if (!response.ok) {
      console.error(`Failed to fetch rules from grafana: ${response.status}`);
      return;
    }

    const data = (await response.json()) as PromRulesResponse<GrafanaPromRuleGroupDTO>;

    yield* getMatchingGroups(data.data.groups, filterState);

    let lastToken: string | undefined = undefined;
    if (data.data.groupNextToken) {
      lastToken = data.data.groupNextToken;
    }

    while (lastToken) {
      const response = await fetchGrafanaGroups({ groupLimit, groupNextToken: lastToken });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as PromRulesResponse<GrafanaPromRuleGroupDTO>;

      if (data.data.groups) {
        yield* getMatchingGroups(data.data.groups, filterState);
      }

      lastToken = data.data.groupNextToken;
    }
  } catch (error) {
    console.error(error);
    return;
  }
}

interface FetchOptions {
  groupLimit: number;
  groupNextToken?: string;
}

function fetchPrometheusGroups(rulesSource: ExternalRulesSourceIdentifier, options: FetchOptions) {
  const { groupLimit, groupNextToken } = options;

  const searchParams = new URLSearchParams({ group_limit: groupLimit.toString() });
  if (groupNextToken) {
    searchParams.set('group_next_token', groupNextToken);
  }

  const url = `https://localhost/api/prometheus/${rulesSource.uid}/api/v1/rules?${searchParams.toString()}`;

  return fetch(url);
}

function fetchGrafanaGroups(options: FetchOptions) {
  const { groupLimit, groupNextToken } = options;

  const searchParams = new URLSearchParams({ group_limit: groupLimit.toString() });
  if (groupNextToken) {
    searchParams.set('group_next_token', groupNextToken);
  }

  const url = `https://localhost/api/prometheus/grafana/api/v1/rules?${searchParams.toString()}`;
  return fetch(url);
}

function mapRuleToRuleWithOrigin(
  rulesSource: ExternalRulesSourceIdentifier,
  group: PromRuleGroupDTO,
  rule: PromRuleDTO
): PromRuleWithOrigin {
  return {
    rule,
    groupIdentifier: {
      rulesSource,
      namespace: { name: group.file },
      groupName: group.name,
      groupOrigin: 'datasource',
    },
    origin: 'datasource',
  };
}

function mapGrafanaRuleToRuleWithOrigin(
  group: GrafanaPromRuleGroupDTO,
  rule: GrafanaPromRuleDTO
): GrafanaRuleWithOrigin {
  return {
    rule,
    groupIdentifier: {
      rulesSource: {
        uid: 'grafana',
        name: 'grafana',
        ruleSourceType: 'grafana',
      },
      namespace: { uid: group.folderUid },
      groupName: group.name,
      groupOrigin: 'grafana',
    },
    namespaceName: group.file,
    origin: 'grafana',
  };
}

function getMatchingGroups<TGroup extends PromRuleGroupDTO>(groups: TGroup[], filterState: RulesFilter): TGroup[] {
  return groups.reduce<TGroup[]>((acc, group) => {
    if (groupFilter(group, filterState)) {
      const groupWithMatchingRules = {
        ...group,
        rules: group.rules.filter((rule) => ruleFilter(rule, filterState)),
      };

      if (groupWithMatchingRules.rules.length > 0) {
        acc.push(groupWithMatchingRules);
      }
    }
    return acc;
  }, []);
}
/**
 * Returns a new group with only the rules that match the filter.
 * @returns A new group with filtered rules, or undefined if the group does not match the filter or all rules are filtered out.
 */
function groupFilter(group: PromRuleGroupDTO, filterState: RulesFilter): boolean {
  const { name, file } = group;

  // TODO Add fuzzy filtering or not
  if (filterState.namespace && !file.toLowerCase().includes(filterState.namespace)) {
    return false;
  }

  if (filterState.groupName && !name.toLowerCase().includes(filterState.groupName)) {
    return false;
  }

  return true;
}

function ruleFilter(rule: PromRuleDTO, filterState: RulesFilter) {
  const { name, labels = {}, health, type } = rule;

  const nameLower = name.toLowerCase();

  if (filterState.freeFormWords.length > 0 && !filterState.freeFormWords.some((word) => nameLower.includes(word))) {
    return false;
  }

  if (filterState.ruleName && !nameLower.includes(filterState.ruleName)) {
    return false;
  }

  // if (filterState.labels.length > 0) {
  //   const matchers = compact(filterState.labels.map(looseParseMatcher));
  //   const doRuleLabelsMatchQuery = matchers.length > 0 && labelsMatchMatchers(labels, matchers);
  //   if (!doRuleLabelsMatchQuery) {
  //     return false;
  //   }
  // }

  // if (filterState.ruleType && type !== filterState.ruleType) {
  //   return false;
  // }

  // if (filterState.ruleState) {
  //   if (!isAlertingRule(rule)) {
  //     return false;
  //   }
  //   if (rule.state !== filterState.ruleState) {
  //     return false;
  //   }
  // }

  // if (filterState.ruleHealth && health !== filterState.ruleHealth) {
  //   return false;
  // }

  // if (filterState.dashboardUid) {
  //   return rule.labels ? rule.labels[Annotation.dashboardUID] === filterState.dashboardUid : false;
  // }

  return true;
}
