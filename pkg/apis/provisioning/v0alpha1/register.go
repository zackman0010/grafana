package v0alpha1

import (
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/grafana/grafana/pkg/apimachinery/utils"
)

const (
	GROUP      = "provisioning.grafana.app"
	VERSION    = "v0alpha1"
	APIVERSION = GROUP + "/" + VERSION
)

var FileOriginResourceInfo = utils.NewResourceInfo(GROUP, VERSION,
	"fileorigins", "fileorigin", "FileOrigin",
	func() runtime.Object { return &FileOrigin{} },
	func() runtime.Object { return &FileOriginList{} },
	utils.TableColumns{
		Definition: []metav1.TableColumnDefinition{
			{Name: "Name", Type: "string", Format: "name"},
			{Name: "Created At", Type: "date"},
			{Name: "Title", Type: "string"},
			{Name: "Path", Type: "string"},
		},
		Reader: func(obj any) ([]interface{}, error) {
			m, ok := obj.(*FileOrigin)
			if !ok {
				return nil, fmt.Errorf("expected origin")
			}
			return []interface{}{
				m.Name,
				m.CreationTimestamp.UTC().Format(time.RFC3339),
				m.Spec.Title,
				m.Spec.Path,
			}, nil
		},
	}, // default table converter
)

var GithubOriginResourceInfo = utils.NewResourceInfo(GROUP, VERSION,
	"githuborigins", "githuborigin", "GithubOrigin",
	func() runtime.Object { return &GithubOrigin{} },
	func() runtime.Object { return &GithubOriginList{} },
	utils.TableColumns{
		Definition: []metav1.TableColumnDefinition{
			{Name: "Name", Type: "string", Format: "name"},
			{Name: "Created At", Type: "date"},
			{Name: "Title", Type: "string"},
			{Name: "Repo", Type: "string"},
		},
		Reader: func(obj any) ([]interface{}, error) {
			m, ok := obj.(*GithubOrigin)
			if !ok {
				return nil, fmt.Errorf("expected origin")
			}
			return []interface{}{
				m.Name,
				m.CreationTimestamp.UTC().Format(time.RFC3339),
				m.Spec.Title,
				m.Spec.Repo,
			}, nil
		},
	}, // default table converter
)

var (
	// SchemeGroupVersion is group version used to register these objects
	SchemeGroupVersion   = schema.GroupVersion{Group: GROUP, Version: VERSION}
	InternalGroupVersion = schema.GroupVersion{Group: GROUP, Version: runtime.APIVersionInternal}

	// SchemaBuilder is used by standard codegen
	SchemeBuilder      runtime.SchemeBuilder
	localSchemeBuilder = &SchemeBuilder
	AddToScheme        = localSchemeBuilder.AddToScheme
)

func init() {
	localSchemeBuilder.Register(func(s *runtime.Scheme) error {
		return AddKnownTypes(SchemeGroupVersion, s)
	})
}

// Adds the list of known types to the given scheme.
func AddKnownTypes(gv schema.GroupVersion, scheme *runtime.Scheme) error {
	scheme.AddKnownTypes(gv,
		&FileOrigin{},
		&FileOriginList{},
		&GithubOrigin{},
		&GithubOriginList{},
	)
	//metav1.AddToGroupVersion(scheme, gv)
	return nil
}

// Resource takes an unqualified resource and returns a Group qualified GroupResource
func Resource(resource string) schema.GroupResource {
	return SchemeGroupVersion.WithResource(resource).GroupResource()
}
