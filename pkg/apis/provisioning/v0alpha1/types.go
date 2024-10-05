package v0alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +enum
type OriginProvider string

// Defines values for FilterOperator.
const (
	OriginProviderFile   OriginProvider = "file"
	OriginProviderS3     OriginProvider = "s3"
	OriginProviderGCS    OriginProvider = "gcs"
	OriginProviderGit    OriginProvider = "git"
	OriginProviderGitHub OriginProvider = "github"
)

// The sync mode for an origin
// +enum
type OriginMode string

const (
	// Resources are read from the origin, but can not be written
	OriginModeReadOnly OriginMode = "readonly"

	// Resources are written to the origin, then reflected in k8s storage
	OriginModeWriteable OriginMode = "writeable"

	// Changes to spec+metadata require writing to a branch and merging elsewhere
	OriginModePR OriginMode = "pr"
)

type CommonOriginProperties struct {
	Title       string `json:"title"`
	Description string `json:"description"`

	// How the origin behaves
	Mode OriginMode `json:"mode"`

	// Do not process delete requests
	DisableDelete bool `json:"disableDelete"`

	// Folder support within the origin
	Folder *FolderSettings `json:"folder,omitempty"`
}

type FolderSettings struct {
	// When true, the metadata value will be replaced with a folder derived from the following properties
	IgnoreMetadataValue bool `json:"ignoreMetadataValue"`

	// The root folder where resources will be applied
	Root string `json:"root"`

	// Optionally use the origin file layout to create new folders and match the structure
	UseOriginStructure bool `json:"originStructure"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type FileOrigin struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec FileOriginSpec `json:"spec,omitempty"`
}

type FileOriginSpec struct {
	CommonOriginProperties `json:",inline"`

	// Path to folder
	Path string `json:"path"`

	// How frequently we scan for changes in the folder
	UpdateIntervalSeconds int64 `json:"updateIntervalSeconds"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type FileOriginList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []FileOrigin `json:"items,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type GithubOrigin struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec GithubOriginSpec `json:"spec,omitempty"`
}

type GithubOriginSpec struct {
	CommonOriginProperties `json:",inline"`

	Repo string `json:"repo"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type GithubOriginList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []GithubOrigin `json:"items,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type PullRequest struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PullRequestSpec   `json:"spec,omitempty"`
	Status PullRequestStatus `json:"status,omitempty"`
}

type PullRequestSpec struct {
	Title    string         `json:"title"`
	URL      string         `json:"url"`
	Provider OriginProvider `json:"provider"` // only github for now?
}

// Reflection of upstream status
type PullRequestStatus struct {
	Updated string `json:"updated"`
	State   string `json:"state"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type OriginFileList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []OriginFileInfo `json:"items,omitempty"`
}

type OriginFileInfo struct {
	// The path within the named origin
	Path string `json:"path"`

	// Verification/identification hash (eg, checksum, etag, git hash etc)
	Hash string `json:"hash"`

	// File modification time
	Timestamp int64 `json:"time,omitempty"`
}
