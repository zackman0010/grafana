package metrics

import "slices"

import "github.com/grafana/grafana/pkg/tsdb/azuremonitor/kinds/dataquery"

func MigrateDimensionFilters(filters []dataquery.AzureMetricDimension) []dataquery.AzureMetricDimension {
	var newFilters []dataquery.AzureMetricDimension
	for _, filter := range filters {
		newFilter := filter
		// Ignore the deprecation check as this is a migration
		// nolint:staticcheck
		newFilter.Filter = nil
		// If there is no old field and the new field is specified - append as this is valid
		// nolint:staticcheck
		if filter.Filter == nil && filter.Filters != nil {
			newFilters = append(newFilters, newFilter)
		} else {
			// nolint:staticcheck
			oldFilter := *filter.Filter
			// If there is an old filter and no new ones then construct the new array and append
			if filter.Filters == nil && oldFilter != "*" {
				newFilter.Filters = []string{oldFilter}
				// If both the new and old fields are specified (edge case) then construct the appropriate values
			} else {
				hasFilter := false
				oldFilters := filter.Filters
				if slices.Contains(oldFilters, oldFilter) {
					hasFilter = true
				}
				if !hasFilter && oldFilter != "*" {
					oldFilters = append(oldFilters, oldFilter)
					newFilter.Filters = oldFilters
				}
			}
			newFilters = append(newFilters, newFilter)
		}
	}
	return newFilters
}
