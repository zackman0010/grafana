package schemaversion_test

import (
	"testing"

	"github.com/grafana/grafana/pkg/apis/dashboard/migration/schemaversion"
)

func TestV38(t *testing.T) {
	tests := []migrationTestCase{
		{
			name: "no table panels",
			input: map[string]any{
				"schemaVersion": 37,
				"title":         "Test Dashboard",
				"panels": []any{
					map[string]any{
						"type":  "graph",
						"title": "Panel 1",
					},
				},
			},
			expected: map[string]any{
				"title":         "Test Dashboard",
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"type":  "graph",
						"title": "Panel 1",
					},
				},
			},
		},
		{
			name: "table panel with basic gauge displayMode",
			input: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"displayMode": "basic",
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"cellOptions": map[string]any{
										"type": "gauge",
										"mode": "basic",
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "table panel with gradient-gauge displayMode",
			input: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"displayMode": "gradient-gauge",
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"cellOptions": map[string]any{
										"type": "gauge",
										"mode": "gradient",
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "table panel with lcd-gauge displayMode",
			input: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"displayMode": "lcd-gauge",
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"cellOptions": map[string]any{
										"type": "gauge",
										"mode": "lcd",
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "table panel with color-background displayMode",
			input: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"displayMode": "color-background",
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"cellOptions": map[string]any{
										"type": "color-background",
										"mode": "gradient",
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "table panel with color-background-solid displayMode",
			input: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"displayMode": "color-background-solid",
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"cellOptions": map[string]any{
										"type": "color-background",
										"mode": "basic",
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "table panel with default displayMode",
			input: map[string]any{
				"schemaVersion": 37,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"displayMode": "some-other-mode",
								},
							},
						},
					},
				},
			},
			expected: map[string]any{
				"schemaVersion": 38,
				"panels": []any{
					map[string]any{
						"type": "table",
						"fieldConfig": map[string]any{
							"defaults": map[string]any{
								"custom": map[string]any{
									"cellOptions": map[string]any{
										"type": "some-other-mode",
									},
								},
							},
						},
					},
				},
			},
		},
	}
	runMigrationTests(t, tests, schemaversion.V38)
}
