package contracts

import (
	"context"
	"fmt"

	claims "github.com/grafana/authlib/types"
	secretv0alpha1 "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/registry/apis/secret/contracts"
	"github.com/grafana/grafana/pkg/registry/apis/secret/secretkeeper"
	keepertypes "github.com/grafana/grafana/pkg/registry/apis/secret/secretkeeper/types"
	"github.com/grafana/grafana/pkg/registry/apis/secret/xkube"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/setting"
)

func ProvideDecryptStorage(db db.DB, cfg *setting.Cfg, features featuremgmt.FeatureToggles, keeperService secretkeeper.Service) (contracts.DecryptStorage, error) {
	if !features.IsEnabledGlobally(featuremgmt.FlagGrafanaAPIServerWithExperimentalAPIs) ||
		!features.IsEnabledGlobally(featuremgmt.FlagSecretsManagementAppPlatform) {
		return &secureValueStorage{}, nil
	}

	keepers, err := keeperService.GetKeepers()
	if err != nil {
		return nil, fmt.Errorf("failed to get keepers: %w", err)
	}

	return &secureValueStorage{db: db, keepers: keepers}, nil
}

// decryptStorage is the actual implementation of the decrypt storage.
type decryptStorage struct {
	db      db.DB
	keepers map[keepertypes.KeeperType]keepertypes.Keeper
}

func (s *secureValueStorage) Decrypt(ctx context.Context, nn xkube.NameNamespace) (secretv0alpha1.ExposedSecureValue, error) {
	// TODO: do proper checks here.
	_, ok := claims.AuthInfoFrom(ctx)
	if !ok {
		return "", fmt.Errorf("missing auth info in context")
	}

	row, err := s.readSecureValue(ctx, nn)
	if err != nil {
		return "", fmt.Errorf("read internal: %w", err)
	}

	var exposedSecureVal secretv0alpha1.ExposedSecureValue
	if row.Keeper == "default-sql" {
		exposedSecureVal, err = s.keepers[keepertypes.SQLKeeperType].Expose(ctx, nil, row.Namespace, keepertypes.ExternalID(row.ExternalID))
		if err != nil {
			return "", fmt.Errorf("failed to expose secure value: %w", err)
		}
		return exposedSecureVal, nil
	}

	// TODO: implement expose from other keeper types.

	return "", nil
}

func (s *secureValueStorage) readSecureValue(ctx context.Context, nn xkube.NameNamespace) (*secureValueDB, error) {
	row := &secureValueDB{Name: nn.Name, Namespace: nn.Namespace.String()}

	err := s.db.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		found, err := sess.Get(row)
		if err != nil {
			return fmt.Errorf("could not get row: %w", err)
		}

		if !found {
			return contracts.ErrSecureValueNotFound
		}

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("db failure: %w", err)
	}

	return row, nil
}
