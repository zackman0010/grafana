package v0alpha1

// Defines values for RoleRuleVerb.
const (
	RoleRuleVerbCreate RoleRuleVerb = "create"
	RoleRuleVerbDelete RoleRuleVerb = "delete"
	RoleRuleVerbGet    RoleRuleVerb = "get"
	RoleRuleVerbUpdate RoleRuleVerb = "update"
)

// RoleRule defines model for RoleRule.
// +k8s:openapi-gen=true
type RoleRule struct {
	Group    string       `json:"group"`
	Name     *string      `json:"name,omitempty"`
	Resource string       `json:"resource"`
	Verb     RoleRuleVerb `json:"verb"`
}

// RoleRuleVerb defines model for RoleRule.Verb.
// +k8s:openapi-gen=true
type RoleRuleVerb string

// RoleSpec defines model for RoleSpec.
// +k8s:openapi-gen=true
type RoleSpec struct {
	Rules []RoleRule `json:"rules"`
	Title string     `json:"title"`
}
