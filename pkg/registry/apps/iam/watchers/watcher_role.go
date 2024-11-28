package watchers

import (
	"context"
	"fmt"

	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
	"k8s.io/klog/v2"

	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
	"github.com/grafana/grafana/pkg/services/authz/zanzana"
	"github.com/grafana/grafana/pkg/services/authz/zanzana/common"

	authzextv1 "github.com/grafana/grafana/pkg/services/authz/proto/v1"
)

var _ operator.ResourceWatcher = &RoleWatcher{}

type RoleWatcher struct {
	c   zanzana.Client
	log klog.Logger
}

func NewRoleWatcher(c zanzana.Client) *RoleWatcher {
	return &RoleWatcher{
		c:   c,
		log: klog.NewKlogr().WithName("role_watcher"),
	}
}

func (s *RoleWatcher) Add(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Playlist (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	writes := make([]*authzextv1.TupleKey, 0, len(object.Spec.Rules))
	for _, r := range object.Spec.Rules {
		writes = append(writes, ruleToTuple(object.GetName(), r))
	}

	return s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: obj.GetNamespace(),
		Writes: &authzextv1.WriteRequestWrites{
			TupleKeys: writes,
		},
	})
}

func (s *RoleWatcher) Update(ctx context.Context, oldObj resource.Object, rNew resource.Object) error {
	oldObject, ok := oldObj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			oldObj.GetStaticMetadata().Name, oldObj.GetStaticMetadata().Namespace, oldObj.GetStaticMetadata().Kind)
	}

	_, ok = rNew.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *playlist.Playlist (name=%s, namespace=%s, kind=%s)",
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

func ruleToTuple(roleName string, rule iamv0.RoleRule) *authzextv1.TupleKey {
	subject := zanzana.NewTupleEntry(zanzana.TypeRole, roleName, zanzana.RelationAssignee)

	if rule.Name != nil {
		return zanzana.ToAuthzExtTupleKey(common.NewResourceTuple(subject, rule.Verb, rule.Group, rule.Resource, *rule.Name))
	}

	return zanzana.ToAuthzExtTupleKey(common.NewNamespaceResourceTuple(subject, rule.Verb, rule.Group, rule.Resource))
}
