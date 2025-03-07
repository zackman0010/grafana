package expr

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana/pkg/expr/mathexp"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
)

func TestNewCommand(t *testing.T) {
	cmd, err := NewSQLCommand("a", "select a from foo, bar")
	if err != nil && strings.Contains(err.Error(), "feature is not enabled") {
		return
	}

	if err != nil {
		t.Fail()
		return
	}

	for _, v := range cmd.varsToQuery {
		if strings.Contains("foo bar", v) {
			continue
		}
		t.Fail()
		return
	}
}

// Helper functions for creating test data
func createFrameWithRows(rows int) *data.Frame {
	values := make([]string, rows)
	for i := range values {
		values[i] = "dummy"
	}
	return data.NewFrame("dummy", data.NewField("dummy", nil, values))
}

func createVarsWithFrames(frames ...*data.Frame) mathexp.Vars {
	vars := mathexp.Vars{}
	for i, frame := range frames {
		varName := fmt.Sprintf("var_%d", i)
		vars[varName] = mathexp.Results{
			Values: mathexp.Values{mathexp.TableData{Frame: frame}},
		}
	}
	return vars
}

func TestSQLCommandRowLimits(t *testing.T) {
	tests := []struct {
		name          string
		limit         int64
		rowsPerFrame  []int
		expectError   bool
		errorContains string
	}{
		{
			name:         "multiple frames within limit",
			limit:        4,
			rowsPerFrame: []int{2, 2},
		},
		{
			name:          "multiple frames exceed limit",
			limit:         3,
			rowsPerFrame:  []int{2, 2},
			expectError:   true,
			errorContains: "exceeds limit",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd, err := NewSQLCommand("test", "select * from dummy")
			require.NoError(t, err, "Failed to create SQL command")

			cmd.limit = tt.limit

			// Create frames with specified number of rows
			frames := make([]*data.Frame, len(tt.rowsPerFrame))
			for i, rows := range tt.rowsPerFrame {
				frames[i] = createFrameWithRows(rows)
			}

			vars := createVarsWithFrames(frames...)

			_, err = cmd.Execute(context.Background(), time.Now(), vars, &testTracer{})

			if tt.expectError {
				require.Error(t, err)
				require.Contains(t, err.Error(), tt.errorContains)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

type testTracer struct {
	trace.Tracer
}

func (t *testTracer) Start(ctx context.Context, name string, s ...trace.SpanStartOption) (context.Context, trace.Span) {
	return ctx, &testSpan{}
}
func (t *testTracer) Inject(context.Context, http.Header, trace.Span) {

}

type testSpan struct {
	trace.Span
}

func (ts *testSpan) End(opt ...trace.SpanEndOption) {
}
