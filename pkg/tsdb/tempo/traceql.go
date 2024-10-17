package tempo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/tracing"
	"github.com/grafana/grafana/pkg/tsdb/tempo/kinds/dataquery"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

func (s *Service) getMetrics(ctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) (*backend.DataResponse, error) {
	ctxLogger := s.logger.FromContext(ctx)
	ctxLogger.Debug("Getting trace", "function", logEntrypoint())

	result := &backend.DataResponse{}
	//	refID := query.RefID

	ctx, span := tracing.DefaultTracer().Start(ctx, "datasource.tempo.getMetrics", trace.WithAttributes(
		attribute.String("queryType", query.QueryType),
	))
	defer span.End()

	model := &dataquery.TempoQuery{}
	err := json.Unmarshal(query.JSON, model)
	if err != nil {
		ctxLogger.Error("Failed to unmarshall Tempo query model", "error", err, "function", logEntrypoint())
		return result, err
	}

	dsInfo, err := s.getDSInfo(ctx, pCtx)
	if err != nil {
		ctxLogger.Error("Failed to get datasource information", "error", err, "function", logEntrypoint())
		return nil, err
	}

	if model.Query == nil || *model.Query == "" {
		err := fmt.Errorf("query is required")
		ctxLogger.Error("Failed to validate model query", "error", err, "function", logEntrypoint())
		return result, err
	}

	request, err := s.createMetricsRequest(ctx, dsInfo, *model.Query, query.TimeRange.From.Unix(), query.TimeRange.To.Unix())
	if err != nil {
		ctxLogger.Error("Failed to create request", "error", err, "function", logEntrypoint())
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return result, err
	}

	resp, err := dsInfo.HTTPClient.Do(request)
	if err != nil {
		ctxLogger.Error("Failed to send request to Tempo", "error", err, "function", logEntrypoint())
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return result, fmt.Errorf("failed get to tempo: %w", err)
	}

	defer func() {
		if err := resp.Body.Close(); err != nil {
			ctxLogger.Error("Failed to close response body", "error", err, "function", logEntrypoint())
		}
	}()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		ctxLogger.Error("Failed to read response body", "error", err, "function", logEntrypoint())
		return &backend.DataResponse{}, err
	}

	s.logger.FromContext(ctx).Info("Metrics response", "body", string(body))

	// TODO

	return &backend.DataResponse{}, nil
}

func (s *Service) createMetricsRequest(ctx context.Context, dsInfo *Datasource, query string, start int64, end int64) (*http.Request, error) {
	ctxLogger := s.logger.FromContext(ctx)
	var tempoQuery string

	vs := url.Values{}
	vs.Add("q", query)
	vs.Add("start", fmt.Sprintf("%d", start))
	vs.Add("end", fmt.Sprintf("%d", end))

	tempoQuery = fmt.Sprintf("%s/api/metrics/query_range?%s", dsInfo.URL, vs.Encode())

	s.logger.FromContext(ctx).Info("Creating metrics query", "path", tempoQuery)

	req, err := http.NewRequestWithContext(ctx, "GET", tempoQuery, nil)
	if err != nil {
		ctxLogger.Error("Failed to create request", "error", err, "function", logEntrypoint())
		return nil, err
	}

	req.Header.Set("Accept", "application/protobuf")
	return req, nil
}
