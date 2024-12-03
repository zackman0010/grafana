package watchers

import (
	"context"
	"fmt"

	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
	"k8s.io/klog/v2"

	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
	authzextv1 "github.com/grafana/grafana/pkg/services/authz/proto/v1"
	"github.com/grafana/grafana/pkg/services/authz/zanzana"
)

var _ operator.ResourceWatcher = &RoleBindingWatcher{}

type RoleBindingWatcher struct {
	c   zanzana.Client
	log klog.Logger
}

func NewRoleBindingWatcher(c zanzana.Client) *RoleBindingWatcher {
	return &RoleBindingWatcher{
		c:   c,
		log: klog.NewKlogr().WithName("watcher_role_binding"),
	}
}

func (s *RoleBindingWatcher) Add(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.RoleBinding (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Create resource", "name", obj.GetStaticMetadata().Identifier().Name)

	writes := make([]*authzextv1.TupleKey, 0, len(object.Spec.Subjects))
	for _, subject := range object.Spec.Subjects {
		writes = append(writes, newRoleBindingTuple(object.Spec.RoleRef.Name, subject))
	}

	err := s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: object.GetNamespace(),
		Writes: &authzextv1.WriteRequestWrites{
			TupleKeys: writes,
		},
	})

	if err != nil {
		s.log.Error(err, "Add: Tried to write role bindings to zanzana")
		return fmt.Errorf("add: tried to write role binding to zanzana: %w", err)
	}

	return nil
}

func (s *RoleBindingWatcher) Update(ctx context.Context, oldObj resource.Object, rNew resource.Object) error {
	oldObject, ok := oldObj.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.RoleBinding (name=%s, namespace=%s, kind=%s)",
			oldObj.GetStaticMetadata().Name, oldObj.GetStaticMetadata().Namespace, oldObj.GetStaticMetadata().Kind)
	}

	newObject, ok := rNew.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.Role (name=%s, namespace=%s, kind=%s)",
			rNew.GetStaticMetadata().Name, rNew.GetStaticMetadata().Namespace, rNew.GetStaticMetadata().Kind)
	}

	s.log.Info("Update resource", "name", oldObj.GetStaticMetadata().Identifier().Name)

	// FIXME: don't be this lazy
	deletes := make([]*authzextv1.TupleKeyWithoutCondition, 0, len(oldObject.Spec.Subjects))
	for _, subject := range oldObject.Spec.Subjects {
		deletes = append(deletes, newRoleBindingTupleWithoutCondition(oldObject.Spec.RoleRef.Name, subject))
	}

	err := s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: newObject.GetNamespace(),
		Deletes: &authzextv1.WriteRequestDeletes{
			TupleKeys: deletes,
		},
	})

	if err != nil {
		s.log.Error(err, "Update: Tried to delete role bindings from zanzana")
		return fmt.Errorf("update: tried to delete role bindings from zanzana: %w", err)
	}

	writes := make([]*authzextv1.TupleKey, 0, len(newObject.Spec.Subjects))
	for _, subject := range newObject.Spec.Subjects {
		writes = append(writes, newRoleBindingTuple(newObject.Spec.RoleRef.Name, subject))
	}

	err = s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: newObject.GetNamespace(),
		Writes: &authzextv1.WriteRequestWrites{
			TupleKeys: writes,
		},
	})

	if err != nil {
		s.log.Error(err, "Update: Tried to write role bindings from zanzana")
		return fmt.Errorf("update: tried to write role bindings from zanzana: %w", err)
	}

	return nil
}

func (s *RoleBindingWatcher) Delete(ctx context.Context, obj resource.Object) error {
	object, ok := obj.(*iamv0.RoleBinding)
	if !ok {
		return fmt.Errorf("provided object is not of type *iamv0.RoleBinding (name=%s, namespace=%s, kind=%s)",
			obj.GetStaticMetadata().Name, obj.GetStaticMetadata().Namespace, obj.GetStaticMetadata().Kind)
	}

	s.log.Info("Delete resource", "name", obj.GetStaticMetadata().Identifier().Name)

	// FIXME: don't be this lazy
	deletes := make([]*authzextv1.TupleKeyWithoutCondition, 0, len(object.Spec.Subjects))
	for _, subject := range object.Spec.Subjects {
		deletes = append(deletes, newRoleBindingTupleWithoutCondition(object.Spec.RoleRef.Name, subject))
	}

	err := s.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: object.GetNamespace(),
		Deletes: &authzextv1.WriteRequestDeletes{
			TupleKeys: deletes,
		},
	})
	if err != nil {
		s.log.Error(err, "Delete: Tried to delete role bindings from zanzana")
		return fmt.Errorf("delete: tried to delete role bindings from zanzana: %w", err)
	}

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

func newRoleBindingTuple(roleName string, subject iamv0.RoleBindingSubject) *authzextv1.TupleKey {
	user := zanzana.NewTupleEntry(string(subject.Type), subject.Name, "")
	if subject.Type == iamv0.RoleBindingSubjectTypeTeam {
		user = zanzana.NewTupleEntry(string(subject.Type), subject.Name, zanzana.RelationTeamMember)
	}

	return &authzextv1.TupleKey{
		User:     user,
		Relation: zanzana.RelationAssignee,
		Object:   zanzana.NewTupleEntry(zanzana.TypeRole, roleName, ""),
	}
}

func newRoleBindingTupleWithoutCondition(roleName string, subject iamv0.RoleBindingSubject) *authzextv1.TupleKeyWithoutCondition {
	user := zanzana.NewTupleEntry(string(subject.Type), subject.Name, "")
	if subject.Type == iamv0.RoleBindingSubjectTypeTeam {
		user = zanzana.NewTupleEntry(string(subject.Type), subject.Name, zanzana.RelationTeamMember)
	}

	return &authzextv1.TupleKeyWithoutCondition{
		User:     user,
		Relation: zanzana.RelationAssignee,
		Object:   zanzana.NewTupleEntry(zanzana.TypeRole, roleName, ""),
	}
}
