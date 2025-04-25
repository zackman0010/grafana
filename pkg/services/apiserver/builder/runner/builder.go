package runner

import (
	"strings"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apiserver/pkg/authorization/authorizer"
	"k8s.io/apiserver/pkg/registry/rest"
	genericapiserver "k8s.io/apiserver/pkg/server"
	"k8s.io/kube-openapi/pkg/common"

	"github.com/grafana/grafana-app-sdk/app"
	"github.com/grafana/grafana-app-sdk/resource"

	"github.com/grafana/grafana/pkg/apimachinery/utils"
	grafanaregistry "github.com/grafana/grafana/pkg/apiserver/registry/generic"
	grafanarest "github.com/grafana/grafana/pkg/apiserver/rest"
	"github.com/grafana/grafana/pkg/services/apiserver/builder"
)

var _ AppBuilder = (*appBuilder)(nil)

type LegacyStorageGetter func(schema.GroupVersionResource) grafanarest.Storage

type AppBuilderConfig struct {
	Authorizer          authorizer.Authorizer
	LegacyStorageGetter LegacyStorageGetter
	OpenAPIDefGetter    common.GetOpenAPIDefinitions
	ManagedKinds        map[schema.GroupVersion][]resource.Kind
	CustomConfig        any

	groupVersion schema.GroupVersion
}

type AppBuilder interface {
	builder.APIGroupBuilder
	builder.APIGroupMutation
	builder.APIGroupValidation
	SetApp(app app.App)
}

type appBuilder struct {
	app    app.App
	config AppBuilderConfig
}

func NewAppBuilder(appBuilderConfig AppBuilderConfig) (*appBuilder, error) {
	return &appBuilder{
		config: appBuilderConfig,
	}, nil
}

func (b *appBuilder) SetApp(app app.App) {
	b.app = app
}

// GetGroupVersion implements APIGroupBuilder.GetGroupVersion
func (b *appBuilder) GetGroupVersion() schema.GroupVersion {
	return b.config.groupVersion
}

// InstallSchema implements APIGroupBuilder.InstallSchema
func (b *appBuilder) InstallSchema(scheme *runtime.Scheme) error {
	gv := b.GetGroupVersion()
	// Make a map of GroupKind to a single resource.Kind to use as __internal
	internalKinds := make(map[schema.GroupKind]resource.Kind)
	for _, kinds := range b.config.ManagedKinds {
		for _, kind := range kinds {
			cur, ok := internalKinds[kind.GroupVersionKind().GroupKind()]
			if !ok {
				internalKinds[kind.GroupVersionKind().GroupKind()] = kind
				continue
			}

			// Compare versions, set the latest to be the correct one in the map
			// string compare for now at least
			if strings.Compare(kind.Version(), cur.Version()) > 0 {
				internalKinds[kind.GroupVersionKind().GroupKind()] = kind
			}
		}
	}
	for _, kinds := range b.config.ManagedKinds {
		for _, kind := range kinds {
			scheme.AddKnownTypeWithName(gv.WithKind(kind.Kind()), kind.ZeroValue())
			scheme.AddKnownTypeWithName(gv.WithKind(kind.Kind()+"List"), kind.ZeroListValue())
			// Need a way to determine if conversion is supported--once we have that, we can register conversion
			// in the scheme using b.app.Convert to handle the conversion.
		}
	}
	for _, kind := range internalKinds {
		// Link this group to the internal representation.
		// This is used for server-side-apply (PATCH), and avoids the error:
		// "no kind is registered for the type"
		gvInternal := schema.GroupVersion{
			Group:   gv.Group,
			Version: runtime.APIVersionInternal,
		}
		scheme.AddKnownTypeWithName(gvInternal.WithKind(kind.Kind()), kind.ZeroValue())
		scheme.AddKnownTypeWithName(gvInternal.WithKind(kind.Kind()+"List"), kind.ZeroListValue())
	}
	return scheme.SetVersionPriority(gv)
}

// UpdateAPIGroupInfo implements APIGroupBuilder.UpdateAPIGroupInfo
func (b *appBuilder) UpdateAPIGroupInfo(apiGroupInfo *genericapiserver.APIGroupInfo, opts builder.APIGroupOptions) error {
	for _, kinds := range b.config.ManagedKinds {
		for _, kind := range kinds {
			version := kind.GroupVersionKind().Version
			if _, ok := apiGroupInfo.VersionedResourcesStorageMap[version]; !ok {
				apiGroupInfo.VersionedResourcesStorageMap[version] = make(map[string]rest.Storage)
			}
			resourceInfo := KindToResourceInfo(kind)
			store, err := b.getStorage(resourceInfo, opts)
			if err != nil {
				return err
			}
			apiGroupInfo.VersionedResourcesStorageMap[version][resourceInfo.StoragePath()] = store
		}
	}
	return nil
}

func (b *appBuilder) getStorage(resourceInfo utils.ResourceInfo, opts builder.APIGroupOptions) (grafanarest.Storage, error) {
	store, err := grafanaregistry.NewRegistryStore(opts.Scheme, resourceInfo, opts.OptsGetter)
	if err != nil {
		return nil, err
	}
	if b.config.LegacyStorageGetter != nil && opts.DualWriteBuilder != nil {
		if legacyStorage := b.config.LegacyStorageGetter(resourceInfo.GroupVersionResource()); legacyStorage != nil {
			return opts.DualWriteBuilder(resourceInfo.GroupResource(), legacyStorage, store)
		}
	}
	return store, nil
}

// GetOpenAPIDefinitions implements APIGroupBuilder.GetOpenAPIDefinitions
func (b *appBuilder) GetOpenAPIDefinitions() common.GetOpenAPIDefinitions {
	return b.config.OpenAPIDefGetter
}

// GetAuthorizer implements APIGroupBuilder.GetAuthorizer
func (b *appBuilder) GetAuthorizer() authorizer.Authorizer {
	return b.config.Authorizer
}
