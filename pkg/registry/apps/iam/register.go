package iam

import (
	"github.com/grafana/grafana-app-sdk/app"
	"github.com/grafana/grafana-app-sdk/k8s"
	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/simple"

	"github.com/grafana/grafana/apps/iam/pkg/apis"
	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"
	iamapp "github.com/grafana/grafana/apps/iam/pkg/app"
	"github.com/grafana/grafana/pkg/registry/apps/iam/watchers"
	"github.com/grafana/grafana/pkg/services/apiserver/builder/runner"
	"github.com/grafana/grafana/pkg/services/authz/zanzana"
	"github.com/grafana/grafana/pkg/setting"
)

type IAMAppProvider struct {
	app.Provider
	cfg *setting.Cfg
}

func RegisterApp(
	cfg *setting.Cfg,
	c zanzana.Client,
) *IAMAppProvider {
	provider := &IAMAppProvider{
		cfg: cfg,
	}
	appCfg := &runner.AppBuilderConfig{
		OpenAPIDefGetter: iamv0.GetOpenAPIDefinitions,
		ManagedKinds:     iamapp.GetKinds(),
		CustomConfig: any(&iamapp.IAMConfig{
			RoleWatcher:        watchers.NewRoleWatcher(c),
			RoleBindingWatcher: watchers.NewRoleBindingWatcher(c),
			TempRoleBindingReconcilerFactory: func(cfg app.Config) operator.Reconciler {
				reg := k8s.NewClientRegistry(cfg.KubeConfig, k8s.DefaultClientConfig())
				rc, _ := reg.ClientFor(iamv0.TempRoleBindingKind())
				return watchers.NewTimedRoleBindingReconciler(c, rc)
			},
		}),
	}
	provider.Provider = simple.NewAppProvider(apis.LocalManifest(), appCfg, iamapp.New)
	return provider
}
