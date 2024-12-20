package secretkeepers

import "context"

type KeeperService interface {
	Store(ctx context.Context, exposedValueOrRef string) (string, error) // TODO: right args and returns
	Expose(ctx context.Context, id string) (string, error)               // TODO: right args and returns
	Delete(ctx context.Context, id string) error                         // TODO: right args and returns
}
