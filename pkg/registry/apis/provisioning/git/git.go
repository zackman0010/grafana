package git

import (
	"context"
	"io"
)

// TODO: Find a better home for this

type GitOwner struct {
	// The stack that owns this repository.
	// Empty if this is running on-prem.
	Stack string
	// The organisation that owns this repository.
	Organisation int
	// The Kubernetes Repository resource name.
	Resource string
}

type GitRepositoryManager interface {
	// Opens or clones the given repository into the appropriate path given the organisation and, if it exists, stack information.
	//
	// The repositoryURL given is expected to be a complete link to clone the repository.
	// TODO: Does it need to be ssh? git protocol? https?
	//
	// Authentication is always provided in every authenticated method. This is to ensure the repository itself never has to manage secrets.
	Open(
		ctx context.Context,
		owner GitOwner,
		repositoryURL string,
		auth Authentication,
	) (Repository, error)
}

type Repository interface {
	// Update the repository to the latest commit available.
	//
	// The forEach function is called on them all. If any forEach invocation returns an error, the context given to them all is cancelled.
	// If any invocation of forEach returns an error, the entire function returns an error.
	// Multiple invocations of the forEach function may occur at once, but one file will never cause multiple invocations.
	UpdateRepository(
		ctx context.Context,
		forEach func(context.Context, FileDiff) error,
		auth Authentication,
	) error

	// Updates the given files and pushes them to the repository.
	// If branching is enabled and a branch is requested, pass it in the branch parameter. Otherwise, an empty string results in using the main branch.
	//
	// The files map is keyed by paths (including a leading slash). The value is either a body, or empty to indicate the path shall be deleted if it exists.
	PushFileUpdate(
		ctx context.Context,
		branch string,
		files map[string][]byte,
		auth Authentication,
	) error

	// Stream all files in the repository.
	//
	// This behaves similarly to UpdateRepository. However, all file statuses are always new.
	// The forEach function is called on all files in the repository. If any forEach invocation returns an error, the context given to them all is cancelled.
	// If any invocation of forEach returns an error, the entire function returns an error.
	// Multiple invocations of the forEach function may occur at once, but one file will never cause multiple invocations.
	StreamExistingFiles(
		ctx context.Context,
		forEach func(context.Context, FileDiff) error,
	)

	// TODO: Should we expose the billy FS? Maybe a better idea than streaming via the repository,
	//   but we also might want to not store the entire repo locally (e.g. via a nanogit-like lib).
}

type Authentication struct {
	// TODO :)
}

type FileDiff struct {
	// The path to the file in the repository.
	// All paths are prefixed with '/'. The root directory ('/') is where '.git' is.
	// Directories are never given as a diff. Files may however be in a directory (e.g. `/test/file.json`).
	Path string
	// What is the current state of the file in the scope of the base vs head?
	// If the file has been removed and readded with no change, it is not listed in the diff at all.
	// If the same applies, but it was changed, we just say it was changed.
	// If the file is removed, it says removed. Likewise, if it is new, we say it is new.
	Change FileStatus
	// What was the last git commit hash in which this was last modified?
	LastModified string
	// The contents of the file.
	// If forEach is called, it is expected that you always close this.
	Body io.ReadCloser
}

type FileStatus string

const (
	FileNew     FileStatus = "new"
	FileRemoved FileStatus = "removed"
	FileChanged FileStatus = "changed"
)
