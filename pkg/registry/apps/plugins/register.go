package plugins

import (
	"github.com/grafana/grafana-app-sdk/app"
	"github.com/grafana/grafana-app-sdk/simple"

	"github.com/grafana/grafana/apps/plugins/pkg/apis"
	pluginsv0alpha1 "github.com/grafana/grafana/apps/plugins/pkg/apis/plugins/v0alpha1"
	pluginsapp "github.com/grafana/grafana/apps/plugins/pkg/app"
	"github.com/grafana/grafana/pkg/services/apiserver/builder/runner"
	"github.com/grafana/grafana/pkg/setting"
)

type AppProvider struct {
	app.Provider

	ready bool
}

func RegisterApp(_ *setting.Cfg) *AppProvider {
	provider := &AppProvider{}
	appCfg := &runner.AppBuilderConfig{
		OpenAPIDefGetter: pluginsv0alpha1.GetOpenAPIDefinitions,
		ManagedKinds:     pluginsapp.GetKinds(),
		Authorizer:       pluginsapp.GetAuthorizer(),
	}
	provider.Provider = simple.NewAppProvider(apis.LocalManifest(), appCfg, pluginsapp.New)
	return provider
}

func (a *AppProvider) NewApp(cfg app.Config) (app.App, error) {
	newApp, err := a.Provider.NewApp(cfg)
	a.ready = true
	return newApp, err
}

func (a *AppProvider) IsReady() bool {
	return a.ready
}
