package decrypt

import (
	"context"
	"strings"

	"github.com/grafana/authlib/authn"
	claims "github.com/grafana/authlib/types"

	secretv0alpha1 "github.com/grafana/grafana/pkg/apis/secret/v0alpha1"
	"github.com/grafana/grafana/pkg/registry/apis/secret/contracts"
)

// decryptAuthorizer is the authorizer implementation for decrypt operations.
type decryptAuthorizer struct {
	allowList contracts.DecryptAllowList
}

func ProvideDecryptAuthorizer(allowList contracts.DecryptAllowList) contracts.DecryptAuthorizer {
	return &decryptAuthorizer{
		allowList: allowList,
	}
}

// authorize checks whether the auth info token has the right permissions to decrypt the secure value.
func (a *decryptAuthorizer) Authorize(ctx context.Context, secureValueName string, secureValueDecrypters []string) (string, bool) {
	authInfo, ok := claims.AuthInfoFrom(ctx)
	if !ok {
		return "", false
	}

	tokenPermissions := authInfo.GetTokenPermissions()

	serviceIdentityList, ok := authInfo.GetExtra()[authn.ServiceIdentityKey]
	if !ok {
		return "", false
	}

	// If there's more than one service identity, something is suspicious and we reject it.
	if len(serviceIdentityList) != 1 {
		return "", false
	}

	serviceIdentity := serviceIdentityList[0]

	// TEMPORARY: while we can't onboard every app into secrets, we can block them from decrypting
	// securevalues preemptively here before even reaching out to the database.
	// This check can be removed once we open the gates for any service to use secrets.
	if _, exists := a.allowList[serviceIdentity]; !exists || serviceIdentity == "" {
		return serviceIdentity, false
	}

	// Checks whether the token has the permission to decrypt secure values.
	if !hasPermissionInToken(tokenPermissions, secretv0alpha1.GROUP, secretv0alpha1.SecureValuesResourceInfo.GetName(), secureValueName, "decrypt") {
		return serviceIdentity, false
	}

	// Finally check whether the service identity is allowed to decrypt this secure value.
	allowed := false
	for _, decrypter := range secureValueDecrypters {
		if decrypter == serviceIdentity {
			allowed = true
			break
		}
	}

	return serviceIdentity, allowed
}

// Adapted from https://github.com/grafana/authlib/blob/main/authz/client.go#L138
// Changes: 1) we don't support `*` for verbs; 2) we support specific names in the permission.
func hasPermissionInToken(tokenPermissions []string, group, resource, name, verb string) bool {
	for _, p := range tokenPermissions {
		tokenGR, tokenVerb, found := strings.Cut(p, ":")
		if !found || tokenVerb != verb {
			continue
		}

		parts := strings.SplitN(tokenGR, "/", 3)

		switch len(parts) {
		// secret.grafana.app/securevalues:decrypt
		case 2:
			if parts[0] == group && parts[1] == resource {
				return true
			}

		// secret.grafana.app/securevalues/<name>:decrypt
		case 3:
			if parts[0] == group && parts[1] == resource && parts[2] == name {
				return true
			}
		}
	}
	return false
}
