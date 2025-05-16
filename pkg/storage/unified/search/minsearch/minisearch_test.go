package minisearch

import (
	"context"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
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
				Lister: newTestDocumentLister([]testDocument{
					{doc: Document{"name": "test1"}, uid: "test1"},
					{doc: Document{"name": "test2"}, uid: "test2"},
				}),
				Store: newInMemoryDocumentStore(),
			},
			wantErr: false,
		},
		{
			name: "missing key",
			opts: Options{
				Fields: []FieldMapping{},
				Lister: newTestDocumentLister([]testDocument{}),
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
				Lister: newTestDocumentLister([]testDocument{}),
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
		Key:    "key",
		Fields: []FieldMapping{},
		Lister: newTestDocumentLister([]testDocument{
			{doc: Document{"name": "name1"}, uid: "id1"},
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
	err = ms.Save(ctx, "id2", Document{"name": "test"})
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
		Key: "key",
		Fields: []FieldMapping{
			{Name: "name", Type: FieldTypeText, Index: true, Store: true},
			{Name: "description", Type: FieldTypeText, Index: true, Store: true},
		},
		Lister: newTestDocumentLister([]testDocument{
			{doc: Document{"name": "test1", "description": "first test document", "other": "other"}, uid: "id1"},
			{doc: Document{"name": "test2", "description": "second test document", "other": "other"}, uid: "id2"},
			{doc: Document{"name": "other", "description": "unrelated document", "other": "other"}, uid: "id3"},
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
	req.Fields = []string{"*"}
	results, err := ms.Search(ctx, req)
	require.NoError(t, err)
	require.Len(t, results, 2)

	// Verify the results contain the expected documents
	found := make(map[string]bool)
	for _, doc := range results {
		name := doc["name"].(string)
		found[name] = true
	}
	assert.True(t, found["test1"])
	assert.True(t, found["test2"])
	assert.False(t, found["other"])

	// Test searching for "unrelated"
	req = bleve.NewSearchRequest(bleve.NewQueryStringQuery("unrelated"))
	req.Fields = []string{"*"}
	results, err = ms.Search(ctx, req)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "other", results[0]["name"])
	assert.Equal(t, "unrelated document", results[0]["description"])

	// Test searching for non-existent term
	results, err = ms.Search(ctx, bleve.NewSearchRequest(bleve.NewQueryStringQuery("nonexistent")))
	require.NoError(t, err)
	require.Empty(t, results)

	// Test searching by field
	results, err = ms.Search(ctx, bleve.NewSearchRequest(bleve.NewPhraseQuery([]string{"test1"}, "name")))
	require.NoError(t, err)
	require.Len(t, results, 1)

	// Test searching by field
	results, err = ms.Search(ctx, bleve.NewSearchRequest(bleve.NewPhraseQuery([]string{"Test1"}, "name")))
	require.NoError(t, err)
	require.Len(t, results, 0)

}

type testDocument struct {
	doc Document
	uid string
}

var _ DocumentIterator = &testDocumentIterator{}

type testDocumentIterator struct {
	docs    []testDocument
	current int
	err     error
}

func newTestDocumentLister(docs []testDocument) DocumentLister {
	return func(ctx context.Context) (DocumentIterator, error) {
		return &testDocumentIterator{
			docs:    docs,
			current: -1,
		}, nil
	}
}

func (i *testDocumentIterator) Next() bool {
	i.current++
	return i.current < len(i.docs)
}

func (i *testDocumentIterator) Error() error {
	return i.err
}

func (i *testDocumentIterator) Document() Document {
	return i.docs[i.current].doc
}

func (i *testDocumentIterator) UID() string {
	return i.docs[i.current].uid
}
