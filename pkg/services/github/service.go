package github

import (
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/infra/log"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

type Service struct {
	logger        log.Logger
	cfg           *setting.Cfg
	routeRegister routing.RouteRegister
}

func ProvideService(cfg *setting.Cfg, routeRegister routing.RouteRegister) *Service {
	s := Service{
		logger:        log.New("github.service"),
		cfg:           cfg,
		routeRegister: routeRegister,
	}
	// TODO: If flag is disable, return

	s.Init()

	return &s
}

func (s *Service) Init() error {
	s.registerRoutes()
	return nil
}

func (s *Service) IsDisabled() bool {
	// TODO: add the feature flag
	return false
}

func (s *Service) registerRoutes() {
	s.routeRegister.Group("/api/github", func(api routing.RouteRegister) {
		api.Post("/webhook", routing.Wrap(s.handleWebhook))
	})
}

func (s *Service) handleWebhook(c *contextmodel.ReqContext) response.Response {
	var data interface{}
	if err := web.Bind(c.Req, &data); err != nil {
		return response.Error(400, "Failed to parse request body", err)
	}

	// TODO: Verify the webhook signature

	s.logger.Info("Webhook event received", "data", data)

	return response.Success("event successfully processed")
}
