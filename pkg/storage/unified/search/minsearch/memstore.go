package minisearch

import (
	"context"
	"errors"
	"iter"
	"sync"
	"time"
)

// inMemoryDocumentStore is an in-memory implementation of DocumentStore
type inMemoryDocumentStore struct {
	mu   sync.RWMutex
	docs map[string]map[string]StoredDocument

	nextLock sync.Mutex
	next     uint64
}

// newInMemoryDocumentStore creates a new in-memory document store
func newInMemoryDocumentStore() *inMemoryDocumentStore {
	return &inMemoryDocumentStore{
		docs: make(map[string]map[string]StoredDocument),
	}
}

func (s *inMemoryDocumentStore) ListGreaterThanVersion(ctx context.Context, key string, version uint64) iter.Seq2[StoredDocument, error] {
	return func(yield func(StoredDocument, error) bool) {
		s.mu.RLock()
		defer s.mu.RUnlock()

		if _, ok := s.docs[key]; !ok {
			return
		}
		for _, doc := range s.docs[key] {
			if doc.Version > version {
				if !yield(doc, nil) {
					return
				}
			}
		}
	}
}

// must be called with the lock held
func (s *inMemoryDocumentStore) newVersion() uint64 {
	s.nextLock.Lock()
	defer s.nextLock.Unlock()
	version := uint64(time.Now().UnixNano())
	if version == s.next {
		version++
	}
	s.next = version
	return version
}

// Save creates or updates an existing document
func (s *inMemoryDocumentStore) Save(ctx context.Context, key string, docID string, doc []byte, opts StoreOptions) (uint64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.docs[key]; !ok {
		s.docs[key] = make(map[string]StoredDocument)
	}

	if opts.PrevVersion > 0 {
		prevDoc, ok := s.docs[key][docID]
		if !ok {
			return 0, errors.New("document not found")
		}
		if opts.PrevVersion != prevDoc.Version {
			return 0, errors.New("version mismatch")
		}
	}

	version := s.newVersion()
	s.docs[key][docID] = StoredDocument{
		Value:     doc,
		Version:   version,
		UID:       docID,
		IsDeleted: false,
	}
	return version, nil
}

// SoftDelete marks a document as deleted
func (s *inMemoryDocumentStore) SoftDelete(ctx context.Context, key string, docID string, opts StoreOptions) (uint64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.docs[key]; !ok {
		return 0, errors.New("document not found")
	}
	if opts.PrevVersion > 0 {
		prevDoc, ok := s.docs[key][docID]
		if !ok {
			return 0, errors.New("document not found")
		}
		if opts.PrevVersion != prevDoc.Version {
			return 0, errors.New("version mismatch")
		}
	}

	version := s.newVersion()
	s.docs[key][docID] = StoredDocument{
		Value:     []byte{},
		IsDeleted: true,
		Version:   version,
		UID:       docID,
	}

	return version, nil
}

// FullSync replaces all documents with the given iterator
func (s *inMemoryDocumentStore) FullSync(ctx context.Context, key string, docs iter.Seq2[DocumentData, error]) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.docs[key]; !ok {
		s.docs[key] = make(map[string]StoredDocument)
	}
	// Add new documents
	seen := make(map[string]bool, len(s.docs[key]))
	for doc, err := range docs {
		if err != nil {
			return err
		}
		s.docs[key][doc.UID] = StoredDocument{
			Value:   doc.Value,
			Version: s.newVersion(),
			UID:     doc.UID,
		}
		seen[doc.UID] = true
	}

	// Mark deleted documents
	for uid := range s.docs[key] {
		if !seen[uid] {
			s.docs[key][uid] = StoredDocument{
				Value:     []byte{},
				Version:   s.docs[key][uid].Version,
				IsDeleted: true,
				UID:       uid,
			}
		}
	}

	return nil
}
