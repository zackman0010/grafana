package acimpl

import (
	"context"
	"errors"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/infra/metrics"
	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

var tracer = otel.Tracer("github.com/grafana/grafana/pkg/services/accesscontrol/acimpl")

var _ accesscontrol.AccessControl = new(AccessControl)

func ProvideAccessControl(features featuremgmt.FeatureToggles) *AccessControl {
	logger := log.New("accesscontrol")

	return &AccessControl{
		features,
		logger,
		accesscontrol.NewResolvers(logger),
	}
}

func ProvideAccessControlTest() *AccessControl {
	return ProvideAccessControl(featuremgmt.WithFeatures())
}

type AccessControl struct {
	features  featuremgmt.FeatureToggles
	log       log.Logger
	resolvers accesscontrol.Resolvers
}

func (a *AccessControl) Evaluate(ctx context.Context, user identity.Requester, evaluator accesscontrol.Evaluator) (bool, error) {
	ctx, span := tracer.Start(ctx, "accesscontrol.acimpl.Evaluate", trace.WithAttributes(attribute.String("evaluator", evaluator.String())))
	defer span.End()

	timer := prometheus.NewTimer(metrics.MAccessEvaluationsSummary)
	defer timer.ObserveDuration()
	metrics.MAccessEvaluationCount.Inc()

	if user == nil || user.IsNil() {
		a.log.Warn("No entity set for access control evaluation")
		span.SetStatus(codes.Error, "user is nil")
		return false, nil
	}

	span.SetAttributes(
		attribute.String("user.uid", user.GetUID()),
		attribute.Int64("user.org_id", user.GetOrgID()),
	)

	permissions := user.GetPermissions()
	if user.GetOrgID() == accesscontrol.NoOrgID {
		permissions = user.GetGlobalPermissions()
	}
	if len(permissions) == 0 {
		a.debug(ctx, user, "No permissions set", evaluator)
		span.SetAttributes(attribute.Bool("accesscontrol.result", false))
		span.SetStatus(codes.Ok, "no permissions")
		return false, nil
	}

	a.debug(ctx, user, "Evaluating permissions", evaluator)
	if evaluator.Evaluate(ctx, permissions) {
		span.SetAttributes(attribute.Bool("accesscontrol.result", true))
		span.SetStatus(codes.Ok, "")
		return true, nil
	}

	resolvedEvaluator, err := evaluator.MutateScopes(ctx, a.resolvers.GetScopeAttributeMutator(user.GetOrgID()))
	if err != nil {
		if errors.Is(err, accesscontrol.ErrResolverNotFound) {
			span.SetAttributes(attribute.Bool("accesscontrol.result", false))
			span.SetStatus(codes.Ok, "resolver not found")
			return false, nil
		}
		span.SetAttributes(attribute.Bool("accesscontrol.result", false))
		return false, tracing.Error(span, err)
	}

	a.debug(ctx, user, "Evaluating resolved permissions", resolvedEvaluator)
	result := resolvedEvaluator.Evaluate(ctx, permissions)
	span.SetAttributes(
		attribute.Bool("accesscontrol.result", result),
		attribute.String("accesscontrol.resolvedEvaluator", resolvedEvaluator.String()),
	)
	span.SetStatus(codes.Ok, "")
	return result, nil
}

func (a *AccessControl) RegisterScopeAttributeResolver(prefix string, resolver accesscontrol.ScopeAttributeResolver) {
	a.resolvers.AddScopeAttributeResolver(prefix, resolver)
}

func (a *AccessControl) WithoutResolvers() accesscontrol.AccessControl {
	return &AccessControl{
		features:  a.features,
		log:       a.log,
		resolvers: accesscontrol.NewResolvers(a.log),
	}
}

func (a *AccessControl) debug(ctx context.Context, ident identity.Requester, msg string, eval accesscontrol.Evaluator) {
	a.log.FromContext(ctx).Debug(msg, "id", ident.GetID(), "orgID", ident.GetOrgID(), "permissions", eval.GoString())
}
