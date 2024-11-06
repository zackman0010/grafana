package search

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/grpc"

	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/storage/unified/resource"
)

type IndexServer struct {
	s resource.ResourceServer

	index  *Index
	ws     *indexWatchServer
	log    *slog.Logger
	cfg    *setting.Cfg
	tracer tracing.Tracer
}

var _ resource.ResourceIndexServer = (*IndexServer)(nil)

const tracingPrefixIndexServer = "unified_storage.index_server."

func (is *IndexServer) Search(ctx context.Context, req *resource.SearchRequest) (*resource.SearchResponse, error) {
	ctx, span := is.tracer.Start(ctx, tracingPrefixIndexServer+"Search")
	defer span.End()

	results, err := is.index.Search(ctx, req)
	if err != nil {
		return nil, err
	}
	res := &resource.SearchResponse{}
	for _, r := range results.Values {
		resJsonBytes, err := json.Marshal(r)
		if err != nil {
			return nil, err
		}
		res.Items = append(res.Items, &resource.ResourceWrapper{Value: resJsonBytes})
		res.Groups = results.Groups
	}
	return res, nil
}

func (is *IndexServer) History(ctx context.Context, req *resource.HistoryRequest) (*resource.HistoryResponse, error) {
	return nil, nil
}

func (is *IndexServer) Origin(ctx context.Context, req *resource.OriginRequest) (*resource.OriginResponse, error) {
	return nil, nil
}

// Load the index
func (is *IndexServer) Load(ctx context.Context) error {
	ctx, span := is.tracer.Start(ctx, tracingPrefixIndexServer+"Load")
	defer span.End()

	opts := Opts{
		Workers:   is.cfg.IndexWorkers,
		BatchSize: is.cfg.IndexMaxBatchSize,
		ListLimit: is.cfg.IndexListLimit,
		IndexDir:  is.cfg.IndexPath,
	}
	is.index = NewIndex(is.s, opts, is.tracer)
	err := is.index.Init(ctx)
	if err != nil {
		return err
	}
	return nil
}

// Watch resources for changes and update the index
func (is *IndexServer) Watch(ctx context.Context) error {
	rtList := fetchResourceTypes()
	for _, rt := range rtList {
		wr := &resource.WatchRequest{
			Options: rt,
		}

		go func() {
			for {
				// blocking call
				err := is.s.Watch(wr, is.ws)
				if err != nil {
					is.log.Error("Error watching resource", "error", err)
				}
				is.log.Debug("Resource watch ended. Restarting watch")
			}
		}()
	}
	return nil
}

// Init sets the resource server on the index server
// so we can call the resource server from the index server
// TODO: a chicken and egg problem - index server needs the resource server but the resource server is created with the index server
func (is *IndexServer) Init(ctx context.Context, rs resource.ResourceServer) error {
	is.s = rs
	is.ws = &indexWatchServer{
		is:      is,
		context: ctx,
	}

	// Load the index
	err := is.Load(ctx)
	if err != nil {
		return err
	}

	return is.Watch(ctx)
}

func NewResourceIndexServer(cfg *setting.Cfg, tracer tracing.Tracer) *IndexServer {
	logger := slog.Default().With("logger", "index-server")

	indexServer := &IndexServer{
		log:    logger,
		cfg:    cfg,
		tracer: tracer,
	}

	err := prometheus.Register(NewIndexMetrics(cfg.IndexPath, indexServer))
	if err != nil {
		logger.Warn("Failed to register index metrics", "error", err)
	}

	return indexServer
}

type ResourceIndexer interface {
	Index(ctx context.Context) (*Index, error)
}

type indexWatchServer struct {
	grpc.ServerStream
	context context.Context
	is      *IndexServer
}

func (f *indexWatchServer) Send(we *resource.WatchEvent) error {
	if we.Type == resource.WatchEvent_ADDED {
		return f.Add(we)
	}

	if we.Type == resource.WatchEvent_DELETED {
		return f.Delete(we)
	}

	if we.Type == resource.WatchEvent_MODIFIED {
		return f.Update(we)
	}

	return nil
}

func (f *indexWatchServer) RecvMsg(m interface{}) error {
	return nil
}

func (f *indexWatchServer) SendMsg(m interface{}) error {
	return errors.New("not implemented")
}

func (f *indexWatchServer) Context() context.Context {
	if f.context == nil {
		f.context = context.Background()
	}
	return f.context
}

func (f *indexWatchServer) Index() *Index {
	return f.is.index
}

func (f *indexWatchServer) Add(we *resource.WatchEvent) error {
	data, err := getData(we.Resource)
	if err != nil {
		return err
	}
	err = f.Index().Index(f.context, data)
	if err != nil {
		return err
	}
	return nil
}

func (f *indexWatchServer) Delete(we *resource.WatchEvent) error {
	rs, err := resourceEVT(we)
	if err != nil {
		return err
	}
	data, err := getData(rs)
	if err != nil {
		return err
	}
	err = f.Index().Delete(f.context, data.Uid, data.Key)
	if err != nil {
		return err
	}
	return nil
}

func (f *indexWatchServer) Update(we *resource.WatchEvent) error {
	rs, err := resourceEVT(we)
	if err != nil {
		return err
	}
	data, err := getData(rs)
	if err != nil {
		return err
	}
	err = f.Index().Delete(f.context, data.Uid, data.Key)
	if err != nil {
		return err
	}
	err = f.Index().Index(f.context, data)
	if err != nil {
		return err
	}
	return nil
}

type Data struct {
	Key   *resource.ResourceKey
	Value *resource.ResourceWrapper
	Uid   string
}

func getData(wr *resource.WatchEvent_Resource) (*Data, error) {
	r, err := NewIndexedResource(wr.Value)
	if err != nil {
		return nil, err
	}

	key := &resource.ResourceKey{
		Group:     r.Group,
		Resource:  r.Kind,
		Namespace: r.Namespace,
		Name:      r.Name,
	}

	value := &resource.ResourceWrapper{
		ResourceVersion: wr.Version,
		Value:           wr.Value,
	}
	return &Data{Key: key, Value: value, Uid: r.Uid}, nil
}

func resourceEVT(we *resource.WatchEvent) (*resource.WatchEvent_Resource, error) {
	rs := we.Resource
	if rs == nil || len(rs.Value) == 0 {
		// for updates/deletes
		rs = we.Previous
	}
	if rs == nil || len(rs.Value) == 0 {
		return nil, errors.New("resource not found")
	}
	return rs, nil
}
