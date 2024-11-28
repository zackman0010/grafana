package v0alpha1

// Defines values for RoleBindingOperatorStateState.
const (
	RoleBindingOperatorStateStateFailed     RoleBindingOperatorStateState = "failed"
	RoleBindingOperatorStateStateInProgress RoleBindingOperatorStateState = "in_progress"
	RoleBindingOperatorStateStateSuccess    RoleBindingOperatorStateState = "success"
)

// Defines values for RoleBindingstatusOperatorStateState.
const (
	RoleBindingstatusOperatorStateStateFailed     RoleBindingstatusOperatorStateState = "failed"
	RoleBindingstatusOperatorStateStateInProgress RoleBindingstatusOperatorStateState = "in_progress"
	RoleBindingstatusOperatorStateStateSuccess    RoleBindingstatusOperatorStateState = "success"
)

// RoleBindingOperatorState defines model for RoleBindingOperatorState.
// +k8s:openapi-gen=true
type RoleBindingOperatorState struct {
	// descriptiveState is an optional more descriptive state field which has no requirements on format
	DescriptiveState *string `json:"descriptiveState,omitempty"`

	// details contains any extra information that is operator-specific
	Details map[string]interface{} `json:"details,omitempty"`

	// lastEvaluation is the ResourceVersion last evaluated
	LastEvaluation string `json:"lastEvaluation"`

	// state describes the state of the lastEvaluation.
	// It is limited to three possible states for machine evaluation.
	State RoleBindingOperatorStateState `json:"state"`
}

// RoleBindingOperatorStateState state describes the state of the lastEvaluation.
// It is limited to three possible states for machine evaluation.
// +k8s:openapi-gen=true
type RoleBindingOperatorStateState string

// RoleBindingStatus defines model for RoleBindingStatus.
// +k8s:openapi-gen=true
type RoleBindingStatus struct {
	// additionalFields is reserved for future use
	AdditionalFields map[string]interface{} `json:"additionalFields,omitempty"`

	// operatorStates is a map of operator ID to operator state evaluations.
	// Any operator which consumes this kind SHOULD add its state evaluation information to this field.
	OperatorStates map[string]RoleBindingstatusOperatorState `json:"operatorStates,omitempty"`
}

// RoleBindingstatusOperatorState defines model for RoleBindingstatus.#OperatorState.
// +k8s:openapi-gen=true
type RoleBindingstatusOperatorState struct {
	// descriptiveState is an optional more descriptive state field which has no requirements on format
	DescriptiveState *string `json:"descriptiveState,omitempty"`

	// details contains any extra information that is operator-specific
	Details map[string]interface{} `json:"details,omitempty"`

	// lastEvaluation is the ResourceVersion last evaluated
	LastEvaluation string `json:"lastEvaluation"`

	// state describes the state of the lastEvaluation.
	// It is limited to three possible states for machine evaluation.
	State RoleBindingstatusOperatorStateState `json:"state"`
}

// RoleBindingstatusOperatorStateState state describes the state of the lastEvaluation.
// It is limited to three possible states for machine evaluation.
// +k8s:openapi-gen=true
type RoleBindingstatusOperatorStateState string
