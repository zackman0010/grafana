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

var allowedVerbs = map[string]struct{}{
	"get":    {},
	"update": {},
	"create": {},
	"delete": {},
}

func NewRoleValidator() *simple.Validator {
	return &simple.Validator{
		ValidateFunc: func(ctx context.Context, r *app.AdmissionRequest) error {
			role, ok := r.Object.(*iamv0.Role)
			if !ok {
				return nil
			}

			for _, r := range role.Spec.Rules {
				if _, ok := allowedVerbs[string(r.Verb)]; !ok {
					return k8s.NewServerResponseError(fmt.Errorf("unsupported verb %s", r.Verb), http.StatusBadRequest)
				}

				if r.Verb == "create" && r.Name != nil {
					return k8s.NewServerResponseError(fmt.Errorf("name not supported for create"), http.StatusBadRequest)
				}
			}

			return nil
		},
	}
}
