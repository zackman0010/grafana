package scimsettings

import (
	"context"
	"errors"

	"github.com/grafana/grafana/pkg/services/scimsettings/models"
)

// ErrSettingsNotFound is returned when no SCIM settings are found in the database.
var ErrSettingsNotFound = errors.New("scim settings not found in database")

// Service defines the interface for managing SCIM settings.
//
//go:generate mockery --name Service --structname MockService --inpackage --filename service_mock.go
type Service interface {
	// Get retrieves the current SCIM settings.
	// Returns ErrSettingsNotFound if no settings are stored in the database.
	Get(ctx context.Context) (*models.ScimSettings, error)
	// Update persists the given SCIM settings.
	Update(ctx context.Context, settings *models.ScimSettings) error
}

// Store defines the interface for database operations on SCIM settings.
//
//go:generate mockery --name Store --structname MockStore --inpackage --filename store_mock.go
type Store interface {
	// Get retrieves the current SCIM settings from the database.
	// Returns ErrSettingsNotFound if no settings are found.
	Get(ctx context.Context) (*models.ScimSettings, error)
	// Update updates the SCIM settings in the database.
	// This could be an upsert operation.
	Update(ctx context.Context, settings *models.ScimSettings) error
}
