package scimsettingsimpl

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/scimsettings"
	"github.com/grafana/grafana/pkg/services/scimsettings/models"
)

// mockStore is a manual mock for the scimsettings.Store interface.
type mockStore struct {
	mock.Mock
}

// Get implements the scimsettings.Store interface.
func (m *mockStore) Get(ctx context.Context) (*models.ScimSettings, error) {
	args := m.Called(ctx)
	ret0 := args.Get(0)
	if ret0 == nil {
		return nil, args.Error(1)
	}
	return ret0.(*models.ScimSettings), args.Error(1)
}

// Update implements the scimsettings.Store interface.
func (m *mockStore) Update(ctx context.Context, settings *models.ScimSettings) error {
	args := m.Called(ctx, settings)
	return args.Error(0)
}

// setupTestEnv creates a test environment with mock dependencies.
func setupTestEnv(t *testing.T) (*ServiceImpl, *mockStore) {
	t.Helper()

	store := &mockStore{}
	store.Test(t)
	service := ProvideService(store).(*ServiceImpl)
	service.log = log.NewNopLogger()

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
