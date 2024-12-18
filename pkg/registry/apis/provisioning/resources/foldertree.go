package resources

import (
	"context"
	"path"

	apiutils "github.com/grafana/grafana/pkg/apimachinery/utils"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// A FolderTree contains a tree of folders. Unsurprising.
// The tree is constructed with a child having exactly 1 parent.
// The root entry, "", is always present in the tree and represents the tree itself.
type FolderTree struct {
	Tree map[string]string
}

// ContainedInTree checks if the needle is found under the root in the tree anywhere.
//
// The following rules are applied in order:
//   - If needle == root, true is returned. This is because a tree implicitly contains itself. If this is not wanted behaviour, check it on your own before-hand.
//   - If the tree is empty, false is returned.
//   - If the needle is an empty string (""), false is returned.
//   - If root is an empty string (""), the entire tree is regarded as the haystack, rather than only a subset of it.
func (t *FolderTree) ContainedInTree(root, needle string) bool {
	if len(t.Tree) == 0 {
		return false
	}
	if needle == root {
		return true
	}
	if needle == "" {
		return false
	}
	if root == "" {
		_, ok := t.Tree[needle]
		return ok
	}

	parent, ok := t.Tree[needle]
	for ok {
		if parent == root {
			return true
		}
		parent, ok = t.Tree[parent]
	}
	return false
}

// DirPath creates the path to the needle with slashes.
// The root folder is not included in the path, nor is any of its parents.
// If ContainedInTree(root, needle) is false, this will panic, because it would be undefined behaviour.
//
// If the tree is not trusted, consider using path.Clean or safepath.Clean on the output.
func (t *FolderTree) DirPath(root, needle string) string {
	if !t.ContainedInTree(root, needle) {
		panic("undefined behaviour")
	}
	if root == needle {
		return ""
	}

	dirPath := needle
	parent, ok := t.Tree[needle]
	for ok && parent != root {
		dirPath = path.Join(parent, dirPath)
		parent = t.Tree[parent]
	}
	// Not using Clean here is intentional. We don't want `.` or similar.
	// The tree is trusted anyhow.
	return dirPath
}

// BuildFolderTree creates a FolderTree out of the current folder structure in the Grafana instance.
// The tree can be used to build directory paths and check subtrees.
func (c *DynamicClient) BuildFolderTree(ctx context.Context) (*FolderTree, error) {
	// TODO: Unit/integration test that this actually does work...
	// It's very simple, so not a priority for now.

	iface := c.Resource(schema.GroupVersionResource{
		Group:    "folder.grafana.app",
		Version:  "v0alpha1",
		Resource: "folders",
	})

	// TODO: handle pagination
	rawFolders, err := iface.List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	folders := make(map[string]string, len(rawFolders.Items))
	for _, rf := range rawFolders.Items {
		name := rf.GetName()
		// TODO: Can I use MetaAccessor here?
		parent := rf.GetAnnotations()[apiutils.AnnoKeyFolder]
		folders[name] = parent
	}

	return &FolderTree{Tree: folders}, nil
}
