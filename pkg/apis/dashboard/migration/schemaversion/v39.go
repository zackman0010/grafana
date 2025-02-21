package schemaversion

// V39 updates the configuration of the Timeseries to table transformation
// to support multiple options per query
func V39(dashboard map[string]any) error {
	dashboard["schemaVersion"] = int(39)

	panels, ok := dashboard["panels"].([]any)
	if !ok {
		return nil
	}

	for _, panel := range panels {
		p, ok := panel.(map[string]any)
		if !ok {
			continue
		}

		transformations, ok := p["transformations"].([]any)
		if !ok {
			continue
		}

		for _, transformation := range transformations {
			t, ok := transformation.(map[string]any)
			if !ok {
				continue
			}

			// If we run into a timeSeriesTable transformation
			// and it doesn't have undefined options then we migrate
			if t["id"] != "timeSeriesTable" {
				continue
			}

			options, ok := t["options"].(map[string]any)
			if !ok {
				continue
			}

			refIdStats, ok := options["refIdToStat"].(map[string]any)
			if !ok {
				continue
			}

			// For each {refIdtoStat} record which maps refId to a statistic
			// we add that to the stat property of the new
			// RefIdTransformerOptions interface which includes multiple settings
			transformationOptions := make(map[string]any)
			for refId, stat := range refIdStats {
				transformationOptions[refId] = map[string]any{"stat": stat}
			}

			// Update the options
			t["options"] = transformationOptions
		}
	}

	return nil
}
