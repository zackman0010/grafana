package ring

import (
	context "context"
	"errors"
	"fmt"
	"time"

	"github.com/gogo/status"
	"github.com/grafana/dskit/ring"
	gocache "github.com/patrickmn/go-cache"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
)

var ErrCacheItemNotFound = errors.New("cache item not found")

type Backend interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, expire time.Duration) error
	Delete(ctx context.Context, key string) error
}

func newLocalBackend() *localBackend {
	return &localBackend{
		store: gocache.New(5*time.Minute, 10*time.Minute),
	}
}

type localBackend struct {
	store *gocache.Cache
}

func (b *localBackend) Get(ctx context.Context, key string) ([]byte, error) {
	data, ok := b.store.Get(key)
	if !ok {
		return nil, ErrCacheItemNotFound
	}

	return data.([]byte), nil
}

func (b *localBackend) Set(ctx context.Context, key string, value []byte, expire time.Duration) error {
	b.store.Set(key, value, expire)
	return nil
}

func (b *localBackend) Delete(ctx context.Context, key string) error {
	b.store.Delete(key)
	return nil
}

func newRemoteBackend(inst *ring.InstanceDesc) (*dispatchBackend, error) {
	cc, err := grpc.NewClient(inst.GetId(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &dispatchBackend{
		NewCacheDispatcherClient(cc),
	}, nil
}

type dispatchBackend struct {
	client CacheDispatcherClient
}

func (b *dispatchBackend) Get(ctx context.Context, key string) ([]byte, error) {
	res, err := b.client.DispatchGet(ctx, &GetRequest{Key: key})
	if err != nil {
		st, ok := status.FromError(err)
		if ok && st.Code() == codes.NotFound {
			return nil, ErrCacheItemNotFound
		}

		return nil, fmt.Errorf("failed to dipatch get request: %w", err)
	}
	return res.Value, nil
}

func (b *dispatchBackend) Set(ctx context.Context, key string, value []byte, expr time.Duration) error {
	_, err := b.client.DispatchSet(ctx, &SetRequest{Key: key, Value: value, Expr: int64(expr)})
	if err != nil {
		return fmt.Errorf("failed to dipatch set request: %w", err)
	}
	return nil
}

func (b *dispatchBackend) Delete(ctx context.Context, key string) error {
	_, err := b.client.DispatchDelete(ctx, &DeleteRequest{Key: key})
	if err != nil {
		return fmt.Errorf("failed to dipatch delete request: %w", err)
	}
	return nil
}
