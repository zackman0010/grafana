package resources

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFolderTreeContainment(t *testing.T) {
	cases := []struct {
		Comment  string
		Tree     map[string]string
		Root     string
		Needle   string
		Expected bool
	}{
		{
			Comment:  "Nil map contains no entry",
			Tree:     nil,
			Root:     "test",
			Needle:   "test",
			Expected: false,
		},
		{
			Comment:  "Empty map contains no entry",
			Tree:     make(map[string]string),
			Root:     "test",
			Needle:   "test",
			Expected: false,
		},
		{
			Comment:  "Needle and root being equal strings",
			Tree:     map[string]string{"test": "test"},
			Root:     "test",
			Needle:   "test",
			Expected: true,
		},
		{
			Comment:  "Needle and root being empty",
			Tree:     map[string]string{"test": "test"},
			Root:     "",
			Needle:   "",
			Expected: true,
		},
		{
			Comment:  "Needle being in tree when root is empty",
			Tree:     map[string]string{"test": "xyz"},
			Root:     "",
			Needle:   "test",
			Expected: true,
		},
		{
			Comment:  "Needle being in tree under top-level root",
			Tree:     map[string]string{"test": "xyz", "xyz": "xy", "xy": "x"},
			Root:     "x",
			Needle:   "test",
			Expected: true,
		},
		{
			Comment:  "Nested needle being in tree under nested root",
			Tree:     map[string]string{"test": "xyz", "xyz": "xy", "xy": "x", "x": "a"},
			Root:     "x",
			Needle:   "xyz",
			Expected: true,
		},
		{
			Comment:  "Empty needle with tree and root",
			Tree:     map[string]string{"test": "xyz"},
			Root:     "x",
			Needle:   "",
			Expected: false,
		},
	}

	for _, c := range cases {
		t.Run(c.Comment, func(t *testing.T) {
			assertion := assert.True
			if !c.Expected {
				assertion = assert.False
			}
			tree := FolderTree{Tree: c.Tree}
			assertion(t, tree.ContainedInTree(c.Root, c.Needle))
		})
	}
}

func TestFolderTreeDirPath(t *testing.T) {
	cases := []struct {
		Comment  string
		Tree     map[string]string
		Root     string
		Needle   string
		Expected string
	}{
		{
			Comment:  "Root == needle",
			Tree:     map[string]string{"test": "x"},
			Root:     "test",
			Needle:   "test",
			Expected: "",
		},
		{
			Comment:  "Single subdirectory to root",
			Tree:     map[string]string{"test": "x"},
			Root:     "x",
			Needle:   "test",
			Expected: "test",
		},
		{
			Comment:  "Multiple subdirectories to root",
			Tree:     map[string]string{"test": "x", "x": "y", "y": "z"},
			Root:     "z",
			Needle:   "test",
			Expected: "y/x/test",
		},
	}

	for _, c := range cases {
		t.Run(c.Comment, func(t *testing.T) {
			tree := FolderTree{Tree: c.Tree}
			assert.Equal(t, c.Expected, tree.DirPath(c.Root, c.Needle))
		})
	}
}
