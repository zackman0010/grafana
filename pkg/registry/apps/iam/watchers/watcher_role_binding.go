package watchers

import (
	"context"
	"fmt"

	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
	"k8s.io/klog/v2"

	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
	"github.com/grafana/grafana/pkg/services/authz/zanzana"
)

var _ operator.ResourceWatcher = &RoleBindingWatcher{}

type RoleBindingWatcher struct {
	c   zanzana.Client
	log klog.Logger
}

func NewRoleBindingWatcher(c zanzana.Client) *RoleWatcher {
	return &RoleWatcher{
		c:   c,
		log: klog.NewKlogr().WithName("watcher_role_binding"),
	}
}

func (s *RoleBindingWatcher) Add(ctx context.Context, obj resource.Object) error {
	_, ok := obj.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.RoleBinding (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Create resource", "name", obj.GetStaticMetadata().Identifier().Name)

	return nil
}

func (s *RoleBindingWatcher) Update(ctx context.Context, oldObj resource.Object, rNew resource.Object) error {
	_, ok := oldObj.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.RoleBinding (name=%s, namespace=%s, kind=%s)",
			oldObj.GetStaticMetadata().Name, oldObj.GetStaticMetadata().Namespace, oldObj.GetStaticMetadata().Kind)
	}

	_, ok = rNew.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			rNew.GetStaticMetadata().Name, rNew.GetStaticMetadata().Namespace, rNew.GetStaticMetadata().Kind)
	}

	s.log.Info("Update resource", "name", oldObj.GetStaticMetadata().Identifier().Name)

	return nil
}

func (s *RoleBindingWatcher) Delete(ctx context.Context, obj resource.Object) error {
	_, ok := obj.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.RoleBinding (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Delete resource", "name", obj.GetStaticMetadata().Identifier().Name)

	return nil
}

// Investigate how this one works..
func (s *RoleBindingWatcher) Sync(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.RoleBinding (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Possible resource update", "name", object.GetStaticMetadata().Identifier().Name)
	return nil
}
