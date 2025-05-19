package minisearch

import (
	"context"
	"iter"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewMinisearch(t *testing.T) {
	tests := []struct {
		name    string
		opts    Options
		wantErr bool
	}{
		{
			name: "valid options",
			opts: Options{
				Key:    "test",
				Fields: []FieldMapping{},
				Lister: testLister([]Document{
					{UID: "test1", Data: map[string]interface{}{"name": "name1"}},
					{UID: "test2", Data: map[string]interface{}{"name": "name2"}},
				}),
				Store: newInMemoryDocumentStore(),
			},
			wantErr: false,
		},
		{
			name: "missing key",
			opts: Options{
				Fields: []FieldMapping{},
				Lister: testLister([]Document{}),
				Store:  newInMemoryDocumentStore(),
			},
			wantErr: true,
		},
		{
			name: "missing lister",
			opts: Options{
				Key:    "test",
				Fields: []FieldMapping{},
				Store:  newInMemoryDocumentStore(),
			},
			wantErr: true,
		},
		{
			name: "missing store",
			opts: Options{
				Key:    "test",
				Fields: []FieldMapping{},
				Lister: testLister([]Document{}),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ms, err := New(tt.opts)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, ms)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, ms)
			}
		})
	}
}

func TestSaveAndDelete(t *testing.T) {
	store := newInMemoryDocumentStore()
	ms, err := New(Options{
		Key:    "ns/group/resource",
		Fields: []FieldMapping{},
		Lister: testLister([]Document{
			{UID: "id1", Data: map[string]interface{}{"name": "name1"}},
		}),
		Store: store,
	})
	require.NoError(t, err)

	ctx := context.Background()
	err = ms.Init(ctx)
	require.NoError(t, err)

	// Should have 1 document
	count, err := ms.DocCount(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 1, count)

	// Test Save
	err = ms.Save(ctx, Document{UID: "id2", Data: map[string]interface{}{"name": "name2"}})
	require.NoError(t, err)

	// Should have 2 documents
	count, err = ms.DocCount(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 2, count)

	// Test Delete
	err = ms.Delete(ctx, "id1")
	require.NoError(t, err)

	// Should have 1 document
	count, err = ms.DocCount(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 1, count)
}

func TestSearchQuery(t *testing.T) {
	store := newInMemoryDocumentStore()
	ms, err := New(Options{
		Key: "key", //
		Fields: []FieldMapping{
			{Name: "name", Type: FieldTypeText, Index: true, Store: true},
			{Name: "description", Type: FieldTypeText, Index: true, Store: true},
		},
		Lister: testLister([]Document{
			{UID: "id1", Data: map[string]interface{}{"name": "test1", "description": "first test document", "other": "other"}},
			{UID: "id2", Data: map[string]interface{}{"name": "test2", "description": "second test document", "other": "other"}},
			{UID: "id3", Data: map[string]interface{}{"name": "other", "description": "unrelated document", "other": "other"}},
		}),
		Store: store,
	})
	require.NoError(t, err)

	ctx := context.Background()
	err = ms.Init(ctx)
	require.NoError(t, err)

	count, err := ms.DocCount(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 3, count)

	// Test searching for "test"
	req := bleve.NewSearchRequest(bleve.NewQueryStringQuery("test"))
	req.Fields = []string{"name", "description"}
	results, err := ms.Search(ctx, req)
	require.NoError(t, err)
	require.Len(t, results, 2)

	// Verify the results contain the expected documents
	found := make(map[string]bool)
	for _, doc := range results {
		name := doc.Data["name"].(string)
		found[name] = true
	}
	assert.True(t, found["test1"])
	assert.True(t, found["test2"])
	assert.False(t, found["other"])

	// // Test searching for "unrelated"
	req = bleve.NewSearchRequest(bleve.NewQueryStringQuery("unrelated"))
	req.Fields = []string{"*"}
	results, err = ms.Search(ctx, req)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "other", results[0].Data["name"])
	assert.Equal(t, "unrelated document", results[0].Data["description"])

	// Test searching for non-existent term
	results, err = ms.Search(ctx, bleve.NewSearchRequest(bleve.NewQueryStringQuery("nonexistent")))
	require.NoError(t, err)
	require.Empty(t, results)

	// Test searching by field
	req = bleve.NewSearchRequest(bleve.NewPhraseQuery([]string{"test1"}, "name"))
	req.Fields = []string{"*"}
	results, err = ms.Search(ctx, req)
	require.NoError(t, err)
	require.Len(t, results, 1)

	// Test searching by field
	req = bleve.NewSearchRequest(bleve.NewPhraseQuery([]string{"Test1"}, "name"))
	req.Fields = []string{"*"}
	results, err = ms.Search(ctx, req)
	require.NoError(t, err)
	require.Len(t, results, 0)

	// Let's try with a match
	req = bleve.NewSearchRequest(bleve.NewMatchQuery("Test1"))
	req.Fields = []string{"name"}
	results, err = ms.Search(ctx, req)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "test1", results[0].Data["name"])

}

func testLister(docs []Document) DocumentLister {
	return func(ctx context.Context) iter.Seq2[Document, error] {
		return func(yield func(Document, error) bool) {
			for _, doc := range docs {
				if !yield(doc, nil) {
					return
				}
			}
		}
	}
}
