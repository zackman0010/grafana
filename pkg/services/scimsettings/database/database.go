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
)

// ProvideStore creates a new database store for SCIM settings.
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

// Get retrieves the SCIM settings from the database.
// Returns scimsettings.ErrSettingsNotFound if no settings row exists.
func (s *storeImpl) Get(ctx context.Context) (*models.ScimSettings, error) {
	settings := &models.ScimSettings{}
	err := s.sqlStore.WithDbSession(ctx, func(sess *db.Session) error {
		has, err := sess.OrderBy("id").Limit(1).Get(settings)
		if err != nil {
			return fmt.Errorf("database error fetching scim settings: %w", err)
		}
		if !has {
			// Explicitly return ErrSettingsNotFound when no record exists
			return scimsettings.ErrSettingsNotFound
		}
		return nil
	})

	if err != nil {
		// Propagate the error (could be ErrSettingsNotFound or another DB error)
		return nil, err
	}

	return settings, nil
}

// Update updates the SCIM settings in the database.
// It performs an Upsert operation based on whether settings already exist.
func (s *storeImpl) Update(ctx context.Context, settings *models.ScimSettings) error {
	return s.sqlStore.WithTransactionalDbSession(ctx, func(sess *db.Session) error {
		// Attempt to retrieve existing settings to determine if it's an insert or update.
		existing := &models.ScimSettings{}
		has, err := sess.OrderBy("id").Limit(1).Get(existing)
		// Handle ErrSettingsNotFound specifically for the check, but don't error out
		if err != nil && !errors.Is(err, scimsettings.ErrSettingsNotFound) {
			return fmt.Errorf("failed to check for existing scim settings: %w", err)
		}
		// If settings were not found, 'has' will be false
		if errors.Is(err, scimsettings.ErrSettingsNotFound) {
			has = false
		}

		settings.UpdatedAt = time.Now()

		if has {
			// Update existing settings
			settings.ID = existing.ID // Ensure we update the correct row
			_, err = sess.ID(settings.ID).Update(settings)
			if err != nil {
				return fmt.Errorf("failed to update scim settings: %w", err)
			}
			s.log.Debug("Updated existing SCIM settings", "id", settings.ID)
		} else {
			// Insert new settings
			settings.CreatedAt = settings.UpdatedAt // Set CreatedAt on first insert
			_, err = sess.Insert(settings)
			if err != nil {
				return fmt.Errorf("failed to insert scim settings: %w", err)
			}
			s.log.Debug("Inserted new SCIM settings", "id", settings.ID)
		}
		return nil
	})
}
