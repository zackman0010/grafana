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
		log: klog.NewKlogr().WithName("watcher_role"),
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

	s.log.Info("Add resource", "name", obj.GetStaticMetadata().Identifier().Name)

	err := s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: obj.GetNamespace(),
		Writes: &authzextv1.WriteRequestWrites{
			TupleKeys: writes,
		},
	})

	if err != nil {
		s.log.Error(err, "Add: Tried to write role rules to zanzana")
		return fmt.Errorf("add: tried to write role rules to zanzana: %w", err)
	}

	return nil
}

func (s *RoleWatcher) Update(ctx context.Context, oldObj resource.Object, rNew resource.Object) error {
	oldObject, ok := oldObj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			oldObj.GetStaticMetadata().Name, oldObj.GetStaticMetadata().Namespace, oldObj.GetStaticMetadata().Kind)
	}

	newObject, ok := rNew.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			rNew.GetStaticMetadata().Name, rNew.GetStaticMetadata().Namespace, rNew.GetStaticMetadata().Kind)
	}

	s.log.Info("Update resource", "name", oldObj.GetStaticMetadata().Identifier().Name)

	// FIXME: don't be this lazy
	deletes := make([]*authzextv1.TupleKeyWithoutCondition, 0, len(oldObject.Spec.Rules))
	for _, rule := range oldObject.Spec.Rules {
		deletes = append(deletes, ruleToTupleWithoutCondition(oldObject.GetName(), rule))
	}

	err := s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: newObject.GetNamespace(),
		Deletes: &authzextv1.WriteRequestDeletes{
			TupleKeys: deletes,
		},
	})

	if err != nil {
		s.log.Error(err, "Update: Tried to delete role rules to zanzana")
		return fmt.Errorf("update: tried to delete role rules to zanzana: %w", err)
	}

	writes := make([]*authzextv1.TupleKey, 0, len(newObject.Spec.Rules))
	for _, rule := range newObject.Spec.Rules {
		writes = append(writes, ruleToTuple(oldObject.GetName(), rule))
	}

	err = s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: newObject.GetNamespace(),
		Writes: &authzextv1.WriteRequestWrites{
			TupleKeys: writes,
		},
	})

	if err != nil {
		s.log.Error(err, "Update: Tried to write role rules to zanzana")
		return fmt.Errorf("update: tried to write role rules to zanzana: %w", err)
	}

	return nil
}

func (s *RoleWatcher) Delete(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Delete resource", "name", object.GetStaticMetadata().Identifier().Name)

	deletes := make([]*authzextv1.TupleKeyWithoutCondition, 0, len(object.Spec.Rules))
	for _, rule := range object.Spec.Rules {
		deletes = append(deletes, ruleToTupleWithoutCondition(object.GetName(), rule))
	}

	err := s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: object.GetNamespace(),
		Deletes: &authzextv1.WriteRequestDeletes{
			TupleKeys: deletes,
		},
	})

	if err != nil {
		s.log.Error(err, "Delete: Tried to delete role rules from zanzana")
		return fmt.Errorf("delete: tried to delete role rules from zanzana: %w", err)

	}

	return nil
}

// Investigate how this one works..
func (s *RoleWatcher) Sync(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.Role)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Sync: possible update", "name", object.GetStaticMetadata().Identifier().Name)
	return nil
}

func ruleToTuple(roleName string, rule iamv0.RoleRule) *authzextv1.TupleKey {
	subject := zanzana.NewTupleEntry(zanzana.TypeRole, roleName, zanzana.RelationAssignee)

	if rule.Name != nil {
		return zanzana.ToAuthzExtTupleKey(common.NewResourceTuple(subject, rule.Verb, rule.Group, rule.Resource, *rule.Name))
	}

	return zanzana.ToAuthzExtTupleKey(common.NewNamespaceResourceTuple(subject, rule.Verb, rule.Group, rule.Resource))
}

// FIXME: cleanup this mess
func ruleToTupleWithoutCondition(roleName string, rule iamv0.RoleRule) *authzextv1.TupleKeyWithoutCondition {
	subject := zanzana.NewTupleEntry(zanzana.TypeRole, roleName, zanzana.RelationAssignee)

	if rule.Name != nil {
		tuple := common.NewResourceTuple(subject, rule.Verb, rule.Group, rule.Resource, *rule.Name)
		return zanzana.ToAuthzExtTupleKeyWithoutCondition(common.TupleKeyToTupleWithoutCondition(tuple))
	}

	tuple := common.NewNamespaceResourceTuple(subject, rule.Verb, rule.Group, rule.Resource)
	return zanzana.ToAuthzExtTupleKeyWithoutCondition(common.TupleKeyToTupleWithoutCondition(tuple))
}

func ruleToReadTuple(roleName string, rule iamv0.RoleRule) *authzextv1.ReadRequestTupleKey {
	var object string
	if rule.Name != nil {
		object = common.NewResourceIdent(rule.Group, rule.Resource, *rule.Name)
	} else {
		object = common.NewNamespaceResourceIdent(rule.Group, rule.Resource)
	}

	return &authzextv1.ReadRequestTupleKey{
		User:     zanzana.NewTupleEntry(zanzana.TypeRole, roleName, zanzana.RelationAssignee),
		Relation: rule.Verb,
		Object:   object,
	}
}
