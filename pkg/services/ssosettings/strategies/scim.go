package strategies

import (
	"context"

	"github.com/grafana/grafana/pkg/services/social"
	"github.com/grafana/grafana/pkg/services/ssosettings"
	"github.com/grafana/grafana/pkg/setting"
)

const (
	scimSectionName = "auth.scim"
)

// scimSettingsKeys lists all keys that can be configured under [auth.scim]
var scimSettingsKeys = []string{
	"user_sync_enabled",
	"group_sync_enabled",
	"allow_non_provisioned_users",
}

type scimStrategy struct {
	settingsProvider setting.Provider
}

var _ ssosettings.FallbackStrategy = (*scimStrategy)(nil)

// NewScimStrategy creates a fallback strategy for SCIM settings.
func NewScimStrategy(settingsProvider setting.Provider) *scimStrategy {
	return &scimStrategy{
		settingsProvider: settingsProvider,
	}
}

func (s *scimStrategy) IsMatch(provider string) bool {
	return provider == social.SCIMProviderName
}

func (s *scimStrategy) GetProviderConfig(ctx context.Context, provider string) (map[string]any, error) {
	scimSection := s.settingsProvider.Section(scimSectionName)
	if scimSection == nil {
		// Return empty map if the section doesn't exist
		return make(map[string]any), nil
	}

	// Explicitly add the known keys with their correct types
	settingsMap := map[string]any{
		"user_sync_enabled":           scimSection.KeyValue("user_sync_enabled").MustBool(false),
		"group_sync_enabled":          scimSection.KeyValue("group_sync_enabled").MustBool(false),
		"allow_non_provisioned_users": scimSection.KeyValue("allow_non_provisioned_users").MustBool(false),
	}

	return settingsMap, nil
}
