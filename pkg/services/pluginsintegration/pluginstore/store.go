package pluginstore

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/grafana/authlib/types"
	"github.com/grafana/grafana-app-sdk/k8s"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8stypes "k8s.io/apimachinery/pkg/types"

	pluginsv0alpha1 "github.com/grafana/grafana/apps/plugins/pkg/apis/plugins/v0alpha1"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/manager/loader"
	"github.com/grafana/grafana/pkg/plugins/manager/registry"
	"github.com/grafana/grafana/pkg/plugins/manager/sources"
	"github.com/grafana/grafana/pkg/services/apiserver"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/storage/unified/resource"
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
	stackID        string
	pluginRegistry registry.Service
	pluginLoader   loader.Service
	unifiedStorage resource.ResourceClient
}

func ProvideService(cfg *setting.Cfg, pluginRegistry registry.Service, pluginSources sources.Registry,
	pluginLoader loader.Service, unifiedStorage resource.ResourceClient, restCfgProvider apiserver.RestConfigProvider) (*Service, error) {
	ctx := context.Background()
	start := time.Now()
	totalPlugins := 0
	logger := log.New("plugin.store")
	logger.Info("Loading plugins...")

	s := New(cfg.StackID, pluginRegistry, pluginLoader, unifiedStorage)
	for _, ps := range pluginSources.List(ctx) {
		loadedPlugins, err := pluginLoader.Load(ctx, ps)
		if err != nil {
			logger.Error("Loading plugin source failed", "source", ps.PluginClass(ctx), "error", err)
			return nil, err
		}

		totalPlugins += len(loadedPlugins)

		for _, plugin := range loadedPlugins {
			if !plugin.IsExternalPlugin() {
				continue
			}

			// More appropriate way to create plugin resources?
			kubeConfig, err := restCfgProvider.GetRestConfig(ctx)
			if err != nil {
				return nil, err
			}
			clientGenerator := k8s.NewClientRegistry(*kubeConfig, k8s.ClientConfig{})
			_, err = clientGenerator.ClientFor(pluginsv0alpha1.PluginKind())
			// TODO client.Create()...

			p, err := s.getPluginResource(ctx, plugin.ID)
			if err != nil {
				if !errors.Is(err, errPluginNotExists) {
					logger.Error("Failed to get plugin resource", "plugin", plugin.ID, "error", err)
					return nil, err
				}
			}

			if p != nil {
				err = s.updatePluginResource(context.Background(), plugin.ID, plugin.JSONData)
				if err != nil {
					logger.Error("Failed to update plugin resource", "plugin", plugin.ID, "error", err)
				}
				continue
			}

			err = s.createPluginResource(context.Background(), plugin.ID, plugin.JSONData)
			if err != nil {
				logger.Error("Failed to create plugin resource", "plugin", plugin.ID, "error", err)
				return nil, err
			}
		}
	}

	logger.Info("Plugins loaded", "count", totalPlugins, "duration", time.Since(start))

	return s, nil
}

func (s *Service) Run(ctx context.Context) error {
	<-ctx.Done()
	s.shutdown(ctx)
	return ctx.Err()
}

func New(stackID string, pluginRegistry registry.Service, pluginLoader loader.Service, unifiedStorage resource.ResourceClient) *Service {
	return &Service{
		stackID:        stackID,
		pluginRegistry: pluginRegistry,
		pluginLoader:   pluginLoader,
		unifiedStorage: unifiedStorage,
	}
}

func (s *Service) Plugin(ctx context.Context, pluginID string) (Plugin, bool) {
	p, exists := s.plugin(ctx, pluginID)
	if !exists {
		return Plugin{}, false
	}

	return ToGrafanaDTO(p), true
}

func (s *Service) Plugins(ctx context.Context, pluginTypes ...plugins.Type) []Plugin {
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

func (s *Service) Routes(ctx context.Context) []*plugins.StaticRoute {
	staticRoutes := make([]*plugins.StaticRoute, 0)

	for _, p := range s.availablePlugins(ctx) {
		if p.StaticRoute() != nil {
			staticRoutes = append(staticRoutes, p.StaticRoute())
		}
	}
	return staticRoutes
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

// createPluginResource creates a new plugin resource in unified storage
func (s *Service) createPluginResource(ctx context.Context, pluginID string, jsonData plugins.JSONData) error {
	ctx, _ = identity.WithServiceIdentity(ctx, 1)

	namespace, err := getNamespace(s.stackID)
	if err != nil {
		return err
	}

	key := &resource.ResourceKey{
		Group:     pluginsv0alpha1.APIGroup,
		Resource:  "plugins",
		Namespace: namespace,
		Name:      pluginID,
	}

	plugin := &pluginsv0alpha1.Plugin{
		TypeMeta: metav1.TypeMeta{
			Kind:       pluginsv0alpha1.PluginKind().Kind(),
			APIVersion: pluginsv0alpha1.GroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      pluginID,
			Namespace: namespace,
			UID:       k8stypes.UID(uuid.NewString()),
		},
		Spec: pluginsv0alpha1.PluginSpec{
			Id:      jsonData.ID,
			Version: jsonData.Info.Version,
		},
	}

	value, err := json.Marshal(plugin)
	if err != nil {
		return err
	}

	req := &resource.CreateRequest{
		Key:   key,
		Value: value,
	}

	rsp, err := s.unifiedStorage.Create(ctx, req)
	if err != nil {
		return err
	}
	if rsp.Error != nil {
		return fmt.Errorf("failed to create plugin resource: %s", rsp.Error.Message)
	}

	return nil
}

// getPluginResource retrieves a plugin resource from unified storage
func (s *Service) getPluginResource(ctx context.Context, pluginID string) (*pluginsv0alpha1.Plugin, error) {
	ctx, _ = identity.WithServiceIdentity(ctx, 1)

	namespace, err := getNamespace(s.stackID)
	if err != nil {
		return nil, err
	}

	key := &resource.ResourceKey{
		Group:     pluginsv0alpha1.APIGroup,
		Resource:  "plugins",
		Namespace: namespace,
		Name:      pluginID,
	}

	req := &resource.ReadRequest{
		Key: key,
	}

	rsp, err := s.unifiedStorage.Read(ctx, req)
	if err != nil {
		return nil, err
	}
	if rsp.Error != nil {
		if rsp.Error.Code == 404 {
			return nil, errPluginNotExists
		}
		return nil, fmt.Errorf("failed to read plugin resource: %s", rsp.Error.Message)
	}

	var plugin pluginsv0alpha1.Plugin
	if err := json.Unmarshal(rsp.Value, &plugin); err != nil {
		return nil, err
	}

	return &plugin, nil
}

// updatePluginResource updates an existing plugin resource in unified storage
func (s *Service) updatePluginResource(ctx context.Context, pluginID string, spec plugins.JSONData) error {
	ctx, _ = identity.WithServiceIdentity(ctx, 1)

	current, err := s.getPluginResource(ctx, pluginID)
	if err != nil {
		return err
	}

	namespace, err := getNamespace(s.stackID)
	if err != nil {
		return err
	}

	key := &resource.ResourceKey{
		Group:     pluginsv0alpha1.APIGroup,
		Resource:  "plugins",
		Namespace: namespace,
		Name:      pluginID,
	}

	plugin := &pluginsv0alpha1.Plugin{
		TypeMeta: metav1.TypeMeta{
			Kind:       pluginsv0alpha1.PluginKind().Kind(),
			APIVersion: pluginsv0alpha1.GroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:            pluginID,
			Namespace:       namespace,
			UID:             current.ObjectMeta.UID,
			ResourceVersion: current.ObjectMeta.ResourceVersion,
		},
		Spec: pluginsv0alpha1.PluginSpec{
			Id:      spec.ID,
			Version: spec.Info.Version,
		},
	}

	value, err := json.Marshal(plugin)
	if err != nil {
		return err
	}

	resourceVersion, err := strconv.ParseInt(current.ObjectMeta.ResourceVersion, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid resource version: %s", current.ObjectMeta.ResourceVersion)
	}

	req := &resource.UpdateRequest{
		Key:             key,
		ResourceVersion: resourceVersion,
		Value:           value,
	}

	rsp, err := s.unifiedStorage.Update(ctx, req)
	if err != nil {
		return err
	}
	if rsp.Error != nil {
		return fmt.Errorf("failed to update plugin resource: %s", rsp.Error.Message)
	}

	return nil
}

// deletePluginResource deletes a plugin resource from unified storage
func (s *Service) deletePluginResource(ctx context.Context, pluginID string) error {
	ctx, _ = identity.WithServiceIdentity(ctx, 1)

	current, err := s.getPluginResource(ctx, pluginID)
	if err != nil {
		return err
	}

	namespace, err := getNamespace(s.stackID)
	if err != nil {
		return err
	}

	key := &resource.ResourceKey{
		Group:     pluginsv0alpha1.APIGroup,
		Resource:  "plugins",
		Namespace: namespace,
		Name:      pluginID,
	}

	resourceVersion, err := strconv.ParseInt(current.ObjectMeta.ResourceVersion, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid resource version: %s", current.ObjectMeta.ResourceVersion)
	}

	req := &resource.DeleteRequest{
		Key:             key,
		ResourceVersion: resourceVersion,
	}

	rsp, err := s.unifiedStorage.Delete(ctx, req)
	if err != nil {
		return err
	}
	if rsp.Error != nil {
		return fmt.Errorf("failed to delete plugin resource: %s", rsp.Error.Message)
	}

	return nil
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
