package scimsettingstest

import (
	"context"
	"testing"

	"github.com/stretchr/testify/mock"

	"github.com/grafana/grafana/pkg/services/scimsettings/models"
)

// MockService is a mock implementation of scimsettings.Service
type MockService struct {
	mock.Mock
}

// NewMockService creates a new mock instance
func NewMockService(t *testing.T) *MockService {
	m := &MockService{}
	m.Mock.Test(t)
	return m
}

// Get implements Service.Get
func (m *MockService) Get(ctx context.Context) (*models.ScimSettings, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.ScimSettings), args.Error(1)
}

// Update implements Service.Update
func (m *MockService) Update(ctx context.Context, settings *models.ScimSettings) error {
	args := m.Called(ctx, settings)
	return args.Error(0)
}
