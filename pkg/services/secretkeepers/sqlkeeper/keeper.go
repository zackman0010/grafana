package sqlkeeper

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/log"

	"github.com/grafana/grafana/pkg/setting"
)

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

func (s *SQLKeeperService) Store(ctx context.Context, exposedValueOrRef string) (string, error) {
	// TODO: implement me
	return "todo-sql-store", nil
}

func (s *SQLKeeperService) Expose(ctx context.Context, id string) (string, error) {
	// TODO: implement me
	return "todo-sql-expose", nil
}
func (s *SQLKeeperService) Delete(ctx context.Context, id string) error {
	// TODO: implement me
	return nil
}
