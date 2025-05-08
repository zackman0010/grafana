package pluginstore

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/grafana/authlib/types"
	"github.com/grafana/grafana-app-sdk/k8s"
	sdkresource "github.com/grafana/grafana-app-sdk/resource"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	pluginsv0alpha1 "github.com/grafana/grafana/apps/plugins/pkg/apis/plugins/v0alpha1"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/manager/loader"
	"github.com/grafana/grafana/pkg/plugins/manager/registry"
	"github.com/grafana/grafana/pkg/plugins/manager/sources"
	"github.com/grafana/grafana/pkg/services/apiserver/restconfig"
	"github.com/grafana/grafana/pkg/setting"
)

var _ Store = (*Service)(nil)

var (
	errPluginNotExists = errors.New("plugin does not exist")
)

// Store is the publicly accessible storage for plugins.
type Store interface {
	// Plugin finds a plugin by its ID.
	// Note: version is not required since Grafana only supports single versions of a plugin.
	Plugin(ctx context.Context, pluginID string) (Plugin, bool)
	// Plugins returns plugins by their requested type.
	Plugins(ctx context.Context, pluginTypes ...plugins.Type) []Plugin
}

type Service struct {
	stackID         string
	pluginRegistry  registry.Service
	pluginLoader    loader.Service
	pluginSources   sources.Registry
	restCfgProvider restconfig.RestConfigProvider

	readyCh chan struct{}
}

func ProvideService(cfg *setting.Cfg, pluginRegistry registry.Service, pluginSources sources.Registry,
	pluginLoader loader.Service, restCfgProvider restconfig.RestConfigProvider) (*Service, error) {
	return New(cfg.StackID, pluginRegistry, pluginLoader, pluginSources, restCfgProvider), nil
}

func New(stackID string, pluginRegistry registry.Service, pluginLoader loader.Service,
	pluginSources sources.Registry, restCfgProvider restconfig.RestConfigProvider) *Service {
	return &Service{
		stackID:         stackID,
		pluginRegistry:  pluginRegistry,
		pluginLoader:    pluginLoader,
		pluginSources:   pluginSources,
		restCfgProvider: restCfgProvider,
		readyCh:         make(chan struct{}),
	}
}

func (s *Service) Run(ctx context.Context) error {
	logger := log.New("plugin.store")
	logger.Info("Starting plugin store")
	defer logger.Info("Plugin store stopped")

	// Initialize plugin client
	kubeConfig, err := s.restCfgProvider.GetRestConfig(ctx)
	if err != nil {
		return err
	}
	clientGenerator := k8s.NewClientRegistry(*kubeConfig, k8s.ClientConfig{})
	pluginClient, err := clientGenerator.ClientFor(pluginsv0alpha1.PluginKind())
	if err != nil {
		return fmt.Errorf("failed to create plugin client: %w", err)
	}

	if err := s.loadPlugins(ctx, logger, pluginClient); err != nil {
		return err
	}
	<-ctx.Done()
	s.shutdown(ctx)
	return ctx.Err()
}

func (s *Service) Plugin(ctx context.Context, pluginID string) (Plugin, bool) {
	if err := s.awaitReadyOrTimeout(ctx); err != nil {
		return Plugin{}, false
	}

	p, exists := s.plugin(ctx, pluginID)
	if !exists {
		return Plugin{}, false
	}

	return ToGrafanaDTO(p), true
}

func (s *Service) Plugins(ctx context.Context, pluginTypes ...plugins.Type) []Plugin {
	if err := s.awaitReadyOrTimeout(ctx); err != nil {
		return nil
	}

	// if no types passed, assume all
	if len(pluginTypes) == 0 {
		pluginTypes = plugins.PluginTypes
	}

	var requestedTypes = make(map[plugins.Type]struct{})
	for _, pt := range pluginTypes {
		requestedTypes[pt] = struct{}{}
	}

	pluginsList := make([]Plugin, 0)
	for _, p := range s.availablePlugins(ctx) {
		if _, exists := requestedTypes[p.Type]; exists {
			pluginsList = append(pluginsList, ToGrafanaDTO(p))
		}
	}
	return pluginsList
}

func (s *Service) awaitReadyOrTimeout(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-s.readyCh:
		return nil
	}
}

func (s *Service) Routes(ctx context.Context) []*plugins.StaticRoute {
	staticRoutes := make([]*plugins.StaticRoute, 0)

	if err := s.awaitReadyOrTimeout(ctx); err != nil {
		return staticRoutes
	}

	for _, p := range s.availablePlugins(ctx) {
		if p.StaticRoute() != nil {
			staticRoutes = append(staticRoutes, p.StaticRoute())
		}
	}
	return staticRoutes
}

// plugin finds a plugin with `pluginID` from the registry that is not decommissioned
func (s *Service) plugin(ctx context.Context, pluginID string) (*plugins.Plugin, bool) {
	p, exists := s.pluginRegistry.Plugin(ctx, pluginID, "") // version is not required since Grafana only supports single versions of a plugin
	if !exists {
		return nil, false
	}

	if p.IsDecommissioned() {
		return nil, false
	}

	return p, true
}

// availablePlugins returns all non-decommissioned plugins from the registry sorted by alphabetic order on `plugin.ID`
func (s *Service) availablePlugins(ctx context.Context) []*plugins.Plugin {
	ps := s.pluginRegistry.Plugins(ctx)

	res := make([]*plugins.Plugin, 0, len(ps))
	for _, p := range ps {
		if !p.IsDecommissioned() {
			res = append(res, p)
		}
	}
	sort.SliceStable(res, func(i, j int) bool {
		return res[i].ID < res[j].ID
	})
	return res
}

func (s *Service) shutdown(ctx context.Context) {
	var wg sync.WaitGroup
	for _, plugin := range s.pluginRegistry.Plugins(ctx) {
		wg.Add(1)
		go func(ctx context.Context, p *plugins.Plugin) {
			defer wg.Done()
			p.Logger().Debug("Stopping plugin")
			if _, err := s.pluginLoader.Unload(ctx, p); err != nil {
				p.Logger().Error("Failed to stop plugin", "error", err)
			}
			p.Logger().Debug("Plugin stopped")
		}(ctx, plugin)
	}
	wg.Wait()
}

// getPluginResource retrieves a plugin resource using the Kubernetes client
func (s *Service) getPluginResource(ctx context.Context, pluginID string, pluginClient sdkresource.Client) (*pluginsv0alpha1.Plugin, error) {
	ctx, _ = identity.WithServiceIdentity(ctx, 1)

	namespace, err := getNamespace(s.stackID)
	if err != nil {
		return nil, err
	}

	identifier := sdkresource.Identifier{
		Name:      pluginID,
		Namespace: namespace,
	}

	obj, err := pluginClient.Get(ctx, identifier)
	if err != nil {
		if errors.Is(err, errPluginNotExists) {
			return nil, errPluginNotExists
		}
		return nil, err
	}

	plugin, ok := obj.(*pluginsv0alpha1.Plugin)
	if !ok {
		return nil, fmt.Errorf("unexpected type: %T", obj)
	}

	return plugin, nil
}

func getNamespace(stackID string) (string, error) {
	if stackID == "" {
		return metav1.NamespaceDefault, nil
	}
	stackId, err := strconv.ParseInt(stackID, 10, 64)
	if err != nil {
		return "", fmt.Errorf("invalid stack id: %s", stackID)
	}
	return types.CloudNamespaceFormatter(stackId), nil
}

func (s *Service) loadPlugins(ctx context.Context, logger log.Logger, pluginClient sdkresource.Client) error {
	start := time.Now()
	totalPlugins := 0
	logger.Info("Loading plugins...")

	for _, ps := range s.pluginSources.List(ctx) {
		loadedPlugins, err := s.pluginLoader.Load(ctx, ps)
		if err != nil {
			logger.Error("Loading plugin source failed", "source", ps.PluginClass(ctx), "error", err)
			return err
		}

		totalPlugins += len(loadedPlugins)

		for _, plugin := range loadedPlugins {
			if !plugin.IsExternalPlugin() {
				continue
			}

			namespace, err := getNamespace(s.stackID)
			if err != nil {
				return err
			}

			// Create plugin identifier
			identifier := sdkresource.Identifier{
				Name:      plugin.ID,
				Namespace: namespace,
			}

			// Create or update plugin resource using Kubernetes client
			pluginResource := &pluginsv0alpha1.Plugin{
				TypeMeta: metav1.TypeMeta{
					Kind:       pluginsv0alpha1.PluginKind().Kind(),
					APIVersion: pluginsv0alpha1.PluginKind().Version(),
				},
				ObjectMeta: metav1.ObjectMeta{
					Name:      plugin.ID,
					Namespace: namespace,
				},
				Spec: pluginsv0alpha1.PluginSpec{
					Id:      plugin.JSONData.ID,
					Version: plugin.JSONData.Info.Version,
				},
			}

			var statusErr *apierrors.StatusError
			// Check if plugin exists
			existingPlugin, err := pluginClient.Get(ctx, identifier)
			if err != nil {
				if !errors.As(err, &statusErr) || statusErr.ErrStatus.Code != 404 {
					logger.Error("Failed to get plugin resource", "plugin", plugin.ID, "error", err)
					return err
				}
				// Plugin doesn't exist, create it
				_, err := pluginClient.Create(ctx, identifier, pluginResource, sdkresource.CreateOptions{})
				if err != nil {
					logger.Error("Failed to create plugin resource", "plugin", plugin.ID, "error", err)
					return err
				}
				continue
			}

			// Update existing plugin
			if existingPlugin != nil {
				if meta, ok := existingPlugin.(metav1.Object); ok {
					pluginResource.ObjectMeta.UID = meta.GetUID()
					pluginResource.ObjectMeta.ResourceVersion = meta.GetResourceVersion()
				}
				_, err := pluginClient.Update(ctx, identifier, pluginResource, sdkresource.UpdateOptions{})
				if err != nil {
					logger.Error("Failed to update plugin resource", "plugin", plugin.ID, "error", err)
				}
			}
		}
	}

	logger.Info("Plugins loaded", "count", totalPlugins, "duration", time.Since(start))
	close(s.readyCh)
	return nil
}
