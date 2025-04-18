package scimsettingsimpl

import (
	"context"
	"errors"
	"fmt"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/scimsettings"
	"github.com/grafana/grafana/pkg/services/scimsettings/models"
)

type ServiceImpl struct {
	store scimsettings.Store
	log   log.Logger
}

// ProvideService creates a new instance of the SCIM settings service.
func ProvideService(store scimsettings.Store) scimsettings.Service {
	return &ServiceImpl{
		store: store,
		log:   log.New("scimsettings.service"),
	}
}

var _ scimsettings.Service = (*ServiceImpl)(nil)

// Get retrieves the current SCIM settings from the store.
// It propagates errors, including scimsettings.ErrSettingsNotFound.
func (s *ServiceImpl) Get(ctx context.Context) (*models.ScimSettings, error) {
	settings, err := s.store.Get(ctx)
	if err != nil {
		if !errors.Is(err, scimsettings.ErrSettingsNotFound) {
			// Log unexpected errors
			s.log.Error("Failed to get SCIM settings from store", "error", err)
		}
		// Propagate the error (could be ErrSettingsNotFound or other DB error)
		return nil, err
	}
	return settings, nil
}

// Update persists the given SCIM settings to the store.
func (s *ServiceImpl) Update(ctx context.Context, settings *models.ScimSettings) error {
	if settings == nil {
		return fmt.Errorf("settings cannot be nil")
	}
	// Add validation logic here if needed before saving.
	s.log.Info("Updating SCIM settings", "userSyncEnabled", settings.UserSyncEnabled, "groupSyncEnabled", settings.GroupSyncEnabled)
	err := s.store.Update(ctx, settings)
	if err != nil {
		s.log.Error("Failed to update SCIM settings in store", "error", err)
		return fmt.Errorf("failed to update scim settings: %w", err)
	}

	return nil
}
