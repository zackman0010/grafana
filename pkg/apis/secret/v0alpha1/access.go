package v0alpha1

import (
	"context"
)

type SecretAccess interface {
	// ctx includes your authorization
	// Allows reading multiple values in one request
	ReadSecrets(ctx context.Context, namespace string, names ...string) (map[string]ExposedSecureValue, error)
}
