package resources

import (
	"crypto/sha256"
	"encoding/hex"
	"path"
	"regexp"
	"strings"
)

var disallowedKubernetesCharacters = regexp.MustCompile(`[^-a-z0-9]`)

// FolderID contains the identifier data for a folder.
type FolderID struct {
	// Title is the human-readable name created by a human who wrote it.
	Title string
	// KubernetesName represents the name the folder should have, derived from the title.
	// It contains a suffix calculated from the path of the folder.
	KubernetesName string
	// Path is the full path to the folder, as given to the parse function.
	Path string
}

func ParseFolderID(dirPath string) FolderID {
	clean := strings.Trim(path.Clean(dirPath), "/")
	cleanHash := sha256.Sum256([]byte(clean))

	titleIdx := strings.LastIndex(clean, "/")
	title := clean
	if titleIdx != -1 {
		title = title[titleIdx+1:]
	}

	kubernetesName := strings.ToLower(clean)
	kubernetesName = strings.ReplaceAll(kubernetesName, "_", "-")
	kubernetesName = strings.ReplaceAll(kubernetesName, " ", "-")
	kubernetesName = disallowedKubernetesCharacters.ReplaceAllString(kubernetesName, "")
	kubernetesName = strings.Trim(kubernetesName, "-") // cannot start or end with hyphen
	const minSuffixLen = 8
	const maxSuffixLen = 16
	const maxKubeNameLen = 253 - 1 /* hyphen */ - minSuffixLen
	if len(kubernetesName) > maxKubeNameLen {
		kubernetesName = kubernetesName[:maxKubeNameLen]
	}
	actualSuffixLen := maxKubeNameLen - len(kubernetesName)
	if actualSuffixLen > maxSuffixLen {
		actualSuffixLen = maxSuffixLen
	}
	kubeSuffix := hex.EncodeToString(cleanHash[:])[:actualSuffixLen]
	kubernetesName = kubernetesName + "-" + kubeSuffix

	return FolderID{
		Title:          title,
		KubernetesName: kubernetesName,
		Path:           dirPath,
	}
}
