package minisearch

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInMemoryDocumentStore(t *testing.T) {
	ctx := context.Background()

	t.Run("Save", func(t *testing.T) {

		store := newInMemoryDocumentStore()
		// Create document first
		version, err := store.Save(ctx, "users.grafana.app", "user1", []byte("data for user1"), StoreOptions{})
		require.NoError(t, err)

		// Update with correct version
		newVersion, err := store.Save(ctx, "users.grafana.app", "user1", []byte("data for user1"), StoreOptions{})
		require.NoError(t, err)
		assert.Greater(t, newVersion, version)

		// Update with wrong version
		_, err = store.Save(ctx, "users.grafana.app", "user1", []byte("data for user1"), StoreOptions{
			PrevVersion: version,
		})
		assert.Error(t, err)

	})

	t.Run("Delete", func(t *testing.T) {
		store := newInMemoryDocumentStore()

		// Create document first
		version, err := store.Save(ctx, "users.grafana.app", "user1", []byte("data for user1"), StoreOptions{})
		require.NoError(t, err)

		// Delete with correct version
		newVersion, err := store.SoftDelete(ctx, "users.grafana.app", "user1", StoreOptions{})
		require.NoError(t, err)
		assert.Greater(t, newVersion, version)

		// Delete with wrong version
		_, err = store.SoftDelete(ctx, "users.grafana.app", "user1", StoreOptions{
			PrevVersion: version,
		})
		assert.Error(t, err)
	})

	t.Run("ListGreaterThanVersion", func(t *testing.T) {
		store := newInMemoryDocumentStore()
		// Create multiple documents
		docs := []struct {
			key      string
			uid      string
			document []byte
		}{
			{key: "users.grafana.app", uid: "user1", document: []byte("data for user1")},
			{key: "users.grafana.app", uid: "user2", document: []byte("data for user2")},
			{key: "users.grafana.app", uid: "user3", document: []byte("data for user3")},
		}

		versions := make([]uint64, len(docs))
		for i, doc := range docs {
			version, err := store.Save(ctx, doc.key, doc.uid, doc.document, StoreOptions{})
			require.NoError(t, err)
			versions[i] = version
		}

		// Test listing with version 0
		count := 0
		for _, err := range store.ListGreaterThanVersion(ctx, "users.grafana.app", 0) {
			require.NoError(t, err)
			count++
		}
		assert.Equal(t, 3, count)

		// Test listing with middle version
		count = 0
		for _, err := range store.ListGreaterThanVersion(ctx, "users.grafana.app", versions[0]) {
			require.NoError(t, err)
			count++
		}
		assert.Equal(t, 2, count)

		// Test listing with non-existent key
		count = 0
		for _, err := range store.ListGreaterThanVersion(ctx, "non-existent", 0) {
			require.NoError(t, err)
			count++
		}
		assert.Equal(t, 0, count)
	})

	t.Run("FullSync", func(t *testing.T) {
		store := newInMemoryDocumentStore()
		// Create initial documents
		initialDocs := []struct {
			key      string
			uid      string
			document []byte
		}{
			{key: "users.grafana.app", uid: "user1", document: []byte("data for user1")},
			{key: "users.grafana.app", uid: "user2", document: []byte("data for user2")},
		}

		for _, doc := range initialDocs {
			_, err := store.Save(ctx, doc.key, doc.uid, doc.document, StoreOptions{})
			require.NoError(t, err)
		}

		// Create iterator with new documents
		newDocs := []struct {
			key      string
			uid      string
			document []byte
		}{
			{key: "users.grafana.app", uid: "user2", document: []byte("data for user2")},
			{key: "users.grafana.app", uid: "user3", document: []byte("data for user3")},
		}

		// Perform full sync
		err := store.FullSync(ctx, "users.grafana.app", func(yield func(DocumentData, error) bool) {
			for _, doc := range newDocs {
				if !yield(DocumentData{UID: doc.uid, Value: doc.document}, nil) {
					return
				}
			}
		})
		require.NoError(t, err)

		// Verify results
		count := 0
		deleted := 0
		for doc, err := range store.ListGreaterThanVersion(ctx, "users.grafana.app", 0) {
			require.NoError(t, err)
			count++
			if doc.IsDeleted {
				deleted++
			}
		}
		assert.Equal(t, 3, count)
		assert.Equal(t, 1, deleted) // Should have 1 deleted document (uid1)
	})
}
