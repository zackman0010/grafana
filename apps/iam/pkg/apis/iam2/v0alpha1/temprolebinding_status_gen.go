package v0alpha1

import (
	"time"
)

// Defines values for TempRoleBindingOperatorStateState.
const (
	TempRoleBindingOperatorStateStateFailed     TempRoleBindingOperatorStateState = "failed"
	TempRoleBindingOperatorStateStateInProgress TempRoleBindingOperatorStateState = "in_progress"
	TempRoleBindingOperatorStateStateSuccess    TempRoleBindingOperatorStateState = "success"
)

// Defines values for TempRoleBindingstatusOperatorStateState.
const (
	TempRoleBindingstatusOperatorStateStateFailed     TempRoleBindingstatusOperatorStateState = "failed"
	TempRoleBindingstatusOperatorStateStateInProgress TempRoleBindingstatusOperatorStateState = "in_progress"
	TempRoleBindingstatusOperatorStateStateSuccess    TempRoleBindingstatusOperatorStateState = "success"
)

// TempRoleBindingOperatorState defines model for TempRoleBindingOperatorState.
// +k8s:openapi-gen=true
type TempRoleBindingOperatorState struct {
	// descriptiveState is an optional more descriptive state field which has no requirements on format
	DescriptiveState *string `json:"descriptiveState,omitempty"`

	// details contains any extra information that is operator-specific
	Details map[string]interface{} `json:"details,omitempty"`

	// lastEvaluation is the ResourceVersion last evaluated
	LastEvaluation string `json:"lastEvaluation"`

	// state describes the state of the lastEvaluation.
	// It is limited to three possible states for machine evaluation.
	State TempRoleBindingOperatorStateState `json:"state"`
}

// TempRoleBindingOperatorStateState state describes the state of the lastEvaluation.
// It is limited to three possible states for machine evaluation.
// +k8s:openapi-gen=true
type TempRoleBindingOperatorStateState string

// TempRoleBindingStatus defines model for TempRoleBindingStatus.
// +k8s:openapi-gen=true
type TempRoleBindingStatus struct {
	Activated *time.Time `json:"activated,omitempty"`

	// additionalFields is reserved for future use
	AdditionalFields map[string]interface{} `json:"additionalFields,omitempty"`

	// operatorStates is a map of operator ID to operator state evaluations.
	// Any operator which consumes this kind SHOULD add its state evaluation information to this field.
	OperatorStates map[string]TempRoleBindingstatusOperatorState `json:"operatorStates,omitempty"`
}

// TempRoleBindingstatusOperatorState defines model for TempRoleBindingstatus.#OperatorState.
// +k8s:openapi-gen=true
type TempRoleBindingstatusOperatorState struct {
	// descriptiveState is an optional more descriptive state field which has no requirements on format
	DescriptiveState *string `json:"descriptiveState,omitempty"`

	// details contains any extra information that is operator-specific
	Details map[string]interface{} `json:"details,omitempty"`

	// lastEvaluation is the ResourceVersion last evaluated
	LastEvaluation string `json:"lastEvaluation"`

	// state describes the state of the lastEvaluation.
	// It is limited to three possible states for machine evaluation.
	State TempRoleBindingstatusOperatorStateState `json:"state"`
}

// TempRoleBindingstatusOperatorStateState state describes the state of the lastEvaluation.
// It is limited to three possible states for machine evaluation.
// +k8s:openapi-gen=true
type TempRoleBindingstatusOperatorStateState string
