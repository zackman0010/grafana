package minisearch

import (
	"context"
)

// FieldMapping is a mapping of a field name to a field type
type FieldMapping struct {
	Name  string    // The name of the field, e.g "id"
	Type  FieldType // The type of the field, e.g FieldTypeText
	Index bool      // Whether to index the field
	Store bool      // Whether to store the field
}

// Document is a single document to be indexed
type Document map[string]interface{}

// FieldType is the type of the field
type FieldType int

const (
	FieldTypeText FieldType = iota
	FieldTypeNumber
	FieldTypeBoolean
	FieldTypeDateTime
)

// DocumentLister returns all the documents that need to be indexed
type DocumentLister func(ctx context.Context) (DocumentIterator, error)

// DocumentIterator is an iterator over a list of documents
type DocumentIterator interface {
	// Next advances iterator and returns true if there is next value is available from the iterator.
	// Error() should be checked after every call of Next(), even when Next() returns true.
	Next() bool

	// Error returns iterator error, if any. This should be checked after any Next() call.
	// (Some iterator implementations return true from Next, but also set the error at the same time).
	Error() error

	// Current returns the current document
	Document() Document

	// UID returns the uid of the document
	UID() string
}

// Store
type StoreOptions struct {
	PrevVersion uint64 // If greater than 0, the document will be modify only if the previous version matches
}

// The DocumentStore is the storage that will be used to store the documents
type DocumentStore interface {
	ListGreaterThanVersion(ctx context.Context, key string, version uint64) (StoredDocumentIterator, error)
	Save(ctx context.Context, key string, docID string, doc []byte, opts StoreOptions) (version uint64, err error)
	SoftDelete(ctx context.Context, key string, docID string, opts StoreOptions) (version uint64, err error)
	FullSync(ctx context.Context, key string, iter StoreDocumentListIterator) (err error)
}

type StoreDocumentListIterator interface {
	// Next advances iterator and returns true if there is next value is available from the iterator.
	// Error() should be checked after every call of Next(), even when Next() returns true.
	Next() bool

	// Error returns iterator error, if any. This should be checked after any Next() call.
	// (Some iterator implementations return true from Next, but also set the error at the same time).
	Error() error

	// Data returns the current document data
	Document() []byte

	// UID returns the uid of the document
	UID() string
}

type StoredDocumentIterator interface {
	StoreDocumentListIterator
	// IsDeleted returns true if the document is deleted
	IsDeleted() bool

	// Version returns the version of the document
	Version() uint64
}
