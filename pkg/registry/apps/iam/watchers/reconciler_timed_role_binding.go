package watchers

import (
	"context"
	"fmt"
	"time"

	"k8s.io/klog/v2"

	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
	"github.com/grafana/grafana/pkg/services/authz/zanzana"
)

var _ operator.Reconciler = (*TimedRoleBindingReconciler)(nil)

func NewTimedRoleBindingReconciler(zc zanzana.Client, tc, bc resource.Client) *TimedRoleBindingReconciler {
	return &TimedRoleBindingReconciler{
		zc:  zc,
		tc:  tc,
		bc:  bc,
		log: klog.NewKlogr().WithName("reconciler_timed_role_binding"),
	}

}

type TimedRoleBindingReconciler struct {
	zc  zanzana.Client
	tc  resource.Client
	bc  resource.Client
	log klog.Logger
}

// Reconcile implements operator.Reconciler.
func (t *TimedRoleBindingReconciler) Reconcile(ctx context.Context, req operator.ReconcileRequest) (operator.ReconcileResult, error) {
	binding, ok := req.Object.(*iamv0.TempRoleBinding)
	if !ok {
		return operator.ReconcileResult{}, fmt.Errorf("provided object is not of type *iamv0.TempRoleBinding (name=%s, namespace=%s, kind=%s)",
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
	ident := binding.GetStaticMetadata().Identifier()
	_, err := t.bc.Create(ctx, resource.Identifier{
		Namespace: ident.Namespace,
		Name:      "temp-" + ident.Name,
	}, &iamv0.RoleBinding{
		Spec: iamv0.RoleBindingSpec{
			RoleRef: iamv0.RoleBindingRoleRef{
				Name: binding.Spec.RoleRef.Name,
			},
			Subjects: tempSubjectsToSubjects(binding.Spec.Subjects),
		},
	}, resource.CreateOptions{})

	if err != nil {
		return operator.ReconcileResult{}, err
	}

	now := time.Now()
	binding.TempRoleBindingStatus.Activated = &now

	if _, err := t.tc.Update(ctx, ident, binding, resource.UpdateOptions{}); err != nil {
		return operator.ReconcileResult{}, err
	}

	ttl := time.Duration(binding.Spec.TtlSeconds) * time.Second
	return operator.ReconcileResult{RequeueAfter: &ttl}, err
}

func (t *TimedRoleBindingReconciler) removeRoleBinding(ctx context.Context, binding *iamv0.TempRoleBinding) (operator.ReconcileResult, error) {
	ident := binding.GetStaticMetadata().Identifier()
	err := t.bc.Delete(ctx, resource.Identifier{
		Namespace: ident.Namespace,
		Name:      "temp-" + ident.Name,
	})

	if err != nil {
		return operator.ReconcileResult{}, fmt.Errorf("delete: failed to delete role binding: %w", err)
	}

	return operator.ReconcileResult{}, err
}
func tempSubjectsToSubjects(subjects []iamv0.TempRoleBindingSubject) []iamv0.RoleBindingSubject {
	out := make([]iamv0.RoleBindingSubject, 0, len(subjects))
	for _, s := range subjects {
		out = append(out, tempSubjectToSubject(s))
	}
	return out
}

func tempSubjectToSubject(subject iamv0.TempRoleBindingSubject) iamv0.RoleBindingSubject {
	return iamv0.RoleBindingSubject{
		Name: subject.Name,
		Type: iamv0.RoleBindingSubjectType(subject.Type),
	}
}
