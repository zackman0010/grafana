package git

type repoManagerImpl struct{}

type repoImpl struct{}

var (
	_ RepositoryManager = (*repoManagerImpl)(nil)
	_ Repository        = (*repoImpl)(nil)
)
