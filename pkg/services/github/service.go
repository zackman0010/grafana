package github

import (
	"context"
	"errors"
	"fmt"
	"regexp"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/folder"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"

	"github.com/google/go-github/v39/github"
)

// isDashboardRegex returns true if the path ends in `-dahboard.json`.
var isDashboardRegex = regexp.MustCompile(`-dashboard\.json$`)

// TODO: move this logic / endpoint to the app platform code path when it's ready
type Service struct {
	logger           log.Logger
	cfg              *setting.Cfg
	routeRegister    routing.RouteRegister
	dashboardService dashboards.DashboardService
	folderService    folder.Service
}

// TODO: use app platform entity
type repository struct {
	url    string
	secret []byte
}

func ProvideService(
	cfg *setting.Cfg,
	routeRegister routing.RouteRegister,
	dashboardService dashboards.DashboardService,
	folderService folder.Service,
) *Service {
	logger := log.New("github.service")
	s := Service{
		logger:           logger,
		cfg:              cfg,
		routeRegister:    routeRegister,
		dashboardService: dashboardService,
		folderService:    folderService,
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

	// TODO: will org work with webhook and app platform?
	// orgID := c.GetOrgID()
	orgID := int64(1)
	s.logger.Info("The org ID is", "org", orgID)
	ctx := c.Req.Context()

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

		folderUID, err := s.ensureGithubSyncFolderExists(ctx, orgID)
		if err != nil {
			return response.Error(500, "Failed to ensure Github Sync folder exists", err)
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
				if !isDashboardRegex.MatchString(file) {
					s.logger.Info("New file is not a dashboard", "file", file)
					continue
				}

				s.logger.Info("New dashboard added", "file", file, "folder", folderUID)
			}

			for _, file := range commit.Removed {
				s.logger.Info("File removed", "file", file)
				if !isDashboardRegex.MatchString(file) {
					s.logger.Info("Delete file is not a dashboard", "file", file, "folder", folderUID)
					continue
				}

				s.logger.Info("Dashboard removed", "file", file)
			}

			for _, file := range commit.Modified {
				s.logger.Info("File modified", "file", file)
				if !isDashboardRegex.MatchString(file) {
					s.logger.Info("Modified file is not a dashboard", "file", file, "folder", folderUID)
					continue
				}

				s.logger.Info("Dashboard modified", "file", file)
			}
			// TODO: how to do the same for renamed files?
		}

	default:
		return response.Error(400, "Unsupported event type", nil)
	}

	return response.Success("event successfully processed")
}

func (s *Service) ensureGithubSyncFolderExists(ctx context.Context, orgID int64) (string, error) {
	title := "Github Sync"
	description := "A folder containing all dashboards synced out of Github"

	getQuery := &folder.GetFolderQuery{
		Title:        &title,
		OrgID:        orgID,
		SignedInUser: githubSyncUser(orgID),
	}

	syncFolder, err := s.folderService.Get(ctx, getQuery)
	switch {
	case err == nil:
		return syncFolder.UID, nil
	case !errors.Is(err, dashboards.ErrFolderNotFound):
		return "", err
	}

	createQuery := &folder.CreateFolderCommand{
		OrgID:        orgID,
		UID:          util.GenerateShortUID(),
		Title:        title,
		SignedInUser: githubSyncUser(orgID),
		Description:  description,
	}

	f, err := s.folderService.Create(ctx, createQuery)
	if err != nil {
		return "", err
	}

	return f.UID, nil
}

var githubSyncUser = func(orgID int64) identity.Requester {
	// this user has 0 ID and therefore, organization wide quota will be applied
	return accesscontrol.BackgroundUser(
		"github_sync",
		orgID,
		org.RoleAdmin,
		[]accesscontrol.Permission{
			{Action: dashboards.ActionFoldersRead, Scope: dashboards.ScopeFoldersAll},
			{Action: dashboards.ActionFoldersCreate, Scope: dashboards.ScopeFoldersAll},
			{Action: dashboards.ActionFoldersDelete, Scope: dashboards.ScopeFoldersAll},
			{Action: dashboards.ActionDashboardsCreate, Scope: dashboards.ScopeFoldersAll},
			{Action: dashboards.ActionDashboardsWrite, Scope: dashboards.ScopeFoldersAll},
			{Action: dashboards.ActionDashboardsDelete, Scope: dashboards.ScopeFoldersAll},
		},
	)
}
