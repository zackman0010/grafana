package github

import (
	"fmt"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/infra/log"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/setting"

	"github.com/google/go-github/v39/github"
)

// TODO: move this logic / endpoint to the app platform code path when it's ready
type Service struct {
	logger        log.Logger
	cfg           *setting.Cfg
	routeRegister routing.RouteRegister
}

// TODO: use app platform entity
type repository struct {
	url    string
	secret []byte
}

func ProvideService(cfg *setting.Cfg, routeRegister routing.RouteRegister) *Service {
	logger := log.New("github.service")
	s := Service{
		logger:        logger,
		cfg:           cfg,
		routeRegister: routeRegister,
	}
	// TODO: If flag is disable, return

	logger.Info("Start GitHub service")

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
	// TODO: check if the repo we care about based on <uid> in webhook URL.
	repo := repository{
		// TODO: how to deal with renamed repositories?
		url:    "https://github.com/MissingRoberto/empty-repo",
		secret: nil,
	}

	// TODO: generate a webhook secret for each repository
	// TODO: where to store the secret

	payload, err := github.ValidatePayload(c.Req, repo.secret)
	if err != nil {
		s.logger.Error("Failed to validate payload", "error", err)
		return response.Error(400, "Failed to validate payload", err)
	}

	event, err := github.ParseWebHook(github.WebHookType(c.Req), payload)
	if err != nil {
		return response.Error(400, "Failed to parse webhook event", err)
	}

	// TODO: how to process events in order?
	switch event := event.(type) {
	case *github.PushEvent:
		s.logger.Info("Push event received", "data", event)

		if event.Repo == nil {
			return response.Error(400, "Ref is missing", nil)
		}

		if event.GetRepo().GetURL() != repo.url {
			return response.Error(400, "Repository URL mismatch", nil)
		}

		// TODO: is there a better way if it's the main branch?
		if event.GetRef() != "refs/heads/main" && event.GetRef() != "refs/heads/master" {
			// Return status 200 as you cannot configure the hook notifications per branch
			return response.Success(fmt.Sprintf("Skipped as %s is the main/master branch", event.GetRef()))
		}

		// For new commits, we need to iterated from oldest to newest and apply print files changed in each commit
		// TODO: check the order of commits in the message
		for _, commit := range event.Commits {
			s.logger.Info(
				"Commit",
				"message",
				commit.GetMessage(),
				"author",
				commit.GetAuthor().GetLogin(),
				"timestamp",
				commit.GetTimestamp(),
			)

			for _, file := range commit.Added {
				s.logger.Info("File added", "file", file)
			}

			for _, file := range commit.Removed {
				s.logger.Info("File removed", "file", file)
			}

			for _, file := range commit.Modified {
				s.logger.Info("File modified", "file", file)
			}
			// TODO: how to do the same for renamed files?
		}

	default:
		return response.Error(400, "Unsupported event type", nil)
	}

	return response.Success("event successfully processed")
}
