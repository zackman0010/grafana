package provisioning

import (
	"context"
	"fmt"
	"net/http"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apiserver/pkg/registry/rest"

	"github.com/grafana/grafana/pkg/apis/provisioning/v0alpha1"
)

type readConnector struct {
	getter rest.Getter
}

func (*readConnector) New() runtime.Object {
	// This is added as the "ResponseType" regardless what ProducesObject() returns
	return &v0alpha1.AnyResource{}
}

func (*readConnector) Destroy() {}

func (*readConnector) NamespaceScoped() bool {
	return true
}

func (*readConnector) GetSingularName() string {
	return "Resource"
}

func (*readConnector) ProducesMIMETypes(verb string) []string {
	return []string{"application/json"}
}

func (*readConnector) ProducesObject(verb string) any {
	return &v0alpha1.AnyResource{}
}

func (*readConnector) ConnectMethods() []string {
	return []string{http.MethodGet}
}

func (*readConnector) NewConnectOptions() (runtime.Object, bool, string) {
	return nil, true, "" // true adds the {path} component
}

func (s *readConnector) Connect(ctx context.Context, name string, opts runtime.Object, responder rest.Responder) (http.Handler, error) {
	obj, err := s.getter.Get(ctx, name, &v1.GetOptions{})
	if err != nil {
		return nil, err
	}
	repo, ok := obj.(*v0alpha1.Repository)
	if !ok {
		return nil, fmt.Errorf("expected repository, but got %t", obj)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		commit := r.URL.Query().Get("commit")

		// TODO, actually read, and then validate
		obj := &unstructured.Unstructured{
			Object: map[string]interface{}{
				"apiVersion": "dashboards.or.something/v????",
				"metadata": metav1.ObjectMeta{
					Name: "xxx",
				},
				"spec": map[string]interface{}{
					"path":   path,
					"commit": commit,
					"repo":   repo.Name,
					"type":   repo.Spec.Type,
				},
			},
		}

		responder.Object(http.StatusOK, obj)
	}), nil
}

var (
	_ rest.Storage              = (*readConnector)(nil)
	_ rest.Connecter            = (*readConnector)(nil)
	_ rest.Scoper               = (*readConnector)(nil)
	_ rest.SingularNameProvider = (*readConnector)(nil)
	_ rest.StorageMetadata      = (*readConnector)(nil)
)
