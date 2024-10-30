package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/grafana/authlib/authz"
	"github.com/grafana/authlib/claims"

	"github.com/grafana/grafana/pkg/apimachinery/utils"
	dashboardalpha1 "github.com/grafana/grafana/pkg/apis/dashboard/v0alpha1"
	folderalpha1 "github.com/grafana/grafana/pkg/apis/folder/v0alpha1"

	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/authz/zanzana"
	authzextv1 "github.com/grafana/grafana/pkg/services/authz/zanzana/proto/v1"
	"github.com/grafana/grafana/pkg/services/dashboards"
)

const (
	// If search query string shorter than this value, then "List, then check" strategy will be used
	listQueryLengthThreshold = 8
	// If query limit set to value higher than this value, then "List, then check" strategy will be used
	listQueryLimitThreshold = 50
	defaultQueryLimit       = 1000
)

type searchResult struct {
	runner   string
	result   []dashboards.DashboardSearchProjection
	err      error
	duration time.Duration
}

func (dr *DashboardServiceImpl) FindDashboardsZanzana(ctx context.Context, query *dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	if dr.cfg.Zanzana.ZanzanaOnlyEvaluation {
		return dr.findDashboardsZanzanaOnly(ctx, *query)
	}
	return dr.findDashboardsZanzanaCompare(ctx, *query)
}

func (dr *DashboardServiceImpl) findDashboardsZanzanaOnly(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	timer := prometheus.NewTimer(dr.metrics.searchRequestsDuration.WithLabelValues("zanzana"))
	defer timer.ObserveDuration()

	return dr.findDashboardsZanzana(ctx, query)
}

func (dr *DashboardServiceImpl) findDashboardsZanzanaCompare(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	result := make(chan searchResult, 2)

	go func() {
		timer := prometheus.NewTimer(dr.metrics.searchRequestsDuration.WithLabelValues("zanzana"))
		defer timer.ObserveDuration()
		start := time.Now()

		queryZanzana := query
		res, err := dr.findDashboardsZanzana(ctx, queryZanzana)
		result <- searchResult{"zanzana", res, err, time.Since(start)}
	}()

	go func() {
		timer := prometheus.NewTimer(dr.metrics.searchRequestsDuration.WithLabelValues("grafana"))
		defer timer.ObserveDuration()
		start := time.Now()

		res, err := dr.FindDashboards(ctx, &query)
		result <- searchResult{"grafana", res, err, time.Since(start)}
	}()

	first, second := <-result, <-result
	close(result)

	if second.runner == "grafana" {
		first, second = second, first
	}

	if second.err != nil {
		dr.log.Error("zanzana search failed", "error", second.err)
		dr.metrics.searchRequestStatusTotal.WithLabelValues("error").Inc()
	} else if len(first.result) != len(second.result) {
		dr.metrics.searchRequestStatusTotal.WithLabelValues("error").Inc()
		dr.log.Warn(
			"zanzana search result does not match grafana",
			"grafana_result_len", len(first.result),
			"zanana_result_len", len(second.result),
			"grafana_duration", first.duration,
			"zanzana_duration", second.duration,
			"title", query.Title,
			"missing", findMissing(first.result, second.result),
		)

	} else {
		dr.metrics.searchRequestStatusTotal.WithLabelValues("success").Inc()
		dr.log.Info("zanzana search is correct", "grafana_len", len(first.result), "zanzana_len", len(first.result), "grafana_duration", first.duration, "zanzana_duration", second.duration)
	}

	return first.result, first.err
}

func findMissing(a, b []dashboards.DashboardSearchProjection) []string {
	lookup := make(map[string]struct{}, 0)
	for _, s := range b {
		lookup[s.UID] = struct{}{}
	}

	var missing []string
	for _, s := range a {
		if _, ok := lookup[s.UID]; !ok {
			uid := fmt.Sprintf("folder:%s", s.UID)
			if !s.IsFolder {
				uid = fmt.Sprintf("dashboard:%s:parent:%s", s.UID, s.FolderUID)
			}
			missing = append(missing, uid)
		}
	}

	return missing

}

func (dr *DashboardServiceImpl) findDashboardsZanzana(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	if query.Limit < 1 {
		query.Limit = 1000
	}

	if query.Page < 1 {
		query.Page = 1
	}
	findDashboards := dr.getFindDashboardsFn(query)
	return findDashboards(ctx, query)
}

type findDashboardsFn func(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error)

// getFindDashboardsFn makes a decision which search method should be used
func (dr *DashboardServiceImpl) getFindDashboardsFn(query dashboards.FindPersistedDashboardsQuery) findDashboardsFn {
	/*
		if query.Limit > 0 && query.Limit < listQueryLimitThreshold && len(query.Title) > 0 {
			return dr.findDashboardsZanzanaCheck
		}
		if len(query.DashboardUIDs) > 0 || len(query.DashboardIds) > 0 {
			return dr.findDashboardsZanzanaCheck
		}
		if len(query.FolderUIDs) > 0 {
			return dr.findDashboardsZanzanaCheck
		}
		if len(query.Title) <= listQueryLengthThreshold {
			return dr.findDashboardsZanzanaList
		}
		return dr.findDashboardsZanzanaCheck
	*/

	if false {
		return dr.findDashboardsZanzanaGeneric
	} else if false {
		return dr.findDashboardsZanzanaGenericCheck
	} else {
		return dr.findDashboardsZanzanaGenericBatchCheck
	}
}

func (dr *DashboardServiceImpl) findDashboardsZanzanaGeneric(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	dashCheck, err := dr.zclient.Compile(ctx, query.SignedInUser, authz.ListRequest{
		Group:    dashboardalpha1.DashboardResourceInfo.GroupResource().Group,
		Resource: dashboardalpha1.DashboardResourceInfo.GroupResource().Resource,
	})

	if err != nil {
		return nil, err
	}

	folderCheck, err := dr.zclient.Compile(ctx, query.SignedInUser, authz.ListRequest{
		Group:    folderalpha1.FolderResourceInfo.GroupResource().Group,
		Resource: folderalpha1.FolderResourceInfo.GroupResource().Resource,
	})

	if err != nil {
		return nil, err
	}

	if query.Page < 1 {
		query.Page = 1
	}

	// Remember initial query limit
	limit := query.Limit

	// Set limit to default to prevent pagination issues
	query.Limit = defaultQueryLimit
	query.SkipAccessControlFilter = true

	result := make([]dashboards.DashboardSearchProjection, 0, query.Limit)

outer:
	for len(result) < int(limit) {
		findRes, err := dr.dashboardStore.FindDashboards(ctx, &query)
		if err != nil {
			return nil, err
		}

		if len(findRes) == 0 {
			break outer
		}

		if err != nil {
			return nil, err
		}

		for _, r := range findRes {
			if len(result) == int(limit) {
				break outer
			}

			if r.IsFolder {
				if folderCheck("", r.UID, "") {
					result = append(result, r)
				}
			} else {
				if dashCheck("", r.UID, r.FolderUID) {
					result = append(result, r)
				}
			}
		}

		query.Page += 1
	}

	return result, nil
}

func (dr *DashboardServiceImpl) findDashboardsZanzanaGenericBatchCheck(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	if query.Page < 1 {
		query.Page = 1
	}

	// Remember initial query limit
	limit := query.Limit

	// Set limit to default to prevent pagination issues
	query.Limit = defaultQueryLimit
	query.SkipAccessControlFilter = true

	result := make([]dashboards.DashboardSearchProjection, 0, query.Limit)

outer:
	for len(result) < int(limit) {
		findRes, err := dr.dashboardStore.FindDashboards(ctx, &query)
		if err != nil {
			return nil, err
		}

		if len(findRes) == 0 {
			break outer
		}

		if err != nil {
			return nil, err
		}

		foldersCheck := &authzextv1.BatchCheckRequest{
			Verb:     utils.VerbGet,
			Group:    folderalpha1.FolderResourceInfo.GroupResource().Group,
			Resource: folderalpha1.FolderResourceInfo.GroupResource().Resource,
		}

		dashboardsCheck := &authzextv1.BatchCheckRequest{
			Verb:     utils.VerbGet,
			Group:    dashboardalpha1.DashboardResourceInfo.GroupResource().Group,
			Resource: dashboardalpha1.DashboardResourceInfo.GroupResource().Resource,
		}

		for _, r := range findRes {
			if r.IsFolder {
				foldersCheck.Items = append(foldersCheck.Items, &authzextv1.BatchCheckItem{Name: r.UID})
			} else {
				dashboardsCheck.Items = append(dashboardsCheck.Items, &authzextv1.BatchCheckItem{Name: r.UID, Folder: r.FolderUID})
			}
		}

		foldersRes, err := dr.zclient.BatchCheck(ctx, query.SignedInUser, foldersCheck)
		if err != nil {
			return nil, err
		}

		dashboardsRes, err := dr.zclient.BatchCheck(ctx, query.SignedInUser, dashboardsCheck)
		if err != nil {
			return nil, err
		}

		for _, r := range findRes {
			if len(result) == int(limit) {
				break outer
			}

			if r.IsFolder {
				if foldersRes.Items[r.UID] {
					result = append(result, r)
				}
			} else {
				if dashboardsRes.Items[r.UID] {
					result = append(result, r)
				}
			}
		}

		query.Page += 1
	}

	return result, nil
}

func (dr *DashboardServiceImpl) findDashboardsZanzanaGenericCheck(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	if query.Page < 1 {
		query.Page = 1
	}

	// Remember initial query limit
	limit := query.Limit

	// Set limit to default to prevent pagination issues
	query.Limit = defaultQueryLimit
	query.SkipAccessControlFilter = true

	result := make([]dashboards.DashboardSearchProjection, 0, query.Limit)

outer:
	for len(result) < int(limit) {
		findRes, err := dr.dashboardStore.FindDashboards(ctx, &query)
		if err != nil {
			return nil, err
		}

		if len(findRes) == 0 {
			break outer
		}

		if err != nil {
			return nil, err
		}

		for _, r := range findRes {
			if len(result) == int(limit) {
				break outer
			}

			if r.IsFolder {
				res, err := dr.zclient.Check(ctx, query.SignedInUser, authz.CheckRequest{
					Verb:     utils.VerbGet,
					Group:    folderalpha1.FolderResourceInfo.GroupResource().Group,
					Resource: folderalpha1.FolderResourceInfo.GroupResource().Resource,
					Name:     r.UID,
				})
				if err != nil {
					return nil, err
				}

				if res.Allowed {
					result = append(result, r)
				}

			} else {
				res, err := dr.zclient.Check(ctx, query.SignedInUser, authz.CheckRequest{
					Verb:     utils.VerbGet,
					Name:     r.UID,
					Group:    dashboardalpha1.DashboardResourceInfo.GroupResource().Group,
					Resource: dashboardalpha1.DashboardResourceInfo.GroupResource().Resource,
					Folder:   r.FolderUID,
				})
				if err != nil {
					return nil, err
				}

				if res.Allowed {
					result = append(result, r)
				}
			}
		}

		query.Page += 1
	}

	return result, nil
}

// findDashboardsZanzanaCheck implements "Search, then check" strategy. It first performs search query, then filters out results
// by checking access to each item.
func (dr *DashboardServiceImpl) findDashboardsZanzanaCheck(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	ctx, span := tracer.Start(ctx, "dashboards.service.findDashboardsZanzanaCheck")
	defer span.End()

	result := make([]dashboards.DashboardSearchProjection, 0, query.Limit)
	var page int64 = 1
	query.SkipAccessControlFilter = true
	// Remember initial query limit
	limit := query.Limit
	// Set limit to default to prevent pagination issues
	query.Limit = defaultQueryLimit

	for len(result) < int(limit) {
		query.Page = page
		findRes, err := dr.dashboardStore.FindDashboards(ctx, &query)
		if err != nil {
			return nil, err
		}

		remains := limit - int64(len(result))
		res, err := dr.checkDashboards(ctx, query, findRes, remains)
		if err != nil {
			return nil, err
		}

		result = append(result, res...)
		page++

		// Stop when last page reached
		if len(findRes) < defaultQueryLimit {
			break
		}
	}

	return result, nil
}

func (dr *DashboardServiceImpl) checkDashboards(ctx context.Context, query dashboards.FindPersistedDashboardsQuery, searchRes []dashboards.DashboardSearchProjection, remains int64) ([]dashboards.DashboardSearchProjection, error) {
	ctx, span := tracer.Start(ctx, "dashboards.service.checkDashboards")
	defer span.End()

	if len(searchRes) == 0 {
		return nil, nil
	}

	orgId := query.OrgId
	if orgId == 0 && query.SignedInUser.GetOrgID() != 0 {
		orgId = query.SignedInUser.GetOrgID()
	} else {
		return nil, dashboards.ErrUserIsNotSignedInToOrg
	}

	concurrentRequests := dr.cfg.Zanzana.ConcurrentChecks
	var wg sync.WaitGroup
	res := make([]dashboards.DashboardSearchProjection, 0)
	resToCheck := make(chan dashboards.DashboardSearchProjection, concurrentRequests)
	allowedResults := make(chan dashboards.DashboardSearchProjection, len(searchRes))

	for i := 0; i < int(concurrentRequests); i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for d := range resToCheck {
				if int64(len(allowedResults)) >= remains {
					return
				}

				objectType := zanzana.TypeDashboard
				if d.IsFolder {
					objectType = zanzana.TypeFolder
				}

				req := accesscontrol.CheckRequest{
					Namespace: claims.OrgNamespaceFormatter(orgId),
					User:      query.SignedInUser.GetUID(),
					Relation:  "read",
					Object:    zanzana.NewScopedTupleEntry(objectType, d.UID, "", strconv.FormatInt(orgId, 10)),
				}

				if objectType != zanzana.TypeFolder {
					// Pass parentn folder for the correct check
					req.Parent = d.FolderUID
					req.ObjectType = objectType
				}

				allowed, err := dr.ac.Check(ctx, req)
				if err != nil {
					dr.log.Error("error checking access", "error", err)
				} else if allowed {
					allowedResults <- d
				}
			}
		}()
	}

	for _, r := range searchRes {
		resToCheck <- r
	}
	close(resToCheck)

	wg.Wait()
	close(allowedResults)

	for r := range allowedResults {
		if int64(len(res)) >= remains {
			break
		}
		res = append(res, r)
	}

	return res, nil
}

// findDashboardsZanzanaList implements "List, then search" strategy. It first retrieve a list of resources
// with given type available to the user and then passes that list as a filter to the search query.
func (dr *DashboardServiceImpl) findDashboardsZanzanaList(ctx context.Context, query dashboards.FindPersistedDashboardsQuery) ([]dashboards.DashboardSearchProjection, error) {
	// Always use "search, then check" if dashboard or folder UIDs provided. Otherwise we should make intersection
	// of user's resources and provided UIDs which might not be correct if ListObjects() request is limited by OpenFGA.
	if len(query.DashboardUIDs) > 0 || len(query.DashboardIds) > 0 || len(query.FolderUIDs) > 0 {
		return dr.findDashboardsZanzanaCheck(ctx, query)
	}

	ctx, span := tracer.Start(ctx, "dashboards.service.findDashboardsZanzanaList")
	defer span.End()

	var result []dashboards.DashboardSearchProjection

	allowedFolders, err := dr.listAllowedResources(ctx, query, zanzana.TypeFolder)
	if err != nil {
		return nil, err
	}

	if len(allowedFolders) > 0 {
		// Find dashboards in folders that user has access to
		query.SkipAccessControlFilter = true
		query.FolderUIDs = allowedFolders
		result, err = dr.dashboardStore.FindDashboards(ctx, &query)
		if err != nil {
			return nil, err
		}
	}

	// skip if limit reached
	rest := query.Limit - int64(len(result))
	if rest <= 0 {
		return result, nil
	}

	// Run second query to find dashboards with direct permission assignments
	allowedDashboards, err := dr.listAllowedResources(ctx, query, zanzana.TypeDashboard)
	if err != nil {
		return nil, err
	}

	if len(allowedDashboards) > 0 {
		query.FolderUIDs = []string{}
		query.DashboardUIDs = allowedDashboards
		query.Limit = rest
		dashboardRes, err := dr.dashboardStore.FindDashboards(ctx, &query)
		if err != nil {
			return nil, err
		}
		result = append(result, dashboardRes...)
	}

	return result, err
}

func (dr *DashboardServiceImpl) listAllowedResources(ctx context.Context, query dashboards.FindPersistedDashboardsQuery, resourceType string) ([]string, error) {
	res, err := dr.ac.ListObjects(ctx, accesscontrol.ListObjectsRequest{
		User:     query.SignedInUser.GetUID(),
		Type:     resourceType,
		Relation: "read",
	})
	if err != nil {
		return nil, err
	}

	orgId := query.OrgId
	if orgId == 0 && query.SignedInUser.GetOrgID() != 0 {
		orgId = query.SignedInUser.GetOrgID()
	} else {
		return nil, dashboards.ErrUserIsNotSignedInToOrg
	}
	// dashboard:<orgId>-
	prefix := fmt.Sprintf("%s:%d-", resourceType, orgId)

	resourceUIDs := make([]string, 0)
	for _, d := range res {
		if uid, found := strings.CutPrefix(d, prefix); found {
			resourceUIDs = append(resourceUIDs, uid)
		}
	}

	return resourceUIDs, nil
}
