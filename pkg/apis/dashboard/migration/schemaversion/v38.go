package schemaversion

// V38 updates the configuration of the table panel to use the new cellOptions format
// and updates the overrides to use the new cellOptions format
func V38(dashboard map[string]any) error {
	dashboard["schemaVersion"] = int(38)

	panels, ok := dashboard["panels"].([]any)
	if !ok {
		return nil
	}

	for _, panel := range panels {
		p, ok := panel.(map[string]any)
		if !ok {
			continue
		}

		// Only process table panels
		if p["type"] != "table" {
			continue
		}

		fieldConfig, ok := p["fieldConfig"].(map[string]any)
		if !ok {
			continue
		}

		defaults, ok := fieldConfig["defaults"].(map[string]any)
		if !ok {
			continue
		}

		custom, ok := defaults["custom"].(map[string]any)
		if !ok {
			continue
		}

		// Migrate displayMode to cellOptions
		if displayMode, exists := custom["displayMode"]; exists {
			if displayModeStr, ok := displayMode.(string); ok {
				custom["cellOptions"] = migrateTableDisplayModeToCellOptions(displayModeStr)
			}
			// Delete the legacy field
			delete(custom, "displayMode")
		}

		// Update any overrides referencing the cell display mode
		migrateOverrides(fieldConfig)
	}

	return nil
}

// migrateOverrides updates the overrides configuration to use the new cellOptions format
func migrateOverrides(fieldConfig map[string]any) {
	overrides, ok := fieldConfig["overrides"].([]any)
	if !ok {
		return
	}

	for _, override := range overrides {
		o, ok := override.(map[string]any)
		if !ok {
			continue
		}

		properties, ok := o["properties"].([]any)
		if !ok {
			continue
		}

		for _, property := range properties {
			prop, ok := property.(map[string]any)
			if !ok {
				continue
			}

			// Update the id to cellOptions
			if prop["id"] == "custom.displayMode" {
				prop["id"] = "custom.cellOptions"
				if value, ok := prop["value"]; ok {
					if valueStr, ok := value.(string); ok {
						prop["value"] = migrateTableDisplayModeToCellOptions(valueStr)
					}
				}
			}
		}
	}
}

// migrateTableDisplayModeToCellOptions converts the old displayMode string to the new cellOptions format
func migrateTableDisplayModeToCellOptions(displayMode string) map[string]any {
	switch displayMode {
	case "basic", "gradient-gauge", "lcd-gauge":
		gaugeMode := "basic"
		if displayMode == "gradient-gauge" {
			gaugeMode = "gradient"
		} else if displayMode == "lcd-gauge" {
			gaugeMode = "lcd"
		}
		return map[string]any{
			"type": "gauge",
			"mode": gaugeMode,
		}

	case "color-background", "color-background-solid":
		mode := "basic"
		if displayMode == "color-background" {
			mode = "gradient"
		}
		return map[string]any{
			"type": "color-background",
			"mode": mode,
		}

	default:
		return map[string]any{
			"type": displayMode,
		}
	}
}
