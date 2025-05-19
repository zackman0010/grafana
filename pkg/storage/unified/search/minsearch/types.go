package minisearch

import (
	"context"
	"iter"
)

// FieldMapping is a mapping of a field name to a field type
type FieldMapping struct {
	Name  string    // The name of the field, e.g "id"
	Type  FieldType // The type of the field, e.g FieldTypeText
	Index bool      // Whether to index the field
	Store bool      // Whether to store the field
}

type Document struct {
	UID  string
	Data map[string]interface{}
}

// FieldType is the type of the field
type FieldType int

const (
	FieldTypeText FieldType = iota
	FieldTypeNumber
	FieldTypeBoolean
	FieldTypeDateTime
)

// DocumentLister returns all the documents that need to be indexed
type DocumentLister func(ctx context.Context) iter.Seq2[Document, error]

// Store
type StoreOptions struct {
	PrevVersion uint64 // If greater than 0, the document will be modify only if the previous version matches
}

type StoredDocument struct {
	UID       string
	Value     []byte
	Version   uint64
	IsDeleted bool
}

type DocumentData struct {
	UID   string
	Value []byte
}

// The DocumentStore is the storage that will be used to store the documents
type DocumentStore interface {
	ListGreaterThanVersion(ctx context.Context, key string, version uint64) iter.Seq2[StoredDocument, error]
	Save(ctx context.Context, key string, docID string, doc []byte, opts StoreOptions) (version uint64, err error)
	SoftDelete(ctx context.Context, key string, docID string, opts StoreOptions) (version uint64, err error)

	// TODO: Remoe this, could be implemented using Save and SoftDelete instead
	FullSync(ctx context.Context, key string, it iter.Seq2[DocumentData, error]) (err error) //

	// TODO
	// 1. Fullsync should be removed from the store.
	// 2. Implement a Delete method which is not a full delete
	// 3. Concurrency issues; On concurrent save for the same key, the wrong one could be stored in the index and lead to drift with reality.
	//    We will ignore this for now and rely on the periodic full sync to keep the index in sync with the database.

}
