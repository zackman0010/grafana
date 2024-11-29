package app

import (
	"context"
	"errors"

	"github.com/grafana/grafana-app-sdk/app"
	"github.com/grafana/grafana-app-sdk/operator"
	"github.com/grafana/grafana-app-sdk/resource"
	"github.com/grafana/grafana-app-sdk/simple"
	iamv0 "github.com/grafana/grafana/apps/iam/pkg/apis/iam2/v0alpha1"

	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/klog/v2"
)

type IAMConfig struct {
	RoleWatcher        operator.ResourceWatcher
	RoleBindingWatcher operator.ResourceWatcher
}

func New(cfg app.Config) (app.App, error) {
	iamCfg, ok := cfg.SpecificConfig.(*IAMConfig)
	if !ok {
		return nil, errors.New("unexpected config")
	}

	simpleConfig := simple.AppConfig{
		Name:       "iam2",
		KubeConfig: cfg.KubeConfig,
		InformerConfig: simple.AppInformerConfig{
			ErrorHandler: func(ctx context.Context, err error) {
				klog.ErrorS(err, "Informer processing error")
			},
		},
		ManagedKinds: []simple.AppManagedKind{
			{
				Kind:    iamv0.RoleBindingKind(),
				Watcher: iamCfg.RoleBindingWatcher,
			},
			{
				Kind:    iamv0.RoleKind(),
				Watcher: iamCfg.RoleWatcher,
			},
		},
	}

	a, err := simple.NewApp(simpleConfig)
	if err != nil {
		return nil, err
	}

	err = a.ValidateManifest(cfg.ManifestData)
	if err != nil {
		return nil, err
	}

	return a, nil
}

func GetKinds() map[schema.GroupVersion][]resource.Kind {
	// we share group and version for our current resources so this is fine
	gv := schema.GroupVersion{
		Group:   iamv0.RoleKind().Group(),
		Version: iamv0.RoleKind().Version(),
	}
	return map[schema.GroupVersion][]resource.Kind{
		gv: {iamv0.RoleKind(), iamv0.RoleBindingKind()},
	}
}
