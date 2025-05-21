package raw

import (
	"context"
	"fmt"

	"github.com/grafana/grafana/pkg/storage/unified/resource"
)

// ObjectDataStore does use object storage for the data storage.
type ObjectDataStore struct {
	bucket resource.CDKBucket
}

func NewObjectDataStore(bucket resource.CDKBucket) *ObjectDataStore {
	return &ObjectDataStore{
		bucket: bucket,
	}
}

func (store *ObjectDataStore) Set(ctx context.Context, guid, tenant, group, resource string, data []byte) error {
	path := store.path(guid, tenant, "", "")
	if err := store.bucket.WriteAll(ctx, path, data, nil); err != nil {
		return fmt.Errorf("failed to write '%s' into the bucket: %w", path, err)
	}
	return nil
}

func (store *ObjectDataStore) Get(ctx context.Context, guid, tenant, group, resource string) ([]byte, error) {
	path := store.path(guid, tenant, "", "")
	data, err := store.bucket.ReadAll(ctx, path)
	if err != nil {
		return nil, fmt.Errorf("failed to read '%s' from the bucket: %w", path, err)
	}
	return data, nil
}

func (store *ObjectDataStore) Delete(ctx context.Context, guid, tenant, group, resource string) error {
	path := store.path(guid, tenant, "", "")
	if err := store.bucket.Delete(ctx, path); err != nil {
		return fmt.Errorf("failed to delete '%s' from the bucket: %w", path, err)
	}
	return nil
}

func (store *ObjectDataStore) path(guid, tenant, group, resource string) string {
	return fmt.Sprintf("%s/%s/%s/%s", tenant, group, resource, guid)
}
