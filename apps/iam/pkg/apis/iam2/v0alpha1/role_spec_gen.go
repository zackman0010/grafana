package v0alpha1

// RoleRule defines model for RoleRule.
// +k8s:openapi-gen=true
type RoleRule struct {
	Group    string  `json:"group"`
	Name     *string `json:"name,omitempty"`
	Resource string  `json:"resource"`
	Verb     string  `json:"verb"`
}

// RoleSpec defines model for RoleSpec.
// +k8s:openapi-gen=true
type RoleSpec struct {
	Rules []RoleRule `json:"rules"`
	Title string     `json:"title"`
}
