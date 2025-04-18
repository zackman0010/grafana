package database

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/scimsettings"
	"github.com/grafana/grafana/pkg/services/scimsettings/models"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

func ProvideStore(sqlStore db.DB) scimsettings.Store {
	return &storeImpl{
		sqlStore: sqlStore,
		log:      log.New("scimsettings.store"),
	}
}

type storeImpl struct {
	sqlStore db.DB
	log      log.Logger
}

var _ scimsettings.Store = (*storeImpl)(nil)

func (s *storeImpl) Get(ctx context.Context) (*models.ScimSettings, error) {
	settings := &models.ScimSettings{}
	err := s.sqlStore.WithDbSession(ctx, func(sess *db.Session) error {
		has, err := sess.OrderBy("id").Limit(1).Get(settings)
		if err != nil {
			return fmt.Errorf("database error fetching scim settings: %w", err)
		}
		if !has {
			return scimsettings.ErrSettingsNotFound
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return settings, nil
}

func (s *storeImpl) Update(ctx context.Context, settings *models.ScimSettings) error {
	return s.sqlStore.WithTransactionalDbSession(ctx, func(sess *db.Session) error {
		existing := &models.ScimSettings{}
		has, err := sess.OrderBy("id").Limit(1).Get(existing)
		if err != nil && !errors.Is(err, scimsettings.ErrSettingsNotFound) {
			return fmt.Errorf("failed to check for existing scim settings: %w", err)
		}
		if errors.Is(err, scimsettings.ErrSettingsNotFound) {
			has = false
		}

		settings.UpdatedAt = time.Now()

		if has {
			settings.ID = existing.ID
			_, err = sess.ID(settings.ID).Update(settings)
			if err != nil {
				return fmt.Errorf("failed to update scim settings: %w", err)
			}
			s.log.Debug("Updated existing SCIM settings", "id", settings.ID)
		} else {
			// Insert new settings
			settings.CreatedAt = settings.UpdatedAt
			_, err = sess.Insert(settings)
			if err != nil {
				return fmt.Errorf("failed to insert scim settings: %w", err)
			}
			s.log.Debug("Inserted new SCIM settings", "id", settings.ID)
		}
		return nil
	})
}

func AddMigration(mg *migrator.Migrator) {
	scimSettingsV1 := migrator.Table{
		Name: "scim_settings",
		Columns: []*migrator.Column{
			{Name: "id", Type: migrator.DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "user_sync_enabled", Type: migrator.DB_Bool, Nullable: false},
			{Name: "group_sync_enabled", Type: migrator.DB_Bool, Nullable: false},
			{Name: "created_at", Type: migrator.DB_DateTime, Nullable: false},
			{Name: "updated_at", Type: migrator.DB_DateTime, Nullable: false},
		},
	}

	mg.AddMigration("create scim_settings table", migrator.NewAddTableMigration(scimSettingsV1))
}
