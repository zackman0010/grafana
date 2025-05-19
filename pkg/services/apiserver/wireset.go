package apiserver

import (
	"github.com/google/wire"

	"github.com/grafana/grafana/pkg/services/apiserver/builder"
	"github.com/grafana/grafana/pkg/services/apiserver/restconfig"
)

var WireSet = wire.NewSet(
	restconfig.ProvideEventualRestConfigProvider,
	wire.Bind(new(restconfig.RestConfigProvider), new(*restconfig.EventualRestConfigProvider)),
	wire.Bind(new(restconfig.DirectRestConfigProvider), new(*restconfig.EventualRestConfigProvider)),
	ProvideService,
	wire.Bind(new(Service), new(*service)),
	wire.Bind(new(builder.APIRegistrar), new(*service)),
)
