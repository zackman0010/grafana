package search

import (
	"context"
	"log/slog"
	"path/filepath"

	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/storage/unified/resource"
)

// Construct the search options from settings
func NewSearchOptions(cfg *setting.Cfg, tracer tracing.Tracer) (resource.SearchOptions, error) {
	opts := resource.SearchOptions{
		Backend: &bleveBackend{
			log:    slog.Default().With("logger", "bleve-backend"),
			tracer: tracer,
			cache:  make(map[resource.NamespacedResource]*bleveIndex),
			opts: bleveOptions{
				Root:          filepath.Join(cfg.DataPath, "unified-search", "bleve"),
				FileThreshold: 500, // after 500 items, switch to file based index
			},
		},
	}
	opts.Resources = []resource.DocumentBuilderInfo{
		DefaultDocumentBuilder,
		{
			Group:    "dashboard.grafana.app",
			Resource: "dashboards",

			// This is a dummy example, and will need resolver setup for enterprise stats and and (eventually) data sources
			Namespaced: func(ctx context.Context, namespace string) (resource.DocumentBuilder, error) {
				return &DashboardDocumentBuilder{
					Namespace: namespace,
				}, nil
			},
		},
	}
	return opts, nil
}
