package schemaversion_test

import (
	"testing"

	"github.com/grafana/grafana/pkg/apis/dashboard/migration/schemaversion"
)

func TestV37(t *testing.T) {
	tests := []migrationTestCase{
		{
			name: "no legend config",
			input: map[string]any{
				"schemaVersion": 36,
				"panels": []any{
					map[string]any{
						"type":    "graph",
						"options": map[string]any{},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"type":    "graph",
						"options": map[string]any{},
					},
				},
			},
		},
		{
			name: "boolean legend true",
			input: map[string]any{
				"schemaVersion": 36,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": true,
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"displayMode": "list",
								"showLegend":  true,
							},
						},
					},
				},
			},
		},
		{
			name: "boolean legend false",
			input: map[string]any{
				"schemaVersion": 36,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": false,
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"displayMode": "list",
								"showLegend":  false,
							},
						},
					},
				},
			},
		},
		{
			name: "hidden displayMode",
			input: map[string]any{
				"schemaVersion": 36,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"displayMode": "hidden",
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"displayMode": "list",
								"showLegend":  false,
							},
						},
					},
				},
			},
		},
		{
			name: "showLegend false",
			input: map[string]any{
				"schemaVersion": 36,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"showLegend": false,
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"displayMode": "list",
								"showLegend":  false,
							},
						},
					},
				},
			},
		},
		{
			name: "visible legend",
			input: map[string]any{
				"schemaVersion": 36,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"displayMode": "table",
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"options": map[string]any{
							"legend": map[string]any{
								"displayMode": "table",
								"showLegend":  true,
							},
						},
					},
				},
			},
		},
	}
	runMigrationTests(t, tests, schemaversion.V37)
}
