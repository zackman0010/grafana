// ... existing code ...
OAuthOIDCProviderName = "oidc"
// SAMLProviderName defines the name for the SAML provider
SAMLProviderName = "saml"
// ScimProviderName defines the name for the SCIM provider
SCIMProviderName = "scim"

// ProviderNotifiers defines the name for the provider notifiers
// ... existing code ...

var AllOAuthProviders = []string{
	GenericOAuthProviderName,
	// ... other providers ...
	AzureADProviderName,
}

// AddProvider adds new provider to AllOAuthProviders slice
// ... existing code ... 