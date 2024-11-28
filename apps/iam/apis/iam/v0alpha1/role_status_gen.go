package v0alpha1

// Defines values for RoleOperatorStateState.
const (
	RoleOperatorStateStateFailed     RoleOperatorStateState = "failed"
	RoleOperatorStateStateInProgress RoleOperatorStateState = "in_progress"
	RoleOperatorStateStateSuccess    RoleOperatorStateState = "success"
)

// Defines values for RolestatusOperatorStateState.
const (
	RolestatusOperatorStateStateFailed     RolestatusOperatorStateState = "failed"
	RolestatusOperatorStateStateInProgress RolestatusOperatorStateState = "in_progress"
	RolestatusOperatorStateStateSuccess    RolestatusOperatorStateState = "success"
)

// RoleOperatorState defines model for RoleOperatorState.
// +k8s:openapi-gen=true
type RoleOperatorState struct {
	// descriptiveState is an optional more descriptive state field which has no requirements on format
	DescriptiveState *string `json:"descriptiveState,omitempty"`

	// details contains any extra information that is operator-specific
	Details map[string]interface{} `json:"details,omitempty"`

	// lastEvaluation is the ResourceVersion last evaluated
	LastEvaluation string `json:"lastEvaluation"`

	// state describes the state of the lastEvaluation.
	// It is limited to three possible states for machine evaluation.
	State RoleOperatorStateState `json:"state"`
}

// RoleOperatorStateState state describes the state of the lastEvaluation.
// It is limited to three possible states for machine evaluation.
// +k8s:openapi-gen=true
type RoleOperatorStateState string

// RoleStatus defines model for RoleStatus.
// +k8s:openapi-gen=true
type RoleStatus struct {
	// additionalFields is reserved for future use
	AdditionalFields map[string]interface{} `json:"additionalFields,omitempty"`

	// operatorStates is a map of operator ID to operator state evaluations.
	// Any operator which consumes this kind SHOULD add its state evaluation information to this field.
	OperatorStates map[string]RolestatusOperatorState `json:"operatorStates,omitempty"`
}

// RolestatusOperatorState defines model for Rolestatus.#OperatorState.
// +k8s:openapi-gen=true
type RolestatusOperatorState struct {
	// descriptiveState is an optional more descriptive state field which has no requirements on format
	DescriptiveState *string `json:"descriptiveState,omitempty"`

	// details contains any extra information that is operator-specific
	Details map[string]interface{} `json:"details,omitempty"`

	// lastEvaluation is the ResourceVersion last evaluated
	LastEvaluation string `json:"lastEvaluation"`

	// state describes the state of the lastEvaluation.
	// It is limited to three possible states for machine evaluation.
	State RolestatusOperatorStateState `json:"state"`
}

// RolestatusOperatorStateState state describes the state of the lastEvaluation.
// It is limited to three possible states for machine evaluation.
// +k8s:openapi-gen=true
type RolestatusOperatorStateState string
