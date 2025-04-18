package scimsettingsimpl

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/scimsettings"
	"github.com/grafana/grafana/pkg/services/scimsettings/models"
)

// setupTestEnv creates a test environment with mock dependencies.
func setupTestEnv(t *testing.T) (*ServiceImpl, *scimsettings.MockStore) {
	t.Helper()

	store := scimsettings.NewMockStore(t)
	// reloadable := scimsettings.NewMockReloadable(t) // Removed
	service := ProvideService(store).(*ServiceImpl) // Cast to ServiceImpl to access fields if needed
	service.log = log.NewNopLogger()                // Use NopLogger instead of Fake

	return service, store
}

func TestServiceImpl_Get(t *testing.T) {
	ctx := context.Background()
	now := time.Now()
	expectedSettings := &models.ScimSettings{
		ID:               1,
		UserSyncEnabled:  true,
		GroupSyncEnabled: false,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	t.Run("should return settings when found in store", func(t *testing.T) {
		service, store := setupTestEnv(t)

		store.On("Get", ctx).Return(expectedSettings, nil).Once()

		settings, err := service.Get(ctx)

		require.NoError(t, err)
		assert.Equal(t, expectedSettings, settings)
		store.AssertExpectations(t)
	})

	t.Run("should return ErrSettingsNotFound when not found in store", func(t *testing.T) {
		service, store := setupTestEnv(t)

		store.On("Get", ctx).Return(nil, scimsettings.ErrSettingsNotFound).Once()

		settings, err := service.Get(ctx)

		require.ErrorIs(t, err, scimsettings.ErrSettingsNotFound)
		assert.Nil(t, settings)
		store.AssertExpectations(t)
	})

	t.Run("should return other errors from store", func(t *testing.T) {
		service, store := setupTestEnv(t)
		dbErr := errors.New("database connection error")

		store.On("Get", ctx).Return(nil, dbErr).Once()

		settings, err := service.Get(ctx)

		require.ErrorIs(t, err, dbErr)
		assert.Nil(t, settings)
		store.AssertExpectations(t)
	})
}

func TestServiceImpl_Update(t *testing.T) {
	ctx := context.Background()
	settingsToUpdate := &models.ScimSettings{
		UserSyncEnabled:  true,
		GroupSyncEnabled: true,
	}

	t.Run("should update settings in store", func(t *testing.T) {
		service, store := setupTestEnv(t)

		store.On("Update", ctx, settingsToUpdate).Return(nil).Once()

		err := service.Update(ctx, settingsToUpdate)

		require.NoError(t, err)
		store.AssertExpectations(t)
	})

	t.Run("should return error if store update fails", func(t *testing.T) {
		service, store := setupTestEnv(t)
		dbErr := errors.New("database update error")

		store.On("Update", ctx, settingsToUpdate).Return(dbErr).Once()

		err := service.Update(ctx, settingsToUpdate)

		require.ErrorContains(t, err, "failed to update scim settings")
		require.ErrorIs(t, err, dbErr)
		store.AssertExpectations(t)
	})

	t.Run("should return error if settings are nil", func(t *testing.T) {
		service, _ := setupTestEnv(t)

		err := service.Update(ctx, nil)

		require.ErrorContains(t, err, "settings cannot be nil")
	})
}
