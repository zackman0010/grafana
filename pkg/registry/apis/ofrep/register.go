package ofrep

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util/errhttp"
	"github.com/grafana/grafana/pkg/util/proxyutil"
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
	logger      log.Logger
}

func RegisterAPIService(apiregistration builder.APIRegistrar, cfg *setting.Cfg, openFeature *featuremgmt.OpenFeatureService) *APIBuilder {
	b := &APIBuilder{
		cfg:         cfg,
		openFeature: openFeature,
		logger:      log.New("grafana-apiserver.feature-flags"),
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
	// TODO: refactor this - before proxying we need to inspect if evalCtx's stackID matches the identity's stackID
	// Also auth vs non-authed flags need to be handled differently.

	evalFlagHandler, bulkEvalHandler := b.handleProxyRequest, b.handleProxyRequest
	if b.cfg.OpenFeature.ProviderType == setting.StaticProviderType {
		evalFlagHandler, bulkEvalHandler = b.handleEvaluateFlag, b.handleFlagsList
	}

	return &builder.APIRoutes{
		Namespace: []builder.APIRouteHandler{
			{
				// http://localhost:3000/apis/ofrep/v1/namespaces/default/ofrep/v1/evaluate/flags
				Path: "ofrep/v1/evaluate/flags",
				Spec: &spec3.PathProps{
					Post: &spec3.Operation{},
				},
				Handler: bulkEvalHandler,
			},
			{
				// http://localhost:3000/apis/ofrep/v1/namespaces/default/ofrep/v1/evaluate/flags/{flagKey}
				Path: "ofrep/v1/evaluate/flags/{flagKey}",
				Spec: &spec3.PathProps{
					Post: &spec3.Operation{},
				},
				Handler: evalFlagHandler,
			},
		},
	}
}

func (b *APIBuilder) handleFlagsList(w http.ResponseWriter, r *http.Request) {
	// TODO: replace with identity check
	isAuthedUser := false

	result, err := b.openFeature.EvalAllFlagsWithStaticProvider(r.Context())
	if err != nil {
		http.Error(w, "failed to evaluate flags", http.StatusInternalServerError)
		return
	}

	if !isAuthedUser {
		var publicOnly []featuremgmt.OFREPFlag

		for _, flag := range result.Flags {
			if isPublicFlag(flag.Key) {
				publicOnly = append(publicOnly, flag)
			}
		}

		result.Flags = publicOnly
	}

	writeResponse(result, b.logger, w)
}

func (b *APIBuilder) handleEvaluateFlag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	flagKey := vars["flagKey"]
	if flagKey == "" {
		http.Error(w, "flagKey parameter is required", http.StatusBadRequest)
		return
	}

	// TODO: replace with identity check
	isAuthedUser := false
	publicFlag := isPublicFlag(flagKey)

	if !isAuthedUser && !publicFlag {
		http.Error(w, "unauthorized to evaluate flag", http.StatusUnauthorized)
		return
	}

	result, err := b.openFeature.EvalFlagWithStaticProvider(r.Context(), flagKey)
	if err != nil {
		http.Error(w, "failed to evaluate flag", http.StatusInternalServerError)
		return
	}

	writeResponse(result, b.logger, w)
}

func (b *APIBuilder) handleProxyRequest(w http.ResponseWriter, r *http.Request) {
	proxyPath := r.URL.Path
	if proxyPath == "" {
		errhttp.Write(r.Context(), fmt.Errorf("proxy path is required"), w)
		return
	}

	if b.cfg.OpenFeature.URL == nil {
		errhttp.Write(r.Context(), fmt.Errorf("OpenFeature provider URL is not set"), w)
		return
	}

	director := func(req *http.Request) {
		req.URL.Scheme = b.cfg.OpenFeature.URL.Scheme
		req.URL.Host = b.cfg.OpenFeature.URL.Host
		req.URL.Path = proxyPath
	}

	b.logger.Debug("Proxying request to Open Feature provider", "path", proxyPath)
	proxy := proxyutil.NewReverseProxy(b.logger, director)
	proxy.ServeHTTP(w, r)
}

func writeResponse(result any, logger log.Logger, w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(result); err != nil {
		logger.Error("Failed to encode flag evaluation result", "error", err)
	}
}

// TODO: public can be a property in pkg/services/featuremgmt/registry.go
var publicFlags = map[string]bool{
	"correlations":              true,
	"publicDashboardsScene":     true,
	"lokiExperimentalStreaming": true,
}

func isPublicFlag(flagKey string) bool {
	_, exists := publicFlags[flagKey]
	return exists
}
