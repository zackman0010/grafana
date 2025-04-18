package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/scimsettings"
	scimmodels "github.com/grafana/grafana/pkg/services/scimsettings/models"
	"github.com/grafana/grafana/pkg/services/scimsettings/scimsettingstest"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web/webtest"
)

const (
	scimAPIPath = "/api/scim/settings"
)

func setupSCIMSettingsAPITest(t *testing.T, scimEnabled bool, mockService *scimsettingstest.MockService) *webtest.Server {
	t.Helper()

	features := featuremgmt.WithFeatures()
	if scimEnabled {
		features = featuremgmt.WithFeatures(featuremgmt.FlagEnableSCIM)
	}

	cfg := setting.NewCfg()
	routeRegister := routing.NewRouteRegister()

	api := ProvideSCIMSettingsAPI(cfg, routeRegister, features.(*featuremgmt.FeatureManager), mockService)
	api.RegisterAPIEndpoints()

	return webtest.NewServer(t, routeRegister)
}

func TestSCIMSettingsAPI_RegisterAPIEndpoints(t *testing.T) {
	t.Run("should not register routes if enableSCIM feature toggle is disabled", func(t *testing.T) {
		mockService := scimsettingstest.NewMockService(t)
		server := setupSCIMSettingsAPITest(t, false, mockService)

		req := server.NewGetRequest(scimAPIPath)
		resp, err := server.Send(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
		require.NoError(t, resp.Body.Close())
	})

	t.Run("should register routes if enableSCIM feature toggle is enabled", func(t *testing.T) {
		mockService := scimsettingstest.NewMockService(t)
		server := setupSCIMSettingsAPITest(t, true, mockService)

		// When a route is registered but unauthorized, we get 401 instead of 404
		req := server.NewGetRequest(scimAPIPath)
		resp, err := server.Send(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		require.NoError(t, resp.Body.Close())
	})
}

func TestSCIMSettingsAPI_GetSettings(t *testing.T) {
	now := time.Now()
	expectedSettings := &scimmodels.ScimSettings{
		ID:               1,
		UserSyncEnabled:  true,
		GroupSyncEnabled: false,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	expectedDTO := scimSettingsDTO{
		UserSyncEnabled:  true,
		GroupSyncEnabled: false,
	}

	t.Run("As Grafana Admin", func(t *testing.T) {
		t.Run("should return settings when service returns them", func(t *testing.T) {
			mockService := scimsettingstest.NewMockService(t)
			mockService.On("Get", mock.Anything).Return(expectedSettings, nil).Once()

			server := setupSCIMSettingsAPITest(t, true, mockService)
			req := server.NewGetRequest(scimAPIPath)

			// Create admin user
			req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
				UserID:         1,
				OrgID:          1,
				OrgRole:        org.RoleAdmin,
				IsGrafanaAdmin: true,
			})

			resp, err := server.Send(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, resp.StatusCode)

			var result scimSettingsDTO
			require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
			require.NoError(t, resp.Body.Close())

			assert.Equal(t, expectedDTO, result)
			mockService.AssertExpectations(t)
		})

		t.Run("should return 500 if service returns an error", func(t *testing.T) {
			mockService := scimsettingstest.NewMockService(t)
			testErr := errors.New("database broke")
			mockService.On("Get", mock.Anything).Return(nil, testErr).Once()

			server := setupSCIMSettingsAPITest(t, true, mockService)
			req := server.NewGetRequest(scimAPIPath)

			// Create admin user
			req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
				UserID:         1,
				OrgID:          1,
				OrgRole:        org.RoleAdmin,
				IsGrafanaAdmin: true,
			})

			resp, err := server.Send(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			require.NoError(t, resp.Body.Close())

			mockService.AssertExpectations(t)
		})

		t.Run("should return 500 if service returns ErrSettingsNotFound", func(t *testing.T) {
			mockService := scimsettingstest.NewMockService(t)
			mockService.On("Get", mock.Anything).Return(nil, scimsettings.ErrSettingsNotFound).Once()

			server := setupSCIMSettingsAPITest(t, true, mockService)
			req := server.NewGetRequest(scimAPIPath)

			// Create admin user
			req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
				UserID:         1,
				OrgID:          1,
				OrgRole:        org.RoleAdmin,
				IsGrafanaAdmin: true,
			})

			resp, err := server.Send(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			require.NoError(t, resp.Body.Close())

			mockService.AssertExpectations(t)
		})
	})

	t.Run("As non-Admin", func(t *testing.T) {
		mockService := scimsettingstest.NewMockService(t)

		server := setupSCIMSettingsAPITest(t, true, mockService)
		req := server.NewGetRequest(scimAPIPath)

		// Create non-admin user
		req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
			UserID:         1,
			OrgID:          1,
			OrgRole:        org.RoleViewer,
			IsGrafanaAdmin: false,
		})

		resp, err := server.Send(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.NoError(t, resp.Body.Close())
	})
}

func TestSCIMSettingsAPI_UpdateSettings(t *testing.T) {
	updateCmd := scimSettingsDTO{
		UserSyncEnabled:  true,
		GroupSyncEnabled: true,
	}
	expectedModel := &scimmodels.ScimSettings{
		UserSyncEnabled:  updateCmd.UserSyncEnabled,
		GroupSyncEnabled: updateCmd.GroupSyncEnabled,
	}

	t.Run("As Grafana Admin", func(t *testing.T) {
		t.Run("should update settings when service succeeds", func(t *testing.T) {
			mockService := scimsettingstest.NewMockService(t)
			mockService.On("Update", mock.Anything, mock.MatchedBy(func(s *scimmodels.ScimSettings) bool {
				return s.UserSyncEnabled == expectedModel.UserSyncEnabled &&
					s.GroupSyncEnabled == expectedModel.GroupSyncEnabled
			})).Return(nil).Once()

			server := setupSCIMSettingsAPITest(t, true, mockService)

			bodyBytes, err := json.Marshal(updateCmd)
			require.NoError(t, err)

			req := server.NewRequest(http.MethodPut, scimAPIPath, bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			// Create admin user
			req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
				UserID:         1,
				OrgID:          1,
				OrgRole:        org.RoleAdmin,
				IsGrafanaAdmin: true,
			})

			resp, err := server.Send(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, resp.StatusCode)

			var result map[string]string
			require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
			require.NoError(t, resp.Body.Close())

			assert.Equal(t, "SCIM settings updated successfully.", result["message"])
			mockService.AssertExpectations(t)
		})

		t.Run("should return 400 if request body is invalid", func(t *testing.T) {
			mockService := scimsettingstest.NewMockService(t)
			// No expectations since we shouldn't call the service

			server := setupSCIMSettingsAPITest(t, true, mockService)

			req := server.NewRequest(http.MethodPut, scimAPIPath, bytes.NewReader([]byte("{invalid json")))
			req.Header.Set("Content-Type", "application/json")

			// Create admin user
			req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
				UserID:         1,
				OrgID:          1,
				OrgRole:        org.RoleAdmin,
				IsGrafanaAdmin: true,
			})

			resp, err := server.Send(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusBadRequest, resp.StatusCode)
			require.NoError(t, resp.Body.Close())

			mockService.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
		})

		t.Run("should return 500 if service update fails", func(t *testing.T) {
			mockService := scimsettingstest.NewMockService(t)
			testErr := errors.New("database broke on update")
			mockService.On("Update", mock.Anything, mock.Anything).Return(testErr).Once()

			server := setupSCIMSettingsAPITest(t, true, mockService)

			bodyBytes, err := json.Marshal(updateCmd)
			require.NoError(t, err)

			req := server.NewRequest(http.MethodPut, scimAPIPath, bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			// Create admin user
			req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
				UserID:         1,
				OrgID:          1,
				OrgRole:        org.RoleAdmin,
				IsGrafanaAdmin: true,
			})

			resp, err := server.Send(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			require.NoError(t, resp.Body.Close())

			mockService.AssertExpectations(t)
		})
	})

	t.Run("As non-Admin", func(t *testing.T) {
		mockService := scimsettingstest.NewMockService(t)

		server := setupSCIMSettingsAPITest(t, true, mockService)

		bodyBytes, err := json.Marshal(updateCmd)
		require.NoError(t, err)

		req := server.NewRequest(http.MethodPut, scimAPIPath, bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")

		// Create non-admin user
		req = webtest.RequestWithSignedInUser(req, &user.SignedInUser{
			UserID:         1,
			OrgID:          1,
			OrgRole:        org.RoleViewer,
			IsGrafanaAdmin: false,
		})

		resp, err := server.Send(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.NoError(t, resp.Body.Close())

		mockService.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
	})
}
