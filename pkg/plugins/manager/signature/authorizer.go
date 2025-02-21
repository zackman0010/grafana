package signature

import (
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"slices"
)

func ProvideOSSAuthorizer(cfg *config.PluginManagementCfg) *UnsignedPluginAuthorizer {
	return NewUnsignedAuthorizer(cfg)
}

func NewUnsignedAuthorizer(cfg *config.PluginManagementCfg) *UnsignedPluginAuthorizer {
	return &UnsignedPluginAuthorizer{
		cfg: cfg,
	}
}

type UnsignedPluginAuthorizer struct {
	cfg *config.PluginManagementCfg
}

func (u *UnsignedPluginAuthorizer) CanLoadPlugin(p *plugins.Plugin) bool {
	if p.Signature != plugins.SignatureStatusUnsigned {
		return true
	}

	if u.cfg.DevMode {
		return true
	}

	return slices.Contains(u.cfg.PluginsAllowUnsigned, p.ID)
}
