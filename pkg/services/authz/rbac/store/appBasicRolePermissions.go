package store

import (
	"context"
	"strings"

	"github.com/grafana/authlib/types"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
)

type BasicRoleCoverageAuthzService struct {
	apps map[string]*BasicRoleAppConfig // keyed by "app name"
}

// BasicRoleAppConfig might represent the chunk of data from YAML for that app
type BasicRoleAppConfig struct {
	BasicRoleCoverageEnabled bool
	BasicRolePermissions     map[string][]string // e.g. { "Admin": ["slo.grafana.app/slo:*"], ... }
}

// parseAppName extracts the app name from a resource string
// Example: "slo.grafana.app/slo:read" -> "slo.grafana.app"
func parseAppName(resource string) string {
	if idx := strings.Index(resource, "/"); idx != -1 {
		return resource[:idx]
	}
	return resource
}

func (b *BasicRoleCoverageAuthzService) GetBasicRolePermissions(ctx context.Context, ns types.NamespaceInfo, role string) ([]accesscontrol.Permission, error) {

	// Check if resource belongs to a known app and that Basic Role Coverage is enabled
	// FIXME: hardcoded value, where do we get this from?
	appName := parseAppName(ns.Value)
	appConfig, ok := b.apps[appName]
	if !ok || !appConfig.BasicRoleCoverageEnabled {
		// Not covered by BasicRoleCoverage => we do nothing, pass along the chain
		return nil, nil
	}

	// If coverage is enabled, check if the user's role grants the action.
	allowedActions, roleExists := appConfig.BasicRolePermissions[role]
	if !roleExists {
		return nil, nil
	}
	permissions := []accesscontrol.Permission{}
	for _, action := range allowedActions {
		permissions = append(permissions, accesscontrol.Permission{
			Action: action,
			Scope:  accesscontrol.Scope(appName, "*", "*"),
		})
	}
	return permissions, nil
}

func NewBasicRoleCoverageAuthzService() *BasicRoleCoverageAuthzService {
	apps := map[string]*BasicRoleAppConfig{
		"slo.grafana.app": {
			BasicRoleCoverageEnabled: true,
			BasicRolePermissions: map[string][]string{
				"Admin":  {"slo.grafana.app/slo:*", "slo.grafana.app/slo:read", "slo.grafana.app/slo:write"},
				"Editor": {"slo.grafana.app/slo:read", "slo.grafana.app/slo:write"},
				"Viewer": {"slo.grafana.app/slo:read"},
			},
		},
		"default": {
			BasicRoleCoverageEnabled: true,
			BasicRolePermissions: map[string][]string{
				"Admin": {"folders:read", "folders:test"},
			},
		},
	}
	return &BasicRoleCoverageAuthzService{apps}
}
