package v0alpha1

// Defines values for TempRoleBindingSubjectType.
const (
	TempRoleBindingSubjectTypeTeam TempRoleBindingSubjectType = "team"
	TempRoleBindingSubjectTypeUser TempRoleBindingSubjectType = "user"
)

// TempRoleBindingRoleRef defines model for TempRoleBindingRoleRef.
// +k8s:openapi-gen=true
type TempRoleBindingRoleRef struct {
	Name string `json:"name"`
}

// TempRoleBindingSpec defines model for TempRoleBindingSpec.
// +k8s:openapi-gen=true
type TempRoleBindingSpec struct {
	RoleRef    TempRoleBindingRoleRef   `json:"roleRef"`
	Subjects   []TempRoleBindingSubject `json:"subjects"`
	TtlSeconds int                      `json:"ttlSeconds"`
}

// TempRoleBindingSubject defines model for TempRoleBindingSubject.
// +k8s:openapi-gen=true
type TempRoleBindingSubject struct {
	Name string                     `json:"name"`
	Type TempRoleBindingSubjectType `json:"type"`
}

// TempRoleBindingSubjectType defines model for TempRoleBindingSubject.Type.
// +k8s:openapi-gen=true
type TempRoleBindingSubjectType string
