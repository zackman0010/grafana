package resource

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/hashicorp/golang-lru/v2/expirable"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/sync/errgroup"

	"github.com/grafana/authlib/authz"
	"github.com/grafana/authlib/claims"
)

// Indexable values from a resource
// This will likely get more structure assigned as the requirements become more clear
type IndexableDocument interface {
	GetID() string
}

// Convert the core k8s bytes into an indexable document
type DocumentBuilder interface {
	// Convert raw bytes into an document that can be written
	BuildDocument(ctx context.Context, key *ResourceKey, rv int64, value []byte) (IndexableDocument, error)
}

// Passed as input to the constructor
type SearchOptions struct {
	// The raw index backend (eg, bleve, frames, parquet, etc)
	Backend SearchBackend

	// The supported resource types
	Resources []DocumentBuilderInfo
}

// Each namespace may need to load something
type DocumentBuilderInfo struct {
	Group    string
	Resource string

	// When the builder does not depend on cached namespace data
	Builder DocumentBuilder

	// When the builder is namespaced, it can be retrieved on demand
	Namespaced func(ctx context.Context, namespace string) (DocumentBuilder, error)
}

type ResourceIndex interface {
	// Add a document to the index.  Note it may not be searchable until after flush is called
	Write(doc IndexableDocument) error

	// Mark a resource as deleted.  Note it may not be searchable until after flush is called
	Delete(key *ResourceKey) error

	// Make sure any changes to the index are flushed and available in the next search/origin calls
	Flush() error

	// Execute a search query
	Search(ctx context.Context, ac authz.ItemChecker, req *ResourceSearchRequest) (*ResourceSearchResponse, error)

	// Execute an origin query -- access control is not not checked for each item
	Origin(ctx context.Context, req *OriginRequest) (*OriginResponse, error)
}

type NamespacedResource struct {
	Namespace string
	Group     string
	Resource  string
}

// All fields are set
func (s *NamespacedResource) Valid() bool {
	return s.Namespace != "" && s.Group != "" && s.Resource != ""
}

// SearchBackend contains the technology specific logic to support search
type SearchBackend interface {
	// This will return nil if the key does not exist
	GetIndex(ctx context.Context, key NamespacedResource) (ResourceIndex, error)

	// Build an index from scratch
	BuildIndex(ctx context.Context,
		key NamespacedResource,

		// When the size is known, it will be passed along here
		// Depending on the size, the backend may choose different options (eg: memory vs disk)
		size int64,

		// The last known resource version (can be used to know that nothing has changed)
		resourceVersion int64,

		// The builder will write all documents before returning
		builder func(index ResourceIndex) (int64, error),
	) (ResourceIndex, error)
}

const tracingPrexfixSearch = "unified_search."

// This supports indexing+search regardless of implementation
type searchSupport struct {
	tracer   trace.Tracer
	log      *slog.Logger
	storage  StorageBackend
	search   SearchBackend
	builders *builderCache

	initWorkers int
}

func newSearchSupport(opts SearchOptions, storage StorageBackend, tracer trace.Tracer) (support *searchSupport, err error) {
	// OK to skip search for now
	if opts.Backend == nil {
		return nil, nil // fmt.Errorf("missing search backend")
	}

	support = &searchSupport{
		tracer:  tracer,
		storage: storage,
		search:  opts.Backend,
		log:     slog.Default().With("logger", "resource-search"),
	}
	support.builders, err = newBuilderCache(opts.Resources, 100, time.Minute*2) // TODO? opts
	return support, err
}

// init is called during startup.  any failure will block startup and continued execution
func (s *searchSupport) init(ctx context.Context) error {
	_, span := s.tracer.Start(ctx, tracingPrexfixSearch+"Init")
	defer span.End()

	// TODO, replace namespaces with a query that gets top values
	namespaces, err := s.storage.Namespaces(ctx)
	if err != nil {
		return err
	}

	group := errgroup.Group{}
	group.SetLimit(s.initWorkers)
	totalBatchesIndexed := 0

	// Prepare all the (large) indexes
	// TODO, threading and query real information:
	// SELECT namespace,"group",resource,COUNT(*),resource_version FROM resource
	//   GROUP BY "group", "resource", "namespace"
	//   ORDER BY resource_version desc;
	for _, ns := range namespaces {
		for _, gv := range s.builders.kinds() {
			group.Go(func() error {
				s.log.Debug("initializing search index", "namespace", ns)
				totalBatchesIndexed++
				_, _, err = s.build(ctx, NamespacedResource{
					Group:     gv.Group,
					Resource:  gv.Resource,
					Namespace: ns,
				})
				return err
			})
		}
	}

	err = group.Wait()
	if err != nil {
		return err
	}
	span.AddEvent("namespaces indexed", trace.WithAttributes(attribute.Int("namespaced_indexed", totalBatchesIndexed)))

	// Now start listening for new events
	events, err := s.storage.WatchWriteEvents(ctx)
	if err != nil {
		return err
	}
	go func() {
		for {
			v := <-events

			s.handleEvent(ctx, v)
		}
	}()
	return nil
}

func (s *searchSupport) getOrCreateIndex(ctx context.Context, key NamespacedResource) (ResourceIndex, error) {
	// TODO???
	// We want to block while building the index and return the same index for the key
	// simple mutex not great... we don't want to block while anything in building, just the same key

	idx, err := s.search.GetIndex(ctx, key)
	if err != nil {
		return nil, err
	}

	if idx == nil {
		idx, _, err = s.build(ctx, key)
		if err != nil {
			return nil, err
		}
		if idx == nil {
			return nil, fmt.Errorf("nil index after build")
		}
	}
	return idx, nil
}

// Async event
func (s *searchSupport) handleEvent(ctx context.Context, evt *WrittenEvent) {
	nsr := NamespacedResource{
		Namespace: evt.Key.Namespace,
		Group:     evt.Key.Group,
		Resource:  evt.Key.Resource,
	}

	index, err := s.getOrCreateIndex(ctx, nsr)
	if err != nil {
		s.log.Warn("error getting index for watch event", "error", err)
		return
	}

	builder, err := s.builders.get(ctx, nsr)
	if err != nil {
		s.log.Warn("error getting builder for watch event", "error", err)
		return
	}

	doc, err := builder.BuildDocument(ctx, evt.Key, evt.ResourceVersion, evt.Value)
	if err != nil {
		s.log.Warn("error building document watch event", "error", err)
		return
	}

	err = index.Write(doc)
	if err != nil {
		s.log.Warn("error writing document watch event", "error", err)
		return
	}
}

// Builds an index from scratch
func (s *searchSupport) build(ctx context.Context, nsr NamespacedResource) (ResourceIndex, int64, error) {
	_, span := s.tracer.Start(ctx, tracingPrexfixSearch+"Build")
	defer span.End()

	builder, err := s.builders.get(ctx, nsr)
	if err != nil {
		return nil, 0, err
	}

	size := int64(0)
	rv := int64(0)

	key := &ResourceKey{
		Group:     nsr.Group,
		Resource:  nsr.Resource,
		Namespace: nsr.Namespace,
	}
	index, err := s.search.BuildIndex(ctx, nsr, size, rv, func(index ResourceIndex) (int64, error) {
		rv, err = s.storage.ListIterator(ctx, &ListRequest{
			Limit: 1000000000000, // big number
			Options: &ListOptions{
				Key: key,
			},
		}, func(iter ListIterator) error {
			for iter.Next() {
				if err = iter.Error(); err != nil {
					return err
				}

				// Update the key name
				// Or should we read it from the body?
				key.Name = iter.Name()

				// Convert it to an indexable document
				doc, err := builder.BuildDocument(ctx, key, iter.ResourceVersion(), iter.Value())
				if err != nil {
					return err
				}

				// And finally write it to the index
				if err = index.Write(doc); err != nil {
					return err
				}
			}
			return err
		})
		return rv, err
	})

	if err != nil {
		return nil, 0, err
	}

	if err == nil {
		err = index.Flush()
	}

	// rv is the last RV we read.  when watching, we must add all events since that time
	return index, rv, err
}

type builderCache struct {
	// The default builder
	defaultBuilder DocumentBuilder

	// lookup by group, then resource (namespace)
	// This is only modified at startup, so we do not need mutex for access
	lookup map[string]map[string]DocumentBuilderInfo

	// For namespaced based resources that require a cache
	ns *expirable.LRU[NamespacedResource, DocumentBuilder]
	mu sync.Mutex // only locked with a cache miss
}

func newBuilderCache(cfg []DocumentBuilderInfo, nsCacheSize int, ttl time.Duration) (*builderCache, error) {
	cache := &builderCache{
		lookup: make(map[string]map[string]DocumentBuilderInfo),
		ns:     expirable.NewLRU[NamespacedResource, DocumentBuilder](nsCacheSize, nil, ttl),
	}
	if len(cfg) == 0 {
		return cache, fmt.Errorf("no builders configured")
	}

	for _, b := range cfg {
		// the default
		if b.Group == "" && b.Resource == "" {
			if b.Builder == nil {
				return cache, fmt.Errorf("default document builder is missing")
			}
			cache.defaultBuilder = b.Builder
			continue
		}
		g, ok := cache.lookup[b.Group]
		if !ok {
			g = make(map[string]DocumentBuilderInfo)
			cache.lookup[b.Group] = g
		}
		g[b.Resource] = b
	}
	return cache, nil
}

// hack for now... iterate the registered kinds
func (s *builderCache) kinds() []NamespacedResource {
	kinds := make([]NamespacedResource, 10)
	for _, g := range s.lookup {
		for _, r := range g {
			kinds = append(kinds, NamespacedResource{
				Group:    r.Group,
				Resource: r.Resource,
			})
		}
	}
	return kinds
}

// context is typically background.  Holds an LRU cache for a
func (s *builderCache) get(ctx context.Context, key NamespacedResource) (DocumentBuilder, error) {
	g, ok := s.lookup[key.Group]
	if ok {
		r, ok := g[key.Resource]
		if ok {
			if r.Builder != nil {
				return r.Builder, nil
			}

			// The builder needs context
			builder, ok := s.ns.Get(key)
			if ok {
				return builder, nil
			}
			{
				s.mu.Lock()
				defer s.mu.Unlock()

				b, err := r.Namespaced(ctx, key.Namespace)
				if err == nil {
					_ = s.ns.Add(key, b)
				}
				return b, err
			}
		}
	}
	return s.defaultBuilder, nil
}

func (s *server) Search(ctx context.Context, req *SearchRequest) (*SearchResponse, error) {
	if s.search == nil {
		return nil, fmt.Errorf("search support not configured")
	}

	_, span := s.tracer.Start(ctx, tracingPrexfixSearch+"Search")
	defer span.End()

	if err := s.Init(ctx); err != nil {
		return nil, err
	}

	user, ok := claims.From(ctx)
	if !ok || user == nil {
		// return &SearchResponse{
		// 	Error: &ErrorResult{
		// 		Message: "no user found in context",
		// 		Code:    http.StatusUnauthorized,
		// 	}
		// }
		return nil, fmt.Errorf("missing user")
	}

	//var ac authz.ItemChecker

	key := NamespacedResource{
		Namespace: req.Tenant,
		Resource:  "", // ?????
		Group:     "", // ?????
	}

	idx, err := s.search.getOrCreateIndex(ctx, key)
	if err != nil {
		return nil, err
	}

	fmt.Printf("TODO... search: %v\n", idx)

	return nil, fmt.Errorf("not implemented yet")

	// res, err := idx.Search(ctx, ac, req)
	// if err != nil {
	// 	return nil, err
	// }

	// return &SearchResponse{
	// 	//Items:  res.Values,
	// 	Groups: res.Groups,
	// }, nil
}

// Origin implements ResourceServer.
func (s *server) Origin(ctx context.Context, req *OriginRequest) (*OriginResponse, error) {
	if s.search == nil {
		return nil, fmt.Errorf("search support not configured")
	}

	_, span := s.tracer.Start(ctx, tracingPrexfixSearch+"Origin")
	defer span.End()

	if err := s.Init(ctx); err != nil {
		return nil, err
	}

	user, ok := claims.From(ctx)
	if !ok || user == nil {
		// return &SearchResponse{
		// 	Error: &ErrorResult{
		// 		Message: "no user found in context",
		// 		Code:    http.StatusUnauthorized,
		// 	}
		// }
		return nil, fmt.Errorf("missing user")
	}

	key := NamespacedResource{
		Namespace: req.Key.Namespace,
		Resource:  req.Key.Resource,
		Group:     req.Key.Group,
	}

	idx, err := s.search.getOrCreateIndex(ctx, key)
	if err != nil {
		return nil, err
	}

	return idx.Origin(ctx, req)
}

// History implements ResourceServer.
func (s *server) History(ctx context.Context, req *HistoryRequest) (*HistoryResponse, error) {
	if s.search == nil {
		return nil, fmt.Errorf("search support not configured")
	}

	_, span := s.tracer.Start(ctx, tracingPrexfixSearch+"History")
	defer span.End()

	if err := s.Init(ctx); err != nil {
		return nil, err
	}
	return &HistoryResponse{
		Error: &ErrorResult{
			Message: "history not yet implemented", // and not sure if it should be search responsibility
			Code:    http.StatusNotImplemented,
		},
	}, nil
}
