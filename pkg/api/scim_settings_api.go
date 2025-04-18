package api

import (
	"context"
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/scimsettings"
	scimmodels "github.com/grafana/grafana/pkg/services/scimsettings/models"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

// SCIMSettingsAPI handles API requests for SCIM settings.
type SCIMSettingsAPI struct {
	cfg                 *setting.Cfg
	routeRegister       routing.RouteRegister
	features            *featuremgmt.FeatureManager
	scimSettingsService scimsettings.Service
}

// ProvideSCIMSettingsAPI is a dependency injection provider for SCIMSettingsAPI.
func ProvideSCIMSettingsAPI(
	cfg *setting.Cfg,
	routeRegister routing.RouteRegister,
	features *featuremgmt.FeatureManager,
	scimSettingsService scimsettings.Service,
) *SCIMSettingsAPI {
	return &SCIMSettingsAPI{
		cfg:                 cfg,
		routeRegister:       routeRegister,
		features:            features,
		scimSettingsService: scimSettingsService,
	}
}

// RegisterAPIEndpoints registers the SCIM settings API endpoints.
func (api *SCIMSettingsAPI) RegisterAPIEndpoints() {
	ctx := context.Background() // Or derive from appropriate context
	// Check if SCIM feature toggle is enabled
	if !api.features.IsEnabled(ctx, featuremgmt.FlagEnableSCIM) {
		return
	}

	// Define API routes
	api.routeRegister.Group("/api/scim/settings", func(router routing.RouteRegister) {
		// Add authentication/authorization middleware as needed, e.g., require admin
		router.Get("", middleware.ReqGrafanaAdmin, routing.Wrap(api.getSCIMSettings))
		router.Put("", middleware.ReqGrafanaAdmin, routing.Wrap(api.updateSCIMSettings))
	})
}

// scimSettingsDTO defines the structure for SCIM settings in API requests/responses.
type scimSettingsDTO struct {
	UserSyncEnabled  bool `json:"userSyncEnabled"`
	GroupSyncEnabled bool `json:"groupSyncEnabled"`
}

// getSCIMSettings handles GET requests to retrieve SCIM settings.
// swagger:route GET /scim/settings scim getSCIMSettings
//
// # Get SCIM Settings
//
// Returns the current SCIM configuration settings. Requires the `enableSCIM` feature toggle to be enabled.
// Settings are retrieved from the Grafana database.
// Requires admin privileges.
//
// Responses:
// 200: getSCIMSettingsResponse
// 401: unauthorisedError
// 403: forbiddenError
// 500: internalServerError
func (api *SCIMSettingsAPI) getSCIMSettings(c *contextmodel.ReqContext) response.Response {
	settingsModel, err := api.scimSettingsService.Get(c.Req.Context())
	if err != nil {
		// The service/store implementation currently returns defaults on error,
		// but we should still handle a potential error return here.
		return response.Error(http.StatusInternalServerError, "Failed to retrieve SCIM settings", err)
	}

	// Map model to DTO
	dto := scimSettingsDTO{
		UserSyncEnabled:  settingsModel.UserSyncEnabled,
		GroupSyncEnabled: settingsModel.GroupSyncEnabled,
	}

	return response.JSON(http.StatusOK, dto)
}

// updateSCIMSettings handles PUT requests to update SCIM settings.
// swagger:route PUT /scim/settings scim updateSCIMSettings
//
// # Update SCIM Settings
//
// Updates the SCIM configuration settings stored in the Grafana database.
// Requires the `enableSCIM` feature toggle to be enabled.
// Requires admin privileges. These settings can be dynamically reloaded.
//
// Responses:
// 200: okResponse
// 400: badRequestError
// 401: unauthorisedError
// 403: forbiddenError
// 500: internalServerError
func (api *SCIMSettingsAPI) updateSCIMSettings(c *contextmodel.ReqContext) response.Response {
	var cmd scimSettingsDTO
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "Invalid request payload", err)
	}

	// Map DTO to model
	settingsModel := &scimmodels.ScimSettings{
		UserSyncEnabled:  cmd.UserSyncEnabled,
		GroupSyncEnabled: cmd.GroupSyncEnabled,
		// ID, CreatedAt, UpdatedAt will be handled by the store/service
	}

	// Call the service to update settings in the database
	err := api.scimSettingsService.Update(c.Req.Context(), settingsModel)
	if err != nil {
		return response.Error(http.StatusInternalServerError, "Failed to update SCIM settings", err)
	}

	// TODO: Implement the actual reload mechanism if needed.
	// The serviceImpl has a TODO for this. It might involve publishing an event
	// or directly calling a method on the SCIM provisioner service.

	// Return success
	return response.JSON(http.StatusOK, map[string]string{
		"message": "SCIM settings updated successfully.",
	})
}

// swagger:response getSCIMSettingsResponse
type GetSCIMSettingsResponse struct {
	// in:body
	Body scimSettingsDTO `json:"body"`
}

// swagger:parameters updateSCIMSettings
type UpdateSCIMSettingsParams struct {
	// in:body
	// required:true
	Body scimSettingsDTO `json:"body"`
}
