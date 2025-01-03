package secretkeepers

import (
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/registry/apis/secret"
	"github.com/grafana/grafana/pkg/registry/apis/secret/secretkeepers/sqlkeeper"
)

type Service interface {
	Provide() (secret.Keeper, error)
}

type OSSKeeperService struct {
	// TODO: db
	db db.DB
}

func ProvideService() OSSKeeperService {
	return OSSKeeperService{}
}

func (ks OSSKeeperService) Provide() (secret.Keeper, error) {
	return sqlkeeper.NewSQLKeeper(ks.db)
}
