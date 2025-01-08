package ring

import (
	context "context"
	"errors"
	"fmt"
	"hash/fnv"
	"net/http"
	sync "sync"
	"time"

	"github.com/gogo/status"
	"github.com/grafana/dskit/kv"
	"github.com/grafana/dskit/kv/memberlist"
	"github.com/grafana/dskit/ring"
	"github.com/grafana/dskit/services"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/grpcserver"
	codes "google.golang.org/grpc/codes"
)

type Cache struct {
	UnimplementedCacheDispatcherServer
	logger   log.Logger
	provider grpcserver.Provider

	mux *http.ServeMux

	kv    kv.Client
	lfc   *ring.BasicLifecycler
	ring  *ring.Ring
	mlist *memberlist.KVInitService

	// backends are used to retrieve values from their respective node
	backendsRW sync.RWMutex
	backends   map[string]Backend
}

func (c *Cache) Run(ctx context.Context) error {
	if err := services.StartAndAwaitRunning(ctx, c.mlist); err != nil {
		return fmt.Errorf("failed to start kv service: %w", err)
	}

	stopCtx := context.Background()
	defer func() {
		_ = services.StopAndAwaitTerminated(stopCtx, c.mlist)
	}()

	if err := services.StartAndAwaitRunning(ctx, c.ring); err != nil {
		return fmt.Errorf("failed to start ring: %w", err)
	}

	defer func() {
		_ = services.StopAndAwaitTerminated(stopCtx, c.ring)
	}()

	if err := services.StartAndAwaitRunning(ctx, c.lfc); err != nil {
		return fmt.Errorf("failed to start lfc: %w", err)
	}
	defer func() {
		_ = services.StopAndAwaitTerminated(stopCtx, c.lfc)
	}()

	<-ctx.Done()
	return ctx.Err()
}

func (c *Cache) Get(ctx context.Context, key string) ([]byte, error) {
	backend, err := c.getBackend(key, ring.Read)
	if err != nil {
		return nil, err
	}

	return backend.Get(ctx, key)
}

func (c *Cache) Set(ctx context.Context, key string, value []byte, expr time.Duration) error {
	backend, err := c.getBackend(key, ring.Write)
	if err != nil {
		return err
	}

	return backend.Set(ctx, key, value, expr)
}

func (c *Cache) Delete(ctx context.Context, key string) error {
	backend, err := c.getBackend(key, ring.Write)
	if err != nil {
		return err
	}

	return backend.Delete(ctx, key)
}

func (c *Cache) DispatchGet(ctx context.Context, r *GetRequest) (*GetResponse, error) {
	value, err := c.Get(ctx, r.GetKey())
	if err != nil {
		if errors.Is(err, ErrCacheItemNotFound) {
			return nil, status.Error(codes.NotFound, err.Error())
		}

		return nil, err
	}
	return &GetResponse{Value: value}, nil
}

func (c *Cache) DispatchSet(ctx context.Context, r *SetRequest) (*SetResponse, error) {
	c.logger.Debug("Dispatched set", "key", r.GetKey())
	if err := c.Set(ctx, r.GetKey(), r.GetValue(), time.Duration(r.GetExpr())); err != nil {
		return nil, err
	}
	return &SetResponse{}, nil
}

func (c *Cache) DispatchDelete(ctx context.Context, r *DeleteRequest) (*DeleteResponse, error) {
	c.logger.Debug("Dispatched delete", "key", r.GetKey())
	if err := c.Delete(ctx, r.GetKey()); err != nil {
		return nil, err
	}
	return &DeleteResponse{}, nil
}

// AuthFuncOverride is used to disable auth for now
func (c *Cache) AuthFuncOverride(ctx context.Context, fullMethodName string) (context.Context, error) {
	return ctx, nil
}

func (c *Cache) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	c.mux.ServeHTTP(w, r)
}

func (c *Cache) getBackend(key string, op ring.Operation) (Backend, error) {
	hasher := fnv.New32()
	_, _ = hasher.Write([]byte(key))
	set, err := c.ring.Get(hasher.Sum32(), op, nil, nil, nil)
	if err != nil {
		return nil, err
	}

	// assume always one instance in a set
	if len(set.Instances) != 1 {
		return nil, ring.ErrInstanceNotFound
	}

	inst := set.Instances[0]
	// c.metrics.cacheUsage.WithLabelValues(inst.GetId()).Inc()

	c.backendsRW.RLock()
	cached, ok := c.backends[inst.GetId()]
	c.backendsRW.RUnlock()
	if ok {
		return cached, nil
	}

	c.backendsRW.Lock()
	defer c.backendsRW.Unlock()

	backend, err := newRemoteBackend(&inst)
	if err != nil {
		return nil, err
	}

	c.backends[inst.GetAddr()] = backend
	return backend, nil
}
