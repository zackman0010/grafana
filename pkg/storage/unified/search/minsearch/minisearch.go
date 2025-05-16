package minisearch

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
)

const (
	defaultResyncInterval = 24 * time.Hour
)

var (
	updatedAtField = "__updated_at"
)

// minisearch is a tiny search engine that is used to efficiently index and search documents
// It is designed to provide search-after-write consisency.
type minisearch struct {
	key          string
	docstore     DocumentStore
	index        bleve.Index
	lister       DocumentLister
	store        DocumentStore
	resyncPeriod time.Duration
	fieldMapping []FieldMapping

	// The last version in the index
	mu          sync.RWMutex
	lastVersion uint64
}
type Options struct {
	// Required options
	Key    string         // A unique identifier for the index, usually namespace/group/resource
	Fields []FieldMapping // A list of fields to be indexed
	Lister DocumentLister // A function to list the ids of the documents in the index

	// Optional options
	FullResyncInterval time.Duration // The interval to resync the index
	Store              DocumentStore // The storage to use to store
}

func New(opts Options) (*minisearch, error) {
	if opts.Key == "" {
		return nil, errors.New("Key is required")
	}
	if len(opts.Fields) == 0 {
		opts.Fields = []FieldMapping{}
	}
	if opts.Lister == nil {
		return nil, errors.New("Lister is required")
	}
	if opts.Store == nil {
		return nil, errors.New("Store is required") // TODO: implement the default store on top of sql
	}
	if opts.FullResyncInterval == 0 {
		opts.FullResyncInterval = defaultResyncInterval
	}
	for _, field := range opts.Fields {
		if field.Name == updatedAtField {
			return nil, errors.New(updatedAtField + " is a reserved field name")
		}
	}

	return &minisearch{
		key:          opts.Key,
		docstore:     opts.Store,
		lister:       opts.Lister,
		store:        opts.Store,
		resyncPeriod: opts.FullResyncInterval,
		fieldMapping: opts.Fields,
	}, nil
}

func (m *minisearch) Init(ctx context.Context) error {
	mapper, err := m.indexMapping()
	if err != nil {
		return err
	}
	m.index, err = bleve.NewMemOnly(mapper)
	if err != nil {
		return err
	}
	err = m.buildIndex(ctx)
	if err != nil {
		return err
	}

	// If the index is empty, the we force a full resync and wait
	count, err := m.index.DocCount()
	if err != nil {
		return err
	}
	if count == 0 {
		err = m.fullResync(ctx)
		if err != nil {
			return err
		}
		err = m.buildIndex(ctx)
		if err != nil {
			return err
		}
	}

	return nil
}

// buildIndex builds the index from scratch by listing all the documents in the store
func (m *minisearch) buildIndex(ctx context.Context) error {
	if m.index == nil {
		return errors.New("index not initialized")
	}
	batch := m.index.NewBatch()
	for doc, err := range m.docstore.ListGreaterThanVersion(ctx, m.key, 0) {
		if err != nil {
			return err
		}
		if doc.IsDeleted {
			continue
		}
		out := Document{}
		err = json.Unmarshal(doc.Value, &out)
		if err != nil {
			return err
		}
		batch.Index(doc.UID, out)
		if doc.Version > m.lastVersion {
			m.lastVersion = doc.Version
		}
	}
	return m.index.Batch(batch)
}

func (m *minisearch) fullResync(ctx context.Context) error {
	return m.store.FullSync(ctx, m.key, func(yield func(DocumentData, error) bool) {
		lister, err := m.lister(ctx)
		if err != nil {
			yield(DocumentData{}, err)
			return
		}
		for lister.Next() {
			if lister.Error() != nil {
				yield(DocumentData{}, lister.Error())
				return
			}
			doc := lister.Document()
			value, err := json.Marshal(doc)
			if err != nil {
				yield(DocumentData{}, err)
				return
			}

			if !yield(DocumentData{UID: lister.UID(), Value: value}, nil) {
				return
			}
		}
	})
}

func (m *minisearch) partialResync(ctx context.Context) error {
	m.mu.RLock()
	version := m.lastVersion
	m.mu.RUnlock()

	batch := m.index.NewBatch()
	for doc, err := range m.docstore.ListGreaterThanVersion(ctx, m.key, version) {
		if err != nil {
			return err
		}
		if doc.IsDeleted {
			batch.Delete(doc.UID)
		} else {
			batch.Index(doc.UID, doc.Value)
		}
		if doc.Version > version {
			version = doc.Version
		}
	}
	m.mu.Lock()
	m.lastVersion = version
	m.mu.Unlock()
	return m.index.Batch(batch)
}

func (m *minisearch) indexMapping() (mapping.IndexMapping, error) {
	dm := bleve.NewDocumentStaticMapping()
	// Add the updatedAt field
	updatedAtFieldMapping := bleve.NewDateTimeFieldMapping()
	updatedAtFieldMapping.Index = true
	updatedAtFieldMapping.Store = true
	dm.AddFieldMappingsAt(updatedAtField, updatedAtFieldMapping)

	// Add the other fields
	for _, field := range m.fieldMapping {
		var fieldMapping *mapping.FieldMapping
		switch field.Type {
		case FieldTypeText:
			fieldMapping = bleve.NewTextFieldMapping()
			fieldMapping.Analyzer = "standard"
		case FieldTypeNumber:
			fieldMapping = bleve.NewNumericFieldMapping()
		case FieldTypeBoolean:
			fieldMapping = bleve.NewBooleanFieldMapping()
		case FieldTypeDateTime:
			fieldMapping = bleve.NewDateTimeFieldMapping()
		default:
			return nil, errors.New("unknown field type")
		}
		fieldMapping.Index = field.Index
		fieldMapping.Store = field.Store
		dm.AddFieldMappingsAt(field.Name, fieldMapping)
	}

	mapper := bleve.NewIndexMapping()
	mapper.DefaultMapping = dm

	return mapper, nil
}

func (m *minisearch) Save(ctx context.Context, uid string, doc Document) error {
	jsonDoc, err := json.Marshal(doc)
	if err != nil {
		return err
	}
	m.store.Save(ctx, m.key, uid, jsonDoc, StoreOptions{})
	return nil
}

func (m *minisearch) Delete(ctx context.Context, uid string) error {
	m.store.SoftDelete(ctx, m.key, uid, StoreOptions{})
	return nil
}

func (m *minisearch) Search(ctx context.Context, req *bleve.SearchRequest) ([]Document, error) {
	err := m.partialResync(ctx)
	if err != nil {
		return nil, err
	}

	searchResults, err := m.index.SearchInContext(ctx, req)
	if err != nil {
		return nil, err
	}

	docs := make([]Document, 0, len(searchResults.Hits))
	for _, hit := range searchResults.Hits {
		docs = append(docs, hit.Fields)
	}
	return docs, nil
}

func (m *minisearch) DocCount(ctx context.Context) (uint64, error) {
	err := m.partialResync(ctx)
	if err != nil {
		return 0, err
	}
	return m.index.DocCount()
}

func (m *minisearch) PrintAllDocuments(ctx context.Context) error {
	// Create a search request that matches all documents
	searchRequest := &bleve.SearchRequest{
		Query: bleve.NewMatchAllQuery(),
		Size:  1000000000, // A large number to get all documents
		From:  0,
	}

	// Execute the search
	searchResults, err := m.index.SearchInContext(ctx, searchRequest)
	if err != nil {
		return err
	}

	// Print each document
	for _, hit := range searchResults.Hits {
		fmt.Printf("Document ID: %s\n", hit.ID)
		fmt.Printf("Score: %f\n", hit.Score)

		// Print all fields in the document
		for fieldName, fieldValue := range hit.Fields {
			fmt.Printf("%s: %v\n", fieldName, fieldValue)
		}
		fmt.Println("---")
	}

	return nil
}
