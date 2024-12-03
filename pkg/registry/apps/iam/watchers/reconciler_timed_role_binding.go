package watchers

import (
	"context"
	"fmt"
	"time"

	"k8s.io/klog/v2"

	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
	authzextv1 "github.com/grafana/grafana/pkg/services/authz/proto/v1"
	"github.com/grafana/grafana/pkg/services/authz/zanzana"
)

var _ operator.Reconciler = (*TimedRoleBindingReconciler)(nil)

func NewTimedRoleBindingReconciler(c zanzana.Client, rc resource.Client) *TimedRoleBindingReconciler {
	return &TimedRoleBindingReconciler{
		c:   c,
		rc:  rc,
		log: klog.NewKlogr().WithName("reconciler_timed_role_binding"),
	}

}

type TimedRoleBindingReconciler struct {
	c   zanzana.Client
	rc  resource.Client
	log klog.Logger
}

// Reconcile implements operator.Reconciler.
func (t *TimedRoleBindingReconciler) Reconcile(ctx context.Context, req operator.ReconcileRequest) (operator.ReconcileResult, error) {
	binding, ok := req.Object.(*iamv0.TempRoleBinding)
	if !ok {
		return operator.ReconcileResult{}, fmt.Errorf("provided object is not of type *iamv0.Playlist (name=%s, namespace=%s, kind=%s)",
			req.Object.GetStaticMetadata().Name, req.Object.GetStaticMetadata().Namespace, req.Object.GetStaticMetadata().Kind)
	}

	if req.Action == operator.ReconcileActionDeleted {
		if binding.TempRoleBindingStatus.Activated != nil {
			return t.removeRoleBinding(ctx, binding)
		}
		return operator.ReconcileResult{}, nil
	}

	if binding.TempRoleBindingStatus.Activated == nil {
		return t.addRoleBinding(ctx, binding)
	}

	ttl := time.Duration(binding.Spec.TtlSeconds) * time.Second
	since := time.Since(*binding.TempRoleBindingStatus.Activated)

	expires := ttl - since
	if expires <= 0 {
		return t.removeRoleBinding(ctx, binding)
	}

	return operator.ReconcileResult{RequeueAfter: &expires}, nil
}

func (t *TimedRoleBindingReconciler) addRoleBinding(ctx context.Context, binding *iamv0.TempRoleBinding) (operator.ReconcileResult, error) {
	writes := make([]*authzextv1.TupleKey, 0, len(binding.Spec.Subjects))
	for _, subject := range binding.Spec.Subjects {
		writes = append(writes, newRolebindingTuple(binding.Spec.RoleRef.Name, iamv0.RoleBindingSubject{
			Name: subject.Name,
			Type: iamv0.RoleBindingSubjectType(subject.Type),
		}))
	}

	err := t.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: binding.GetNamespace(),
		Writes: &authzextv1.WriteRequestWrites{
			TupleKeys: writes,
		},
	})

	if err != nil {
		t.log.Error(err, "Add: Tried to write role bindings to zanzana")
		return operator.ReconcileResult{}, fmt.Errorf("add: tried to write role binding to zanzana: %w", err)
	}

	now := time.Now()
	binding.TempRoleBindingStatus.Activated = &now
	_, err = t.rc.Update(
		ctx,
		binding.GetStaticMetadata().Identifier(),
		binding,
		resource.UpdateOptions{},
	)

	if err != nil {
		return operator.ReconcileResult{}, err
	}

	ttl := time.Duration(binding.Spec.TtlSeconds) * time.Second
	return operator.ReconcileResult{RequeueAfter: &ttl}, err
}

func (t *TimedRoleBindingReconciler) removeRoleBinding(ctx context.Context, binding *iamv0.TempRoleBinding) (operator.ReconcileResult, error) {
	// FIXME: don't be this lazy
	deletes := make([]*authzextv1.TupleKeyWithoutCondition, 0, len(binding.Spec.Subjects))
	for _, subject := range binding.Spec.Subjects {
		deletes = append(deletes, newRolebindingTupleWithoutCondition(binding.Spec.RoleRef.Name, iamv0.RoleBindingSubject{
			Name: subject.Name,
			Type: iamv0.RoleBindingSubjectType(subject.Type),
		}))
	}

	err := t.c.Write(ctx, &authzextv1.WriteRequest{
		Namespace: binding.GetNamespace(),
		Deletes: &authzextv1.WriteRequestDeletes{
			TupleKeys: deletes,
		},
	})
	if err != nil {
		t.log.Error(err, "Delete: Tried to delete role bindings from zanzana")
		return operator.ReconcileResult{}, fmt.Errorf("delete: tried to delete role bindings from zanzana: %w", err)
	}

	return operator.ReconcileResult{}, err
}
