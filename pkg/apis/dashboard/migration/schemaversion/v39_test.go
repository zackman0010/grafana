package schemaversion_test

import (
	"testing"

	"github.com/grafana/grafana/pkg/apis/dashboard/migration/schemaversion"
)

func TestV39(t *testing.T) {
	tests := []migrationTestCase{
		{
			name: "no transformations",
			input: map[string]any{
				"schemaVersion": 38,
				"title":         "Test Dashboard",
				"panels": []any{
					map[string]any{
						"title": "Panel 1",
					},
				},
			},
			expected: map[string]any{
				"title":         "Test Dashboard",
				"schemaVersion": 39,
				"panels": []any{
					map[string]any{
						"title": "Panel 1",
					},
				},
			},
		},
		{
			name: "timeSeriesTable transformation with refIdToStat",
			input: map[string]any{
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"transformations": []any{
							map[string]any{
								"id": "timeSeriesTable",
								"options": map[string]any{
									"refIdToStat": map[string]any{
										"A": "mean",
										"B": "max",
									},
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 39,
				"panels": []any{
					map[string]any{
						"transformations": []any{
							map[string]any{
								"id": "timeSeriesTable",
								"options": map[string]any{
									"A": map[string]any{
										"stat": "mean",
									},
									"B": map[string]any{
										"stat": "max",
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "non-timeSeriesTable transformation is not modified",
			input: map[string]any{
				"panels": []any{
					map[string]any{
						"transformations": []any{
							map[string]any{
								"id": "otherTransform",
								"options": map[string]any{
									"refIdToStat": map[string]any{
										"A": "mean",
									},
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 39,
				"panels": []any{
					map[string]any{
						"transformations": []any{
							map[string]any{
								"id": "otherTransform",
								"options": map[string]any{
									"refIdToStat": map[string]any{
										"A": "mean",
									},
								},
							},
						},
					},
				},
			},
		},
	}
	runMigrationTests(t, tests, schemaversion.V39)
}
