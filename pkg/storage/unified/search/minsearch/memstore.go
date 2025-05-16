package minisearch

import (
	"context"
	"errors"
	"sync"
	"time"
)

// inMemoryDocumentStore is an in-memory implementation of DocumentStore
type inMemoryDocumentStore struct {
	mu   sync.RWMutex
	docs map[string]map[string]memDoc

	nextLock sync.Mutex
	next     uint64
}

type memDoc struct {
	doc       []byte
	isDeleted bool
	version   uint64
	key       string
	uid       string
}

// newInMemoryDocumentStore creates a new in-memory document store
func newInMemoryDocumentStore() *inMemoryDocumentStore {
	return &inMemoryDocumentStore{
		docs: make(map[string]map[string]memDoc),
	}
}

// inMemoryDocumentIterator implements StoredDocumentIterator
type inMemoryDocumentIterator struct {
	docs    []memDoc
	current int
	err     error
}

func (i *inMemoryDocumentIterator) Next() bool {
	i.current++
	return i.current < len(i.docs)
}

func (i *inMemoryDocumentIterator) Error() error {
	return i.err
}

func (i *inMemoryDocumentIterator) Document() []byte {
	return i.docs[i.current].doc
}

func (i *inMemoryDocumentIterator) Version() uint64 {
	return i.docs[i.current].version
}

func (i *inMemoryDocumentIterator) IsDeleted() bool {
	return i.docs[i.current].isDeleted
}

func (i *inMemoryDocumentIterator) Key() string {
	return i.docs[i.current].key
}

func (i *inMemoryDocumentIterator) UID() string {
	return i.docs[i.current].uid
}

func (s *inMemoryDocumentStore) ListGreaterThanVersion(ctx context.Context, key string, version uint64) (StoredDocumentIterator, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if _, ok := s.docs[key]; !ok {
		return &inMemoryDocumentIterator{
			docs:    []memDoc{},
			current: -1,
		}, nil
	}
	var docs []memDoc
	for _, doc := range s.docs[key] {
		if doc.version > version {
			docs = append(docs, memDoc{
				doc:       doc.doc,
				version:   doc.version,
				key:       doc.key,
				uid:       doc.uid,
				isDeleted: doc.isDeleted,
			})
		}
	}

	return &inMemoryDocumentIterator{
		docs:    docs,
		current: -1,
	}, nil
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
		s.docs[key] = make(map[string]memDoc)
	}

	if opts.PrevVersion > 0 {
		prevDoc, ok := s.docs[key][docID]
		if !ok {
			return 0, errors.New("document not found")
		}
		if opts.PrevVersion != prevDoc.version {
			return 0, errors.New("version mismatch")
		}
	}

	version := s.newVersion()
	s.docs[key][docID] = memDoc{
		doc:     doc,
		version: version,
		key:     key,
		uid:     docID,
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
		if opts.PrevVersion != prevDoc.version {
			return 0, errors.New("version mismatch")
		}
	}

	version := s.newVersion()
	s.docs[key][docID] = memDoc{
		doc:       []byte{},
		isDeleted: true,
		version:   version,
		key:       key,
		uid:       docID,
	}

	return version, nil
}

// FullSync replaces all documents with the given iterator
func (s *inMemoryDocumentStore) FullSync(ctx context.Context, key string, iter StoreDocumentListIterator) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.docs[key]; !ok {
		s.docs[key] = make(map[string]memDoc)
	}
	// Add new documents
	seen := make(map[string]bool, len(s.docs[key]))
	for iter.Next() {
		if err := iter.Error(); err != nil {
			return err
		}
		doc := iter.Document()

		s.docs[key][iter.UID()] = memDoc{
			doc:     doc,
			version: s.newVersion(),
			key:     key,
			uid:     iter.UID(),
		}
		seen[iter.UID()] = true
	}

	if err := iter.Error(); err != nil {
		return err
	}
	// Mark deleted documents
	for uid := range s.docs[key] {
		if !seen[uid] {
			s.docs[key][uid] = memDoc{
				doc:       []byte{},
				isDeleted: true,
				key:       key,
				uid:       uid,
			}
		}
	}

	return nil
}
