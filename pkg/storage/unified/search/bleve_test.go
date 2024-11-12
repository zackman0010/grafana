package search

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana-plugin-sdk-go/data"
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
			Tags:       []string{"aa", "bb"},
			Created:    time.Unix(10000, 0), // searchable, but not stored!!! (by default)
		})
		index.Write(&StandardDocumentFields{
			ID:         "bbb",
			RV:         2,
			Name:       "bbb",
			Folder:     "folder-B",
			OriginName: "SQL",
			Labels: map[string]string{
				"key": "value",
			},
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

	frame := &data.Frame{}
	err = frame.UnmarshalJSON(rsp.Frame)
	require.NoError(t, err)

	//	fmt.Printf("%s\n", rsp.Frame)

	field, _ := frame.FieldByName("name")
	require.NotNil(t, field)

	require.Equal(t, []any{"aaa", "bbb"}, asSlice(field))

	// jj, err := json.MarshalIndent(rsp, "", "  ")
	// require.NoError(t, err)
	// fmt.Printf("%s\n", jj)
	// require.JSONEq(t, `{}`, string(jj))
}

func asSlice(f *data.Field) []any {
	v := make([]any, f.Len())
	for i := 0; i < len(v); i++ {
		v[i] = f.At(i)
	}
	return v
}
