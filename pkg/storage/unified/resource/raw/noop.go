package raw

import (
	"context"
)

// NoopDataStore is a datastore that does nothing.
type NoopDataStore struct{}

func (_ NoopDataStore) Set(_ context.Context, _, _, _, _ string, _ []byte) error {
	return nil
}
func (_ NoopDataStore) Get(_ context.Context, _, _, _, _ string) ([]byte, error) {
	return nil, nil
}
func (_ NoopDataStore) Delete(_ context.Context, _, _, _, _ string) error {
	return nil
}
