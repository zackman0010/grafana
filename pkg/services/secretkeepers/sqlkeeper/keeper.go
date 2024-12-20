package sqlkeeper

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/secretkeepers"

	secretv0alpha1 "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
	"github.com/grafana/grafana/pkg/registry/apis/secret"
	"github.com/grafana/grafana/pkg/setting"
)

var _ secretkeepers.KeeperService = (*SQLKeeperService)(nil)

func ProvideSQLKeeperService(cfg *setting.Cfg) (*SQLKeeperService, error) {
	// TODO: sql store
	return &SQLKeeperService{
		log: log.New("auth"),
		cfg: cfg,
	}, nil
}

type SQLKeeperService struct {
	log log.Logger
	cfg *setting.Cfg
	// sql store
}

func (s *SQLKeeperService) Store(ctx context.Context, exposedValueOrRef string) (secret.ExternalID, error) {
	// TODO: implement me
	return "todo-sql-stored", nil
}

func (s *SQLKeeperService) Expose(ctx context.Context, id secret.ExternalID) (secretv0alpha1.ExposedSecureValue, error) {
	// TODO: implement me
	return secretv0alpha1.NewExposedSecureValue("todo-exposed"), nil
}
func (s *SQLKeeperService) Delete(ctx context.Context, id secret.ExternalID) error {
	// TODO: implement me
	return nil
}
