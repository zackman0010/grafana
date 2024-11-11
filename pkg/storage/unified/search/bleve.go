package search

import (
	"context"
	"fmt"
	"log/slog"
	"path/filepath"
	"sync"

	"github.com/blevesearch/bleve/v2"
	"go.opentelemetry.io/otel/trace"

	"github.com/grafana/authlib/authz"
	"github.com/grafana/grafana/pkg/storage/unified/resource"
)

const tracingPrexfixBleve = "unified_search.bleve."

var _ resource.SearchBackend = &bleveBackend{}
var _ resource.DocumentIndex = &bleveIndex{}

type bleveOptions struct {
	// The root folder where file objects are saved
	Root string

	// The resource count where values switch from memory to file based
	FileThreshold int64
}

type bleveBackend struct {
	tracer trace.Tracer
	log    *slog.Logger
	opts   bleveOptions

	// cache info
	cache   map[resource.NamespacedResource]*bleveIndex
	cacheMu sync.RWMutex
}

// This will return nil if the key does not exist
func (b *bleveBackend) GetIndex(ctx context.Context, key resource.NamespacedResource) (resource.DocumentIndex, error) {
	b.cacheMu.RLock()
	defer b.cacheMu.RUnlock()

	return b.cache[key], nil
}

// Build an index from scratch
func (b *bleveBackend) BuildIndex(ctx context.Context,
	key resource.NamespacedResource,

	// When the size is known, it will be passed along here
	// Depending on the size, the backend may choose different options (eg: memory vs disk)
	size int64,

	// The last known resource version can be used to know that we can skip calling the builder
	resourceVersion int64,

	// The builder will write all documents before returning
	builder func(index resource.DocumentIndex) (int64, error),
) (resource.DocumentIndex, error) {
	b.cacheMu.Lock()
	defer b.cacheMu.Unlock()

	_, span := b.tracer.Start(ctx, tracingPrexfixBleve+"BuildIndex")
	defer span.End()

	var err error
	var index bleve.Index
	mapping := bleve.NewIndexMapping() // auto-magic
	if size > b.opts.FileThreshold {
		dir := filepath.Join(b.opts.Root, key.Namespace, fmt.Sprintf("%s.%s", key.Resource, key.Group))
		index, err = bleve.New(dir, mapping)
		if err == nil {
			b.log.Info("TODO, check last RV so we can see if the numbers have changed", "dir", dir)
		}
	} else {
		index, err = bleve.NewMemOnly(mapping)
	}
	if err != nil {
		return nil, err
	}

	// Batch all the changes
	idx := &bleveIndex{
		key:   key,
		index: index,
		batch: index.NewBatch(),
	}
	_, err = builder(idx)
	if err != nil {
		return nil, err
	}

	// Flush the batch
	err = idx.Flush()
	if err != nil {
		return nil, err
	}

	b.cache[key] = idx
	return idx, nil
}

type bleveIndex struct {
	key   resource.NamespacedResource
	index bleve.Index

	// only valid in single thread
	batch     *bleve.Batch
	batchSize int
}

// Write implements resource.DocumentIndex.
func (b *bleveIndex) Write(doc resource.IndexableDocument) error {
	if b.batch != nil {
		err := b.batch.Index(doc.GetID(), doc)
		if err != nil {
			return err
		}
		if b.batch.Size() > b.batchSize {
			err = b.index.Batch(b.batch)
			b.batch.Reset() // clear the batch
		}
		return err // nil
	}
	return b.index.Index(doc.GetID(), doc)
}

// Delete implements resource.DocumentIndex.
func (b *bleveIndex) Delete(key *resource.ResourceKey) error {
	if b.batch != nil {
		return fmt.Errorf("unexpected delete while building batch")
	}
	return b.index.Delete(toID(key))
}

// Flush implements resource.DocumentIndex.
func (b *bleveIndex) Flush() (err error) {
	if b.batch != nil {
		err = b.index.Batch(b.batch)
		b.batch.Reset()
		b.batch = nil
	}
	return err
}

// Origin implements resource.DocumentIndex.
func (b *bleveIndex) Origin(ctx context.Context, ac authz.ItemChecker, req *resource.OriginRequest) (*resource.OriginResponse, error) {
	panic("unimplemented")
}

// Search implements resource.DocumentIndex.
func (b *bleveIndex) Search(ctx context.Context, ac authz.ItemChecker, req *resource.SearchRequest) (*resource.IndexResults, error) {
	if !(req.Query == "" || req.Query == "*") {
		return nil, fmt.Errorf("currently only match all query is supported")
	}

	query := bleve.NewMatchAllQuery()

	res, err := b.index.Search(&bleve.SearchRequest{
		Fields: []string{
			"name",
			"folder",
			"origin_name",
		},
		Query: query,
		Size:  int(req.Limit),
		From:  int(req.Offset),
	})
	if err != nil {
		return nil, err
	}

	rsp := &resource.IndexResults{}
	for _, hit := range res.Hits {
		n, ok := hit.Fields["name"]
		if !ok {
			return nil, fmt.Errorf("missing name: " + hit.ID)
		}

		//	fmt.Printf("HIT %+v\n", hit.Fields)

		rsp.Values = append(rsp.Values, resource.IndexedResource{
			Group:     b.key.Group,
			Namespace: b.key.Namespace,
			Name:      n.(string),
		})
	}
	return rsp, nil
}
