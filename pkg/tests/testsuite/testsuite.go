package testsuite

import (
	"os"
	"testing"
)

// Deprecated: the testsuite package does not do anything anymore.
func Run(m *testing.M) {
	os.Exit(m.Run())
}
