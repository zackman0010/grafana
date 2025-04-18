package models

// ScimSettingsDTO holds the configuration settings for SCIM provisioning.
// These settings are typically read from the [auth.scim] section of the Grafana configuration.
type ScimSettingsDTO struct {
	// Enable SCIM user provisioning.
	UserSyncEnabled *bool `json:"userSyncEnabled"`

	// Enable SCIM group provisioning.
	GroupSyncEnabled *bool `json:"groupSyncEnabled"`

	// Allow non SCIM provisioned users to sign in to Grafana.
	AllowNonProvisionedUsers *bool `json:"allowNonProvisionedUsers"`
}
