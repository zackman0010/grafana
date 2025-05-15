package ofrep

import (
	"context"
	"net/http"

	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/setting"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apiserver/pkg/authorization/authorizer"
	genericapiserver "k8s.io/apiserver/pkg/server"
	"k8s.io/kube-openapi/pkg/common"
	"k8s.io/kube-openapi/pkg/spec3"

	"github.com/gorilla/mux"
	"github.com/grafana/grafana/pkg/services/apiserver/builder"
)

var _ builder.APIGroupBuilder = (*APIBuilder)(nil)
var _ builder.APIGroupRouteProvider = (*APIBuilder)(nil)
var _ builder.APIGroupVersionProvider = (*APIBuilder)(nil)

type APIBuilder struct {
	cfg         *setting.Cfg
	openFeature *featuremgmt.OpenFeatureService
}

//
//func NewAPIBuilder(cfg *setting.Cfg, openFeature *featuremgmt.OpenFeatureService) *APIBuilder {
//	return &APIBuilder{
//		cfg:         cfg,
//		openFeature: openFeature,
//	}
//}

func RegisterAPIService(apiregistration builder.APIRegistrar, cfg *setting.Cfg, openFeature *featuremgmt.OpenFeatureService) *APIBuilder {
	b := &APIBuilder{
		cfg:         cfg,
		openFeature: openFeature,
	}
	apiregistration.RegisterAPI(b)
	return b
}

func (b *APIBuilder) GetAuthorizer() authorizer.Authorizer {
	return authorizer.AuthorizerFunc(func(ctx context.Context, attr authorizer.Attributes) (authorizer.Decision, string, error) {
		// Allow all requests - we'll handle auth in the handler
		return authorizer.DecisionAllow, "", nil
	})
}

func (b *APIBuilder) GetGroupVersion() schema.GroupVersion {
	return schema.GroupVersion{
		Group:   "ofrep",
		Version: "v1",
	}
}

func (b *APIBuilder) InstallSchema(scheme *runtime.Scheme) error {
	return nil
}

func (b *APIBuilder) UpdateAPIGroupInfo(apiGroupInfo *genericapiserver.APIGroupInfo, opts builder.APIGroupOptions) error {
	return nil
}

func (b *APIBuilder) GetOpenAPIDefinitions() common.GetOpenAPIDefinitions {
	return func(ref common.ReferenceCallback) map[string]common.OpenAPIDefinition {
		return map[string]common.OpenAPIDefinition{}
	}
}

func (b *APIBuilder) GetAPIRoutes(gv schema.GroupVersion) *builder.APIRoutes {
	return &builder.APIRoutes{
		Namespace: []builder.APIRouteHandler{
			{
				Path: "ofrep/v1/evaluate/flag",
				Spec: &spec3.PathProps{
					Get: &spec3.Operation{},
				},
				Handler: b.handleFlagsList,
			},
			{
				Path: "ofrep/v1/evaluate/{flagKey}",
				Spec: &spec3.PathProps{
					Get: &spec3.Operation{},
				},
				Handler: b.handleEvaluateFlag,
			},
		},
	}
}

func (b *APIBuilder) handleFlagsList(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, err := w.Write([]byte("flags list"))
	if err != nil {
		panic(err)
	}
}

func (b *APIBuilder) handleEvaluateFlag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	flagKey := vars["flagKey"]
	if flagKey == "" {
		http.Error(w, "flagKey parameter is required", http.StatusBadRequest)
		return
	}

	// if anonymous && isAuthed - return err
	i, err := identity.GetRequester(r.Context())
	if err != nil {
		http.Error(w, "failed to get requester identity", http.StatusInternalServerError)
	}

	_ = i
	w.WriteHeader(http.StatusOK)
	_, err = w.Write([]byte(flagKey))
	if err != nil {
		panic(err)
	}
}

var authedFlags = []string{
	"flagOne",
	"flagTwo",
}

func isAuthed(flagKey string) bool {
	for _, flag := range authedFlags {
		if flag == flagKey {
			return true
		}
	}
	return false
}
