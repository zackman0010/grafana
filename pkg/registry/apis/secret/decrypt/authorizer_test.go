package decrypt

import (
	"context"
	"testing"

	"github.com/grafana/authlib/authn"
	"github.com/grafana/authlib/types"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/apimachinery/identity"
)

func TestDecryptAuthorizer(t *testing.T) {
	t.Run("when no auth info is present, it returns false", func(t *testing.T) {
		ctx := context.Background()
		authorizer := ProvideDecryptAuthorizer(nil)

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.Empty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when token permissions are empty, it returns false", func(t *testing.T) {
		ctx := createAuthContext(context.Background(), "identity", []string{})
		authorizer := ProvideDecryptAuthorizer(nil)

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when permission format is malformed (missing verb), it returns false", func(t *testing.T) {
		// nameless
		ctx := createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues"})
		authorizer := ProvideDecryptAuthorizer(nil)

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)

		// named
		ctx = createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues/name"})
		authorizer = ProvideDecryptAuthorizer(nil)

		identity, allowed = authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when permission verb is not exactly `decrypt`, it returns false", func(t *testing.T) {
		// nameless
		ctx := createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues:*"})
		authorizer := ProvideDecryptAuthorizer(nil)

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)

		// named
		ctx = createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues/name:something"})
		authorizer = ProvideDecryptAuthorizer(nil)

		identity, allowed = authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when permission does not have 2 or 3 parts, it returns false", func(t *testing.T) {
		ctx := createAuthContext(context.Background(), "identity", []string{"secret.grafana.app:decrypt"})
		authorizer := ProvideDecryptAuthorizer(nil)

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when permission has group that is not `secret.grafana.app`, it returns false", func(t *testing.T) {
		ctx := createAuthContext(context.Background(), "identity", []string{"wrong.group/securevalues/invalid:decrypt"})
		authorizer := ProvideDecryptAuthorizer(nil)

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when permission has resource that is not `securevalues`, it returns false", func(t *testing.T) {
		// nameless
		ctx := createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/invalid-resource:decrypt"})
		authorizer := ProvideDecryptAuthorizer(nil)

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)

		// named
		ctx = createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/invalid-resource/name:decrypt"})
		authorizer = ProvideDecryptAuthorizer(nil)

		identity, allowed = authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when the identity is not in the allow list, it returns false", func(t *testing.T) {
		ctx := createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues:decrypt"})
		authorizer := ProvideDecryptAuthorizer(map[string]struct{}{"allowed1": {}})

		identity, allowed := authorizer.Authorize(ctx, "", nil)
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when the identity doesn't match any allowed decrypters, it returns false", func(t *testing.T) {
		// nameless
		ctx := createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues:decrypt"})
		authorizer := ProvideDecryptAuthorizer(map[string]struct{}{"identity": {}})

		identity, allowed := authorizer.Authorize(ctx, "", []string{"group2"})
		require.NotEmpty(t, identity)
		require.False(t, allowed)

		// named
		ctx = createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues/name:decrypt"})
		authorizer = ProvideDecryptAuthorizer(map[string]struct{}{"identity": {}})

		identity, allowed = authorizer.Authorize(ctx, "", []string{"group2"})
		require.NotEmpty(t, identity)
		require.False(t, allowed)
	})

	t.Run("when the identity matches an allowed decrypter, it returns true", func(t *testing.T) {
		// nameless
		ctx := createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues:decrypt"})
		authorizer := ProvideDecryptAuthorizer(map[string]struct{}{"identity": {}})

		identity, allowed := authorizer.Authorize(ctx, "", []string{"identity"})
		require.True(t, allowed)
		require.Equal(t, "identity", identity)

		// named
		ctx = createAuthContext(context.Background(), "identity", []string{"secret.grafana.app/securevalues/name:decrypt"})
		authorizer = ProvideDecryptAuthorizer(map[string]struct{}{"identity": {}})

		identity, allowed = authorizer.Authorize(ctx, "name", []string{"identity"})
		require.True(t, allowed)
		require.Equal(t, "identity", identity)
	})

	t.Run("when there are multiple permissions, some invalid, only valid ones are considered", func(t *testing.T) {
		ctx := createAuthContext(context.Background(), "identity", []string{
			"secret.grafana.app/securevalues/name1:decrypt",
			"secret.grafana.app/securevalues/name2:decrypt",
			"secret.grafana.app/securevalues/invalid:read",
			"wrong.group/securevalues/group2:decrypt",
		})
		authorizer := ProvideDecryptAuthorizer(map[string]struct{}{"identity": {}})

		identity, allowed := authorizer.Authorize(ctx, "name1", []string{"identity"})
		require.True(t, allowed)
		require.Equal(t, "identity", identity)

		identity, allowed = authorizer.Authorize(ctx, "name2", []string{"identity"})
		require.True(t, allowed)
		require.Equal(t, "identity", identity)
	})

	// revisit for full test coverage
	// add edge cases
	// add other interesting cases for permissions
	// test empty service identity but present
}

func createAuthContext(ctx context.Context, serviceIdentity string, permissions []string) context.Context {
	requester := &identity.StaticRequester{
		AccessTokenClaims: &authn.Claims[authn.AccessTokenClaims]{
			Rest: authn.AccessTokenClaims{
				Permissions:     permissions,
				ServiceIdentity: serviceIdentity,
			},
		},
	}

	return types.WithAuthInfo(ctx, requester)
}

// Adapted from https://github.com/grafana/authlib/blob/main/authz/client_test.go#L18
func TestHasPermissionInToken(t *testing.T) {
	t.Parallel()

	tests := []struct {
		test             string
		tokenPermissions []string
		group            string
		resource         string
		name             string
		verb             string
		want             bool
	}{
		{
			test:             "Permission matches group/resource",
			tokenPermissions: []string{"secret.grafana.app/securevalues:decrypt"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             true,
		},
		{
			test:             "Permission does not match verb",
			tokenPermissions: []string{"secret.grafana.app/securevalues:create"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Permission does not have support for wildcard verb",
			tokenPermissions: []string{"secret.grafana.app/securevalues:*"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Invalid permission missing verb",
			tokenPermissions: []string{"secret.grafana.app/securevalues"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Permission on the wrong group",
			tokenPermissions: []string{"other-group.grafana.app/securevalues:decrypt"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Permission on the wrong resource",
			tokenPermissions: []string{"secret.grafana.app/other-resource:decrypt"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Permission without group are skipped",
			tokenPermissions: []string{":decrypt"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Group level permission is not supported",
			tokenPermissions: []string{"secret.grafana.app:decrypt"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Permission with name matches group/resource/name",
			tokenPermissions: []string{"secret.grafana.app/securevalues/name:decrypt"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			name:             "name",
			verb:             "decrypt",
			want:             true,
		},
		{
			test:             "Parts need an exact match",
			tokenPermissions: []string{"secret.grafana.app/secure:*"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
		{
			test:             "Resource specific permission should not allow access to all resources",
			tokenPermissions: []string{"secret.grafana.app/securevalues/name:decrypt"},
			group:            "secret.grafana.app",
			resource:         "securevalues",
			verb:             "decrypt",
			want:             false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.test, func(t *testing.T) {
			t.Parallel()

			got := hasPermissionInToken(tt.tokenPermissions, tt.group, tt.resource, tt.name, tt.verb)
			require.Equal(t, tt.want, got)
		})
	}
}
