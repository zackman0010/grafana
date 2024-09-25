package grpcplugin

import (
	"os/exec"

	"github.com/grafana/grafana-plugin-sdk-go/backend/grpcplugin"
	goplugin "github.com/hashicorp/go-plugin"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/stats"

	"github.com/grafana/grafana/pkg/plugins/backendplugin"
	"github.com/grafana/grafana/pkg/plugins/backendplugin/pluginextensionv2"
	"github.com/grafana/grafana/pkg/plugins/backendplugin/secretsmanagerplugin"
	"github.com/grafana/grafana/pkg/plugins/log"
)

// Handshake is the HandshakeConfig used to configure clients and servers.
var handshake = goplugin.HandshakeConfig{
	// The ProtocolVersion is the version that must match between Grafana core
	// and Grafana plugins. This should be bumped whenever a (breaking) change
	// happens in one or the other that makes it so that they can't safely communicate.
	ProtocolVersion: grpcplugin.ProtocolVersion,

	// The magic cookie values should NEVER be changed.
	MagicCookieKey:   grpcplugin.MagicCookieKey,
	MagicCookieValue: grpcplugin.MagicCookieValue,
}

// pluginSet is list of plugins supported on v2.
var pluginSet = map[int]goplugin.PluginSet{
	grpcplugin.ProtocolVersion: {
		"diagnostics":    &grpcplugin.DiagnosticsGRPCPlugin{},
		"resource":       &grpcplugin.ResourceGRPCPlugin{},
		"data":           &grpcplugin.DataGRPCPlugin{},
		"stream":         &grpcplugin.StreamGRPCPlugin{},
		"admission":      &grpcplugin.AdmissionGRPCPlugin{},
		"conversion":     &grpcplugin.ConversionGRPCPlugin{},
		"renderer":       &pluginextensionv2.RendererGRPCPlugin{},
		"secretsmanager": &secretsmanagerplugin.SecretsManagerGRPCPlugin{},
	},
}

func newClientConfig(executablePath string, args []string, env []string, skipHostEnvVars bool, logger log.Logger,
	tracerProvider trace.TracerProvider, versionedPlugins map[int]goplugin.PluginSet) *goplugin.ClientConfig {
	// We can ignore gosec G201 here, since the dynamic part of executablePath comes from the plugin definition
	// nolint:gosec
	cmd := exec.Command(executablePath, args...)
	cmd.Env = env

	var statsHandler stats.Handler
	if tracerProvider != nil {
		statsHandler = otelgrpc.NewClientHandler(otelgrpc.WithTracerProvider(tracerProvider))
	} else {
		statsHandler = otelgrpc.NewClientHandler()
	}

	return &goplugin.ClientConfig{
		Cmd:              cmd,
		HandshakeConfig:  handshake,
		VersionedPlugins: versionedPlugins,
		SkipHostEnv:      skipHostEnvVars,
		Logger:           logWrapper{Logger: logger},
		AllowedProtocols: []goplugin.Protocol{goplugin.ProtocolGRPC},
		GRPCDialOptions: []grpc.DialOption{
			grpc.WithStatsHandler(statsHandler),
		},
	}
}

// StartRendererFunc callback function called when a renderer plugin is started.
type StartRendererFunc func(pluginID string, renderer pluginextensionv2.RendererPlugin, logger log.Logger) error

// StartSecretsManagerFunc callback function called when a secrets manager plugin is started.
type StartSecretsManagerFunc func(pluginID string, secretsmanager secretsmanagerplugin.SecretsManagerPlugin, logger log.Logger) error

// PluginDescriptor is a descriptor used for registering backend plugins.
type PluginDescriptor struct {
	pluginID              string
	executablePath        string
	executableArgs        []string
	skipHostEnvVars       bool
	managed               bool
	tracerProvider        trace.TracerProvider
	versionedPlugins      map[int]goplugin.PluginSet
	startRendererFn       StartRendererFunc
	startSecretsManagerFn StartSecretsManagerFunc
}

type BackendPluginOpts struct {
	TracerProvider trace.TracerProvider
	ExecutableArgs []string
}

// NewBackendPlugin creates a new backend plugin factory used for registering a backend plugin.
func NewBackendPlugin(pluginID, executablePath string, skipHostEnvVars bool, opts ...BackendPluginOpts) backendplugin.PluginFactoryFunc {
	var o BackendPluginOpts
	if len(opts) > 0 {
		o = opts[0]
	}

	return newBackendPlugin(pluginID, executablePath, true, skipHostEnvVars, o)
}

// NewBackendPlugin creates a new backend plugin factory used for registering a backend plugin.
func newBackendPlugin(pluginID, executablePath string, managed bool, skipHostEnvVars bool, opts BackendPluginOpts) backendplugin.PluginFactoryFunc {
	return newPlugin(PluginDescriptor{
		pluginID:         pluginID,
		executablePath:   executablePath,
		executableArgs:   opts.ExecutableArgs,
		skipHostEnvVars:  skipHostEnvVars,
		tracerProvider:   opts.TracerProvider,
		managed:          managed,
		versionedPlugins: pluginSet,
	})
}

// NewRendererPlugin creates a new renderer plugin factory used for registering a backend renderer plugin.
func NewRendererPlugin(pluginID, executablePath string, startFn StartRendererFunc) backendplugin.PluginFactoryFunc {
	return newPlugin(PluginDescriptor{
		pluginID:         pluginID,
		executablePath:   executablePath,
		managed:          false,
		versionedPlugins: pluginSet,
		startRendererFn:  startFn,
	})
}

// NewSecretsManagerPlugin creates a new secrets manager plugin factory used for registering a backend secrets manager plugin.
func NewSecretsManagerPlugin(pluginID, executablePath string, startFn StartSecretsManagerFunc) backendplugin.PluginFactoryFunc {
	return newPlugin(PluginDescriptor{
		pluginID:              pluginID,
		executablePath:        executablePath,
		managed:               false,
		versionedPlugins:      pluginSet,
		startSecretsManagerFn: startFn,
	})
}
