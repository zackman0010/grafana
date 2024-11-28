package app

import (
	"context"
	"fmt"

	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
	"k8s.io/klog/v2"

	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
)

var _ operator.ResourceWatcher = &RoleWatcher{}

type RoleWatcher struct {
	log klog.Logger
}

func NewRoleWatcher() *RoleWatcher {
	return &RoleWatcher{
		log: klog.NewKlogr().WithName("role_watcher"),
	}
}

func (s *RoleWatcher) Add(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Playlist (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Created resource", "name", object.GetStaticMetadata().Identifier().Name)
	return nil
}

func (s *RoleWatcher) Update(ctx context.Context, oldObj resource.Object, rNew resource.Object) error {
	oldObject, ok := oldObj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			oldObj.GetStaticMetadata().Name, oldObj.GetStaticMetadata().Namespace, oldObj.GetStaticMetadata().Kind)
	}

	_, ok = rNew.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			rNew.GetStaticMetadata().Name, rNew.GetStaticMetadata().Namespace, rNew.GetStaticMetadata().Kind)
	}

	s.log.Info("Updated resource", "name", oldObject.GetStaticMetadata().Identifier().Name)
	return nil
}

func (s *RoleWatcher) Delete(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Deleted resource", "name", object.GetStaticMetadata().Identifier().Name)

	return nil
}

func (s *RoleWatcher) Sync(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Possible resource update", "name", object.GetStaticMetadata().Identifier().Name)
	return nil
}
