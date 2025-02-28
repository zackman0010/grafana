package testinfra_test

import (
	"testing"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/tests/testinfra"
	"github.com/stretchr/testify/require"
)

func TestManualSQLStore(t *testing.T) {
	// This ensures we can use a manually set up test DB in an example that shows off the best practices.
	// Note that this can be entirely parallel, to speed up all tests!
	t.Parallel()

	t.Run("subtest 1", func(t *testing.T) {
		t.Parallel()

		store := db.InitTestDB(t)
		err := store.WithDbSession(t.Context(), func(sess *sqlstore.DBSession) error {
			_, err := sess.Exec("SELECT 1")
			return err
		})
		require.NoError(t, err)
	})

	t.Run("subtest 2", func(t *testing.T) {
		t.Parallel()

		store := db.InitTestDB(t)
		err := store.WithDbSession(t.Context(), func(sess *sqlstore.DBSession) error {
			_, err := sess.Exec("SELECT 2")
			return err
		})
		require.Error(t, err)
	})
}

func TestGrafanaProvidedSQLStore(t *testing.T) {
	// This ensures we can use an automatically set up test DB in an example that shows off the best practices, with the test env type.
	// Note that this can be entirely parallel, to speed up all tests!
	t.Parallel()

	dir, cfgPath := testinfra.CreateGrafDir(t, testinfra.GrafanaOpts{})
	_, env := testinfra.StartGrafanaEnv(t, dir, cfgPath)

	err := env.SQLStore.WithDbSession(t.Context(), func(sess *sqlstore.DBSession) error {
		_, err := sess.Exec("SELECT 1")
		return err
	})
	require.NoError(t, err)
}

func TestGrafanaProvidedDB(t *testing.T) {
	// This ensures we can use an automatically set up test DB in an example that shows off the best practices, with the db.DB type.
	// Note that this can be entirely parallel, to speed up all tests!
	t.Parallel()

	dir, cfgPath := testinfra.CreateGrafDir(t, testinfra.GrafanaOpts{})
	_, db := testinfra.StartGrafana(t, dir, cfgPath)

	err := db.WithDbSession(t.Context(), func(sess *sqlstore.DBSession) error {
		_, err := sess.Exec("SELECT 1")
		return err
	})
	require.NoError(t, err)
}
