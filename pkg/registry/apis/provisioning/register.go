package provisioning

import (
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apiserver/pkg/authorization/authorizer"
	"k8s.io/apiserver/pkg/registry/generic"
	"k8s.io/apiserver/pkg/registry/rest"
	genericapiserver "k8s.io/apiserver/pkg/server"
	"k8s.io/kube-openapi/pkg/common"

	provisioning "github.com/grafana/grafana/pkg/apis/provisioning/v0alpha1"
	grafanaregistry "github.com/grafana/grafana/pkg/apiserver/registry/generic"
	grafanarest "github.com/grafana/grafana/pkg/apiserver/rest"
	"github.com/grafana/grafana/pkg/services/apiserver/builder"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

var _ builder.APIGroupBuilder = (*ProvisioningAPIBuilder)(nil)

// This is used just so wire has something unique to return
type ProvisioningAPIBuilder struct{}

func NewProvisioningAPIBuilder() *ProvisioningAPIBuilder {
	return &ProvisioningAPIBuilder{}
}

func RegisterAPIService(features featuremgmt.FeatureToggles, apiregistration builder.APIRegistrar) *ProvisioningAPIBuilder {
	if !features.IsEnabledGlobally(featuremgmt.FlagGrafanaAPIServerWithExperimentalAPIs) {
		return nil // skip registration unless opting into experimental apis
	}
	builder := NewProvisioningAPIBuilder()
	apiregistration.RegisterAPI(builder)
	return builder
}

func (b *ProvisioningAPIBuilder) GetAuthorizer() authorizer.Authorizer {
	return nil // default authorizer is fine
}

func (b *ProvisioningAPIBuilder) GetGroupVersion() schema.GroupVersion {
	return provisioning.SchemeGroupVersion
}

func (b *ProvisioningAPIBuilder) InstallSchema(scheme *runtime.Scheme) error {
	err := provisioning.AddToScheme(scheme)
	if err != nil {
		return err
	}

	// This is required for --server-side apply
	err = provisioning.AddKnownTypes(provisioning.InternalGroupVersion, scheme)
	if err != nil {
		return err
	}

	// Only one version right now
	return scheme.SetVersionPriority(provisioning.SchemeGroupVersion)
}

func (b *ProvisioningAPIBuilder) UpdateAPIGroupInfo(apiGroupInfo *genericapiserver.APIGroupInfo, scheme *runtime.Scheme, optsGetter generic.RESTOptionsGetter, _ grafanarest.DualWriteBuilder) (err error) {
	storage := map[string]rest.Storage{}

	resourceInfo := provisioning.FileOriginResourceInfo
	storage[resourceInfo.StoragePath()], err = grafanaregistry.NewRegistryStore(scheme, resourceInfo, optsGetter)
	if err != nil {
		return err
	}

	resourceInfo = provisioning.GithubOriginResourceInfo
	storage[resourceInfo.StoragePath()], err = grafanaregistry.NewRegistryStore(scheme, resourceInfo, optsGetter)
	if err != nil {
		return err
	}

	apiGroupInfo.VersionedResourcesStorageMap[provisioning.VERSION] = storage
	return nil
}

func (b *ProvisioningAPIBuilder) GetOpenAPIDefinitions() common.GetOpenAPIDefinitions {
	return provisioning.GetOpenAPIDefinitions
}

// Register additional routes with the server
func (b *ProvisioningAPIBuilder) GetAPIRoutes() *builder.APIRoutes {
	return nil
}
