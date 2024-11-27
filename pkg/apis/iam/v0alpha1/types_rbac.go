package v0alpha1

import metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Role struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec RoleSpec `json:"spec,omitempty"`
}

type RoleSpec struct {
	Title string     `json:"title"`
	Rules []RoleRule `json:"rules,omitemptu"`
}

type RoleRule struct {
	Group    string `json:"group,omitempty"`
	Resource string `json:"resource,omitempty"`
	Name     string `json:"name,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type RoleList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []Role `json:"items,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type RoleBinding struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec RoleBindingSpec `json:"spec,omitempty"`
}

type RoleBindingSpec struct {
	Subjects []IdentityRef `json:"subjects,omitempty"`
	RoleRef  RoleRef       `json:"roleRef,omitempty"`
}

type RoleRef struct {
	Name string `json:"name"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type RoleBindingList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []RoleBinding `json:"items,omitempty"`
}
