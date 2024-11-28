package v0alpha1

// RoleBindingRoleRef defines model for RoleBindingRoleRef.
// +k8s:openapi-gen=true
type RoleBindingRoleRef struct {
	Name string `json:"name"`
}

// RoleBindingSpec defines model for RoleBindingSpec.
// +k8s:openapi-gen=true
type RoleBindingSpec struct {
	RoleRef  RoleBindingRoleRef   `json:"roleRef"`
	Subjects []RoleBindingSubject `json:"subjects"`
}

// RoleBindingSubject defines model for RoleBindingSubject.
// +k8s:openapi-gen=true
type RoleBindingSubject struct {
	Name string `json:"name"`
	Type string `json:"type"`
}
