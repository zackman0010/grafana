package resources

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseFolderID(t *testing.T) {
	hash := func(s string) string {
		hashed := sha256.Sum256([]byte(s))
		return hex.EncodeToString(hashed[:])[:16]
	}

	cases := []struct {
		Description string
		Path        string
		Title       string
		KubeName    string
	}{
		{"Short, simple path", "hello/world", "world", "helloworld-" + hash("hello/world")},
		{"Capital letters and punctuation", "Hello, World!", "Hello, World!", "hello-world-" + hash("Hello, World!")},
		// With fish: echo (string repeat -n 200 -m (math 253-9) "helloworld")-(string repeat -n 200 "/hello/world" | sha256sum | awk '{print substr($1,0,8);}')
		{"Very long name", strings.Repeat("/hello/world", 200), "world", "helloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhell-231bdfaf"},
	}

	for _, c := range cases {
		t.Run(c.Description, func(t *testing.T) {
			id := ParseFolderID(c.Path)
			assert.Equal(t, c.Path, id.Path)
			assert.Equal(t, c.KubeName, id.KubernetesName)
			assert.Equal(t, c.Title, id.Title)
		})
	}
}
