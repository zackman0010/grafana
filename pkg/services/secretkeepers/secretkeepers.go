package secretkeepers

import (
	"context"

	secretv0alpha1 "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
	"github.com/grafana/grafana/pkg/registry/apis/secret"
)

type KeeperService interface {
	Store(ctx context.Context, exposedValueOrRef string) (secret.ExternalID, error)
	Expose(ctx context.Context, id secret.ExternalID) (secretv0alpha1.ExposedSecureValue, error)
	Delete(ctx context.Context, id secret.ExternalID) error
}
