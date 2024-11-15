package git

type repoManagerImpl struct{}

type repoImpl struct{}

var (
	_ GitRepositoryManager = (*repoManagerImpl)(nil)
	_ GitRepository        = (*repoImpl)(nil)
)
