package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gopkg.in/yaml.v3"

	prommodel "github.com/prometheus/common/model"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/infra/log"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/folder"
	apimodels "github.com/grafana/grafana/pkg/services/ngalert/api/tooling/definitions"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/ngalert/prom"
)

const (
	datasourceUIDHeader        = "X-Datasource-Uid"
	datasourceTypeHeader       = "X-Datasource-Type"
	recordingRulesPausedHeader = "X-Recording-Rules-Paused"
	alertRulesPausedHeader     = "X-Alert-Rules-Paused"
)

type ConvertPrometheusSrv struct {
	logger          log.Logger
	ruleStore       RuleStore
	grafanaRulerSrv *RulerSrv
}

func (srv *ConvertPrometheusSrv) RouteConvertPrometheusGetRules(c *contextmodel.ReqContext) response.Response {
	logger := srv.logger.FromContext(c.Req.Context())

	namespaceMap, err := srv.ruleStore.GetUserVisibleNamespaces(c.Req.Context(), c.SignedInUser.GetOrgID(), c.SignedInUser)
	if err != nil {
		return ErrResp(http.StatusInternalServerError, err, "failed to get namespaces visible to the user")
	}

	if len(namespaceMap) == 0 {
		logger.Debug("User has no access to any namespaces")
		return response.YAML(http.StatusOK, map[string]interface{}{})
	}

	namespaceUIDs := make([]string, len(namespaceMap))
	for k := range namespaceMap {
		namespaceUIDs = append(namespaceUIDs, k)
	}

	true_val := true
	configs, _, err := srv.grafanaRulerSrv.searchAuthorizedAlertRules(c.Req.Context(), authorizedRuleGroupQuery{
		User:                   c.SignedInUser,
		NamespaceUIDs:          namespaceUIDs,
		ImportedPrometheusRule: &true_val,
	})
	if err != nil {
		return errorToResponse(err)
	}

	result := map[string][]apimodels.PrometheusRuleGroup{}

	for groupKey, rules := range configs {
		folder, ok := namespaceMap[groupKey.NamespaceUID]
		if !ok {
			id, _ := c.SignedInUser.GetInternalID()
			userNamespace := c.SignedInUser.GetIdentityType()
			logger.Error("Namespace not visible to the user", "user", id, "userNamespace", userNamespace, "namespace", groupKey.NamespaceUID)
			continue
		}

		promGroup, err := grafanaRuleGroupToPrometheus(groupKey.RuleGroup, rules)
		if err != nil {
			return errorToResponse(err)
		}

		result[folder.Fullpath] = append(result[folder.Fullpath], promGroup)
	}

	return response.YAML(http.StatusOK, result)
}

func (srv *ConvertPrometheusSrv) RouteConvertPrometheusDeleteNamespace(c *contextmodel.ReqContext, namespaceTitle string) response.Response {
	logger := srv.logger.FromContext(c.Req.Context())

	logger.Debug("Searching for the namespace", "fullpath", namespaceTitle)

	folder, err := srv.ruleStore.GetNamespaceByFullpath(c.Req.Context(), namespaceTitle, c.SignedInUser.GetOrgID(), c.SignedInUser)
	if err != nil {
		return toNamespaceErrorResponse(err)
	}

	logger.Debug("Found namespace", "namespace", folder.UID)

	return srv.grafanaRulerSrv.RouteDeleteAlertRules(c, folder.UID, "")
}

func (srv *ConvertPrometheusSrv) RouteConvertPrometheusDeleteRuleGroup(c *contextmodel.ReqContext, namespaceTitle string, group string) response.Response {
	logger := srv.logger.FromContext(c.Req.Context())

	logger.Debug("Searching for the namespace", "fullpath", namespaceTitle)

	folder, err := srv.ruleStore.GetNamespaceByFullpath(c.Req.Context(), namespaceTitle, c.SignedInUser.GetOrgID(), c.SignedInUser)
	if err != nil {
		return toNamespaceErrorResponse(err)
	}

	logger.Debug("Found namespace", "namespace", folder.UID)

	return srv.grafanaRulerSrv.RouteDeleteAlertRules(c, folder.UID, group)
}

func (srv *ConvertPrometheusSrv) RouteConvertPrometheusGetNamespace(c *contextmodel.ReqContext, namespaceTitle string) response.Response {
	logger := srv.logger.FromContext(c.Req.Context())

	logger.Debug("Searching for the namespace", "fullpath", namespaceTitle)

	namespace, err := srv.ruleStore.GetNamespaceByFullpath(c.Req.Context(), namespaceTitle, c.SignedInUser.GetOrgID(), c.SignedInUser)
	if err != nil {
		return toNamespaceErrorResponse(err)
	}
	if errors.Is(err, dashboards.ErrFolderAccessDenied) {
		// If there is no such folder, GetNamespaceByUID returns ErrFolderAccessDenied.
		// We should return 404 in this case, otherwise mimirtool does not work correctly.
		return response.Empty(http.StatusNotFound)
	}

	true_val := true
	ruleGroups, _, err := srv.grafanaRulerSrv.searchAuthorizedAlertRules(c.Req.Context(), authorizedRuleGroupQuery{
		User:                   c.SignedInUser,
		NamespaceUIDs:          []string{namespace.UID},
		ImportedPrometheusRule: &true_val,
	})
	if err != nil {
		return errorToResponse(err)
	}

	promNamespace := map[string][]apimodels.PrometheusRuleGroup{
		namespace.Fullpath: make([]apimodels.PrometheusRuleGroup, 0, len(ruleGroups)),
	}

	for groupKey, rules := range ruleGroups {
		promGroup, err := grafanaRuleGroupToPrometheus(groupKey.RuleGroup, rules)
		if err != nil {
			return errorToResponse(err)
		}
		promNamespace[namespace.Fullpath] = append(promNamespace[namespace.Fullpath], promGroup)
	}

	return response.YAML(http.StatusOK, promNamespace)
}

func (srv *ConvertPrometheusSrv) RouteConvertPrometheusGetRuleGroup(c *contextmodel.ReqContext, namespaceTitle string, group string) response.Response {
	logger := srv.logger.FromContext(c.Req.Context())

	logger.Debug("Searching for the namespace", "fullpath", namespaceTitle)

	namespace, err := srv.ruleStore.GetNamespaceByFullpath(c.Req.Context(), namespaceTitle, c.SignedInUser.GetOrgID(), c.SignedInUser)
	if err != nil {
		return toNamespaceErrorResponse(err)
	}
	if errors.Is(err, dashboards.ErrFolderAccessDenied) {
		// If there is no such folder, GetNamespaceByUID returns ErrFolderAccessDenied.
		// We should return 404 in this case, otherwise mimirtool does not work correctly.
		return response.Empty(http.StatusNotFound)
	}

	finalRuleGroup, err := getRulesGroupParam(c, group)
	if err != nil {
		return ErrResp(http.StatusBadRequest, err, "")
	}

	logger.Debug("Getting rules for the rule group", "rule_group", finalRuleGroup, "namespace_uid", namespace.UID)

	true_val := true
	rules, err := srv.grafanaRulerSrv.getAuthorizedRuleGroup(
		c.Req.Context(),
		c,
		models.AlertRuleGroupKey{
			OrgID:        c.SignedInUser.GetOrgID(),
			RuleGroup:    finalRuleGroup,
			NamespaceUID: namespace.UID,
		},
		&models.ListAlertRulesQuery{
			ImportedPrometheusRule: &true_val,
		},
	)
	if err != nil {
		return errorToResponse(err)
	}

	if len(rules) == 0 {
		return response.Empty(http.StatusNotFound)
	}

	promGroup, err := grafanaRuleGroupToPrometheus(group, rules)

	logger.Debug("Found rules in Prometheus format", "rule_group", group, "rules", len(rules))

	return response.YAML(http.StatusOK, promGroup)
}

func grafanaRuleGroupToPrometheus(group string, rules []*models.AlertRule) (apimodels.PrometheusRuleGroup, error) {
	if len(rules) == 0 {
		return apimodels.PrometheusRuleGroup{}, nil
	}

	interval := time.Duration(rules[0].IntervalSeconds) * time.Second
	promGroup := apimodels.PrometheusRuleGroup{
		Name:     group,
		Interval: prommodel.Duration(interval),
		Rules:    make([]apimodels.PrometheusRule, 0, len(rules)),
	}

	for _, rule := range rules {
		r, err := grafanaRuleToPrometheus(rule)
		if err != nil {
			return promGroup, errors.New("failed to convert rule")
		}
		promGroup.Rules = append(promGroup.Rules, r)
	}

	return promGroup, nil
}

func grafanaRuleToPrometheus(rule *models.AlertRule) (apimodels.PrometheusRule, error) {
	var r apimodels.PrometheusRule
	if err := yaml.Unmarshal([]byte(rule.Metadata.PrometheusStyleRule.OriginalRuleDefinition), &r); err != nil {
		return r, fmt.Errorf("failed to unmarshal rule with UID %s", rule.UID)
	}

	return r, nil
}

func (srv *ConvertPrometheusSrv) RouteConvertPrometheusPostRuleGroup(c *contextmodel.ReqContext, namespaceTitle string, promGroup apimodels.PrometheusRuleGroup) response.Response {
	logger := srv.logger.FromContext(c.Req.Context())

	ns, errResp := srv.getOrCreateNamespace(c, namespaceTitle, logger)
	if errResp != nil {
		return errResp
	}

	rules := make([]prom.PrometheusRule, 0, len(promGroup.Rules))
	for _, r := range promGroup.Rules {
		rule := prom.PrometheusRule{
			Alert:         r.Alert,
			Expr:          r.Expr,
			For:           r.For,
			KeepFiringFor: r.KeepFiringFor,
			Labels:        r.Labels,
			Annotations:   r.Annotations,
			Record:        r.Record,
		}
		rules = append(rules, rule)
	}

	group := prom.PrometheusRuleGroup{
		Name:  promGroup.Name,
		Rules: rules,
	}

	grafanaGroup, err := srv.convertToGrafanaRuleGroup(c, ns.UID, group, logger)
	if err != nil {
		return errorToResponse(err)
	}

	return srv.saveRuleGroup(c, ns.UID, grafanaGroup, logger)
}

func (srv *ConvertPrometheusSrv) getOrCreateNamespace(c *contextmodel.ReqContext, title string, logger log.Logger) (*folder.Folder, response.Response) {
	// TODO: Check permissions
	logger.Debug("Getting or creating a new namespace", "title", title)
	ns, err := srv.ruleStore.GetOrCreateNamespaceByTitle(
		c.Req.Context(),
		title,
		c.SignedInUser.GetOrgID(),
		c.SignedInUser,
	)
	if err != nil {
		logger.Error("Failed to create a new namespace", "error", err)
		return nil, toNamespaceErrorResponse(err)
	}
	return ns, nil
}

func (srv *ConvertPrometheusSrv) convertToGrafanaRuleGroup(c *contextmodel.ReqContext, namespaceUID string, group prom.PrometheusRuleGroup, logger log.Logger) (*models.AlertRuleGroup, error) {
	logger.Debug("Converting Prometheus rules to Grafana rules",
		"group", group.Name,
		"namespace_uid", namespaceUID,
		"rules", len(group.Rules),
	)

	converter, err := prom.NewConverter(
		prom.Config{
			DatasourceUID:  strings.TrimSpace(c.Req.Header.Get(datasourceUIDHeader)),
			DatasourceType: strings.TrimSpace(c.Req.Header.Get(datasourceTypeHeader)),
			RecordingRules: prom.RulesConfig{
				IsPaused: c.QueryBool(c.Req.Header.Get(recordingRulesPausedHeader)),
			},
			AlertRules: prom.RulesConfig{
				IsPaused: c.QueryBool(c.Req.Header.Get(alertRulesPausedHeader)),
			},
		},
	)
	if err != nil {
		logger.Error("Failed to create Prometheus converter", "error", err)
		return nil, err
	}

	grafanaGroup, err := converter.PrometheusRulesToGrafana(c.SignedInUser.GetOrgID(), namespaceUID, group)
	if err != nil {
		logger.Error("Failed to convert Prometheus rules to Grafana rules", "error", err)
		return nil, err
	}

	return grafanaGroup, nil
}

func (srv *ConvertPrometheusSrv) saveRuleGroup(c *contextmodel.ReqContext, namespaceUID string, grafanaGroup *models.AlertRuleGroup, logger log.Logger) response.Response {
	groupKey := models.AlertRuleGroupKey{
		OrgID:        c.SignedInUser.GetOrgID(),
		NamespaceUID: namespaceUID,
		RuleGroup:    grafanaGroup.Title,
	}

	rules := make([]*models.AlertRuleWithOptionals, 0, len(grafanaGroup.Rules))
	for _, r := range grafanaGroup.Rules {
		rules = append(rules, &models.AlertRuleWithOptionals{
			AlertRule: r,
		})
	}

	logger.Debug("Saving Prometheus rule group",
		"group", groupKey.RuleGroup,
		"namespace_uid", namespaceUID,
		"rules", len(rules),
	)

	// TODO: allow and set provenance
	changes, errResponse := srv.grafanaRulerSrv.updateAlertRulesInGroup(c, groupKey, rules)
	if errResponse != nil {
		logger.Error("Failed to save Prometheus rule group")
		return errResponse
	}

	return response.JSON(http.StatusAccepted, changes)
}
