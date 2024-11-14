package github

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/folder"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
	"golang.org/x/oauth2"

	"github.com/google/go-github/v66/github"
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
	features         featuremgmt.FeatureToggles
}

// TODO: use app platform entity
type repository struct {
	name          string
	url           string
	token         string
	webhookSecret []byte
}

func ProvideService(
	cfg *setting.Cfg,
	features featuremgmt.FeatureToggles,
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
		features:         features,
	}

	if !features.IsEnabledGlobally(featuremgmt.FlagProvisioningV2) {
		return &s
	}

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
	return s.features.IsEnabledGlobally(featuremgmt.FlagProvisioningV2)
}

func (s *Service) registerRoutes() {
	s.routeRegister.Group("/api/github", func(api routing.RouteRegister) {
		api.Post("/webhook", routing.Wrap(s.handleWebhook))
	})
}

func (s *Service) handleWebhook(c *contextmodel.ReqContext) response.Response {
	// TODO: check if the repo we care about based on <uid> in webhook URL.
	// TODO: generate a webhook secret for each repository
	// TODO: where to store the secret
	// TODO: how to deal with renamed repositories?
	repo := repository{
		name:          s.cfg.ProvisioningV2.RepositoryName,
		url:           s.cfg.ProvisioningV2.RepositoryURL,
		webhookSecret: []byte(s.cfg.ProvisioningV2.RepositoryWebhookSecret),
		token:         s.cfg.ProvisioningV2.RepositoryToken,
	}

	payload, err := github.ValidatePayload(c.Req, repo.webhookSecret)
	if err != nil {
		s.logger.Error("Failed to validate payload", "error", err)
		return response.Error(400, "Failed to validate payload", err)
	}

	event, err := github.ParseWebHook(github.WebHookType(c.Req), payload)
	if err != nil {
		return response.Error(400, "Failed to parse webhook event", err)
	}

	// TODO: will org work with webhook and app platform?
	orgID := s.cfg.ProvisioningV2.RepositoryOrgID
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

		repoName := event.Repo.GetName()
		folder, err := s.ensureGithubSyncFolderExists(ctx, orgID, repoName)
		if err != nil {
			return response.Error(500, "Failed to ensure Github Sync folder exists", err)
		}

		tokenSrc := oauth2.StaticTokenSource(
			&oauth2.Token{AccessToken: repo.token},
		)
		tokenClient := oauth2.NewClient(ctx, tokenSrc)
		githubClient := github.NewClient(tokenClient)

		repoOwner := event.Repo.Owner.GetName()

		beforeRef := event.GetBefore()

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

				fileContent, _, _, err := githubClient.Repositories.GetContents(ctx, repoOwner, repoName, file, &github.RepositoryContentGetOptions{
					Ref: commit.GetID(),
				})
				if err != nil {
					return response.Error(500, "Failed to get file content", err)
				}

				// TODO: Support folders

				content, err := fileContent.GetContent()
				if err != nil {
					return response.Error(500, "Failed to get file content", err)
				}

				json, err := simplejson.NewJson([]byte(content))
				if err != nil {
					return response.Error(500, "Failed to parse file content", err)
				}

				dashboard := dashboards.NewDashboardFromJson(json)
				dashboard.FolderID = folder.ID
				dashboard.FolderUID = folder.UID
				dashboard.OrgID = orgID
				dashboard.Updated = time.Now()

				query := &dashboards.GetDashboardQuery{
					UID: dashboard.UID,
					// TODO: limitation by dashboard title
					Title:     &dashboard.Title,
					FolderID:  &folder.ID,
					FolderUID: &folder.UID,
					OrgID:     orgID,
				}

				existingDashboard, err := s.dashboardService.GetDashboard(ctx, query)
				if err != nil && !errors.Is(err, dashboards.ErrDashboardNotFound) {
					return response.Error(500, "Failed to get existing dashboard", err)
				}

				if existingDashboard == nil {
					dashboard.Created = time.Now()
					dashboard.Version = 0
				} else {
					s.logger.Warn("New dashboard already exists", "file", file, "content", content)
					dashboard.UID = existingDashboard.UID
					dashboard.Version = existingDashboard.Version + 1
				}

				dto := &dashboards.SaveDashboardDTO{
					OrgID:     orgID,
					UpdatedAt: time.Now(),
					User:      githubSyncUser(orgID),
					Message:   commit.GetMessage(),
					Overwrite: false,
					Dashboard: dashboard,
				}
				_, err = s.dashboardService.ImportDashboard(ctx, dto)
				if err != nil {
					return response.Error(500, "Failed to import dashboard", err)
				}

				s.logger.Info("New dashboard added", "file", file, "folder", folder.UID, "content", content, "dashboard", dashboard)
			}

			for _, file := range commit.Modified {
				s.logger.Info("File modified", "file", file)
				if !isDashboardRegex.MatchString(file) {
					s.logger.Info("Modified file is not a dashboard", "file", file, "folder", folder.UID)
					continue
				}

				fileContent, _, _, err := githubClient.Repositories.GetContents(ctx, repoOwner, repoName, file, &github.RepositoryContentGetOptions{
					Ref: commit.GetID(),
				})
				if err != nil {
					return response.Error(500, "Failed to get file content", err)
				}

				// TODO: Support folders
				content, err := fileContent.GetContent()
				if err != nil {
					return response.Error(500, "Failed to get file content", err)
				}

				json, err := simplejson.NewJson([]byte(content))
				if err != nil {
					return response.Error(500, "Failed to parse file content", err)
				}

				dashboard := dashboards.NewDashboardFromJson(json)
				dashboard.FolderID = folder.ID
				dashboard.FolderUID = folder.UID
				dashboard.OrgID = orgID
				dashboard.Updated = time.Now()

				query := &dashboards.GetDashboardQuery{
					UID: dashboard.UID,
					// TODO: limitation by dashboard title
					Title:     &dashboard.Title,
					FolderID:  &folder.ID,
					FolderUID: &folder.UID,
					OrgID:     orgID,
				}

				existingDashboard, err := s.dashboardService.GetDashboard(ctx, query)
				if err != nil && !errors.Is(err, dashboards.ErrDashboardNotFound) {
					return response.Error(500, "Failed to get existing dashboard", err)
				}

				if existingDashboard == nil {
					s.logger.Warn("Modified dashboard not found", "file", file, "content", content)
					dashboard.Created = time.Now()
					dashboard.Version = 0
				} else {
					dashboard.UID = existingDashboard.UID
					dashboard.Version = existingDashboard.Version + 1
				}

				dto := &dashboards.SaveDashboardDTO{
					OrgID:     orgID,
					UpdatedAt: time.Now(),
					User:      githubSyncUser(orgID),
					Message:   commit.GetMessage(),
					Overwrite: true,
					Dashboard: dashboard,
				}
				_, err = s.dashboardService.ImportDashboard(ctx, dto)
				if err != nil {
					return response.Error(500, "Failed to import dashboard", err)
				}

				s.logger.Info("Dashboard modified", "file", file, "content", content, "dashboard", dashboard)
			}

			for _, file := range commit.Removed {
				s.logger.Info("File removed", "file", file)
				if !isDashboardRegex.MatchString(file) {
					s.logger.Info("Delete file is not a dashboard", "file", file, "folder", folder.UID)
					continue
				}

				// get file content from the previous commit
				fileContent, _, _, err := githubClient.Repositories.GetContents(ctx, repoOwner, repoName, file, &github.RepositoryContentGetOptions{
					Ref: beforeRef,
				})
				if err != nil {
					return response.Error(500, "Failed to get file content", err)
				}

				// TODO: Support folders
				content, err := fileContent.GetContent()
				if err != nil {
					return response.Error(500, "Failed to get file content", err)
				}

				json, err := simplejson.NewJson([]byte(content))
				if err != nil {
					return response.Error(500, "Failed to parse file content", err)
				}

				dashboard := dashboards.NewDashboardFromJson(json)

				query := &dashboards.GetDashboardQuery{
					UID: dashboard.UID,
					// TODO: limitation by dashboard title
					Title:     &dashboard.Title,
					FolderID:  &folder.ID,
					FolderUID: &folder.UID,
					OrgID:     orgID,
				}

				existingDashboard, err := s.dashboardService.GetDashboard(ctx, query)
				if err != nil && !errors.Is(err, dashboards.ErrDashboardNotFound) {
					return response.Error(500, "Failed to get existing dashboard", err)
				}

				if errors.Is(err, dashboards.ErrDashboardNotFound) {
					s.logger.Warn("Deleted dashboard not found", "file", file, "content", content)
				}

				if err := s.dashboardService.DeleteDashboard(ctx, existingDashboard.ID, orgID); err != nil {
					return response.Error(500, "Failed to delete dashboard", err)
				}

				s.logger.Info("Dashboard removed", "file", file)
			}

			// TODO: how to do the same for renamed files?
			beforeRef = commit.GetID()
		}

	default:
		return response.Error(400, "Unsupported event type", nil)
	}

	return response.Success("event successfully processed")
}

func (s *Service) ensureGithubSyncFolderExists(ctx context.Context, orgID int64, name string) (*folder.Folder, error) {
	// TODO: this folder should be created via API

	title := fmt.Sprintf("Github Sync - %s", name)
	description := "A folder containing all dashboards synced out of Github"

	getQuery := &folder.GetFolderQuery{
		Title:        &title,
		OrgID:        orgID,
		SignedInUser: githubSyncUser(orgID),
	}

	syncFolder, err := s.folderService.Get(ctx, getQuery)
	switch {
	case err == nil:
		return syncFolder, nil
	case !errors.Is(err, dashboards.ErrFolderNotFound):
		return nil, err
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
		return nil, err
	}

	return f, nil
}

func githubSyncUser(orgID int64) identity.Requester {
	// this user has 0 ID and therefore, organization wide quota will be applied
	return accesscontrol.BackgroundUser(
		// TODO: API response shows that it was created by anonymous user
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
