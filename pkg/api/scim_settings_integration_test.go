package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/org"
	scimmodels "github.com/grafana/grafana/pkg/services/scimsettings/models"
	"github.com/grafana/grafana/pkg/services/scimsettings/scimsettingstest"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web/webtest"
)

const (
	scimAPISettingsPath = "/api/scim/settings"
)

// setupMockedSCIMService creates a mock SCIM settings service with expectations for changing settings
func setupMockedSCIMService(t *testing.T) *scimsettingstest.MockService {
	mockService := scimsettingstest.NewMockService(t)

	// Setup initial state - SCIM disabled
	mockService.On("Get", mock.Anything).Return(&scimmodels.ScimSettings{
		UserSyncEnabled:  false,
		GroupSyncEnabled: false,
	}, nil).Once()

	// The settings will be updated to enable SCIM
	mockService.On("Update", mock.Anything, mock.MatchedBy(func(s *scimmodels.ScimSettings) bool {
		return s.UserSyncEnabled && s.GroupSyncEnabled
	})).Return(nil).Once()

	// Get will be called after update to verify - SCIM enabled
	mockService.On("Get", mock.Anything).Return(&scimmodels.ScimSettings{
		UserSyncEnabled:  true,
		GroupSyncEnabled: true,
	}, nil).Once()

	// The settings will be updated to disable SCIM
	mockService.On("Update", mock.Anything, mock.MatchedBy(func(s *scimmodels.ScimSettings) bool {
		return !s.UserSyncEnabled && !s.GroupSyncEnabled
	})).Return(nil).Once()

	// Get will be called after update to verify - SCIM disabled again
	mockService.On("Get", mock.Anything).Return(&scimmodels.ScimSettings{
		UserSyncEnabled:  false,
		GroupSyncEnabled: false,
	}, nil).Once()

	return mockService
}

// TestSCIMSettingsIntegration tests the SCIM settings API with mock service
func TestSCIMSettingsIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	// Create a mock service with expectations
	mockService := setupMockedSCIMService(t)

	// Set up the test server with SCIM settings API
	features := featuremgmt.WithFeatures(featuremgmt.FlagEnableSCIM)
	cfg := setting.NewCfg()
	routeRegister := routing.NewRouteRegister()

	api := ProvideSCIMSettingsAPI(cfg, routeRegister, features.(*featuremgmt.FeatureManager), mockService)
	api.RegisterAPIEndpoints()

	server := webtest.NewServer(t, routeRegister)

	// Create admin user for authentication
	adminUser := &user.SignedInUser{
		UserID:         1,
		OrgID:          1,
		OrgRole:        org.RoleAdmin,
		IsGrafanaAdmin: true,
	}

	t.Run("SCIM settings API should allow enabling and disabling SCIM", func(t *testing.T) {
		// First get the current settings - should be disabled
		getSettingsReq := server.NewGetRequest(scimAPISettingsPath)
		getSettingsReq = webtest.RequestWithSignedInUser(getSettingsReq, adminUser)

		getSettingsResp, err := server.Send(getSettingsReq)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, getSettingsResp.StatusCode)

		var settingsResp scimSettingsDTO
		require.NoError(t, json.NewDecoder(getSettingsResp.Body).Decode(&settingsResp))
		require.NoError(t, getSettingsResp.Body.Close())

		assert.False(t, settingsResp.UserSyncEnabled, "User sync should initially be disabled")
		assert.False(t, settingsResp.GroupSyncEnabled, "Group sync should initially be disabled")

		// Update settings to enable SCIM
		updateSettings := scimSettingsDTO{
			UserSyncEnabled:  true,
			GroupSyncEnabled: true,
		}
		bodyBytes, err := json.Marshal(updateSettings)
		require.NoError(t, err)

		updateReq := server.NewRequest(http.MethodPut, scimAPISettingsPath, bytes.NewReader(bodyBytes))
		updateReq.Header.Set("Content-Type", "application/json")
		updateReq = webtest.RequestWithSignedInUser(updateReq, adminUser)

		updateResp, err := server.Send(updateReq)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, updateResp.StatusCode, "Updating settings should succeed")
		require.NoError(t, updateResp.Body.Close())

		// Verify settings were updated successfully
		getSettingsReq = server.NewGetRequest(scimAPISettingsPath)
		getSettingsReq = webtest.RequestWithSignedInUser(getSettingsReq, adminUser)

		getSettingsResp, err = server.Send(getSettingsReq)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, getSettingsResp.StatusCode)

		require.NoError(t, json.NewDecoder(getSettingsResp.Body).Decode(&settingsResp))
		require.NoError(t, getSettingsResp.Body.Close())

		assert.True(t, settingsResp.UserSyncEnabled, "User sync should be enabled after update")
		assert.True(t, settingsResp.GroupSyncEnabled, "Group sync should be enabled after update")

		// Update settings again to disable SCIM
		updateSettings = scimSettingsDTO{
			UserSyncEnabled:  false,
			GroupSyncEnabled: false,
		}
		bodyBytes, err = json.Marshal(updateSettings)
		require.NoError(t, err)

		updateReq = server.NewRequest(http.MethodPut, scimAPISettingsPath, bytes.NewReader(bodyBytes))
		updateReq.Header.Set("Content-Type", "application/json")
		updateReq = webtest.RequestWithSignedInUser(updateReq, adminUser)

		updateResp, err = server.Send(updateReq)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, updateResp.StatusCode, "Updating settings should succeed")
		require.NoError(t, updateResp.Body.Close())

		// Verify settings were updated
		getSettingsReq = server.NewGetRequest(scimAPISettingsPath)
		getSettingsReq = webtest.RequestWithSignedInUser(getSettingsReq, adminUser)

		getSettingsResp, err = server.Send(getSettingsReq)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, getSettingsResp.StatusCode)

		require.NoError(t, json.NewDecoder(getSettingsResp.Body).Decode(&settingsResp))
		require.NoError(t, getSettingsResp.Body.Close())

		assert.False(t, settingsResp.UserSyncEnabled, "User sync should be disabled after update")
		assert.False(t, settingsResp.GroupSyncEnabled, "Group sync should be disabled after update")

		// Verify all mock expectations were met
		mockService.AssertExpectations(t)

		t.Log("Note: This test verifies the SCIM settings API works correctly with the mock service.")
		t.Log("To verify that SCIM settings actually affect the SCIM service endpoints,")
		t.Log("we would need additional integration tests in pkg/extensions/apiserver/tests/scim/.")
	})
}
