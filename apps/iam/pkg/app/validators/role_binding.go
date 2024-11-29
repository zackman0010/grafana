package validators

import (
	"context"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-app-sdk/app"
	"github.com/grafana/grafana-app-sdk/k8s"
	"github.com/grafana/grafana-app-sdk/simple"

	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
)

var allowedSubjectTypes = map[string]struct{}{
	"user": {},
	"team": {},
}

func NewRoleBindingValidator() *simple.Validator {
	return &simple.Validator{
		ValidateFunc: func(ctx context.Context, r *app.AdmissionRequest) error {
			role, ok := r.Object.(*iamv0.RoleBinding)
			if !ok {
				return nil
			}

			for _, s := range role.Spec.Subjects {
				if _, ok := allowedSubjectTypes[string(s.Type)]; !ok {
					return k8s.NewServerResponseError(fmt.Errorf("unsupported subject type %s", s.Type), http.StatusBadRequest)
				}
			}

			return nil
		},
	}
}
