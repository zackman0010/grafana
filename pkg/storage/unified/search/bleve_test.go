package search

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/storage/unified/resource"
)

func TestBleveBackend(t *testing.T) {
	key := &resource.ResourceKey{
		Namespace: "default",
		Group:     "dashboard.grafana.app",
		Resource:  "dashboards",
	}
	tmpdir, err := os.CreateTemp("", "bleve-test")
	require.NoError(t, err)

	backend := &bleveBackend{
		tracer: tracing.NewNoopTracerService(),
		log:    slog.Default(),
		opts: bleveOptions{
			Root:          tmpdir.Name(),
			FileThreshold: 5,
		},
		cache: make(map[resource.NamespacedResource]*bleveIndex),
	}

	rv := int64(10)
	ctx := context.Background()
	index, err := backend.BuildIndex(ctx, resource.NamespacedResource{
		Namespace: key.Namespace,
		Group:     key.Group,
		Resource:  key.Resource,
	}, 2, rv, func(index resource.ResourceIndex) (int64, error) {
		index.Write(&StandardDocumentFields{
			ID:         "aaa",
			RV:         1,
			Name:       "aaa",
			Folder:     "folder-A",
			OriginName: "SQL",
		})
		index.Write(&StandardDocumentFields{
			ID:         "bbb",
			RV:         2,
			Name:       "bbb",
			Folder:     "folder-B",
			OriginName: "SQL",
		})
		return rv, nil
	})
	require.NoError(t, err)
	require.NotNil(t, index)

	rsp, err := index.Search(ctx, nil, &resource.ResourceSearchRequest{
		Query: "*",
		Limit: 100000,
	})
	require.NoError(t, err)
	require.Nil(t, rsp.Error)
	require.NotNil(t, rsp.Frame)

	names := []string{}
	// for _, r := range rsp.Values {
	// 	names = append(names, r.Name)
	// }
	require.Equal(t, []string{"aaa", "bbb"}, names)

	// jj, err := json.MarshalIndent(rsp, "", "  ")
	// require.NoError(t, err)
	// fmt.Printf("%s\n", jj)
	// require.JSONEq(t, `{}`, string(jj))
}
