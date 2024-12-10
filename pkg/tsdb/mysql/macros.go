package mysql

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/gtime"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/grafana/grafana/pkg/tsdb/mysql/sqleng"
)

var restrictedRegExp = regexp.MustCompile(`(?im)([\s]*show[\s]+grants|[\s,]session_user\([^\)]*\)|[\s,]current_user(\([^\)]*\))?|[\s,]system_user\([^\)]*\)|[\s,]user\([^\)]*\))([\s,;]|$)`)

type mySQLMacroEngine struct {
	logger    log.Logger
	userError string
}

func newMysqlMacroEngine(logger log.Logger, userFacingDefaultError string) sqleng.SQLMacroEngine {
	return &mySQLMacroEngine{
		logger:    logger,
		userError: userFacingDefaultError,
	}
}

func (m *mySQLMacroEngine) Interpolate(query *backend.DataQuery, timeRange backend.TimeRange, sql string) (string, error) {
	matches := restrictedRegExp.FindAllStringSubmatch(sql, 1)
	if len(matches) > 0 {
		m.logger.Error("Show grants, session_user(), current_user(), system_user() or user() not allowed in query")
		return "", fmt.Errorf("invalid query - %s", m.userError)
	}
	return sqlutil.Interpolate(&sqlutil.Query{RawSQL: sql}, sqlutil.Macros{
		"time": func(q *sqlutil.Query, args []string) (string, error) {
			if len(args) == 0 {
				return "", fmt.Errorf("missing time column argument for macro %v", "time")
			}
			return fmt.Sprintf("UNIX_TIMESTAMP(%s) as time_sec", args[0]), nil
		},
		"timeEpoch": func(q *sqlutil.Query, args []string) (string, error) {
			if len(args) == 0 {
				return "", fmt.Errorf("missing time column argument for macro %v", "timeEpoch")
			}
			return fmt.Sprintf("UNIX_TIMESTAMP(%s) as time_sec", args[0]), nil
		},
		"timeFilter": func(q *sqlutil.Query, args []string) (string, error) {
			if len(args) == 0 {
				return "", fmt.Errorf("missing time column argument for macro %v", "timeFilter")
			}
			if timeRange.From.UTC().Unix() < 0 {
				return fmt.Sprintf("%s BETWEEN DATE_ADD(FROM_UNIXTIME(0), INTERVAL %d SECOND) AND FROM_UNIXTIME(%d)", args[0], timeRange.From.UTC().Unix(), timeRange.To.UTC().Unix()), nil
			}
			return fmt.Sprintf("%s BETWEEN FROM_UNIXTIME(%d) AND FROM_UNIXTIME(%d)", args[0], timeRange.From.UTC().Unix(), timeRange.To.UTC().Unix()), nil
		},
		"timeFrom": func(q *sqlutil.Query, args []string) (string, error) {
			return fmt.Sprintf("FROM_UNIXTIME(%d)", timeRange.From.UTC().Unix()), nil
		},
		"timeTo": func(q *sqlutil.Query, args []string) (string, error) {
			return fmt.Sprintf("FROM_UNIXTIME(%d)", timeRange.To.UTC().Unix()), nil
		},
		"timeGroup": func(q *sqlutil.Query, args []string) (string, error) {
			return timeGroupMacro(args, "__timeGroup", query)
		},
		"timeGroupAlias": func(q *sqlutil.Query, args []string) (string, error) {
			tg, err := timeGroupMacro(args, "__timeGroup", query)
			if err == nil {
				return tg + " AS \"time\"", nil
			}
			return "", err
		},
		"unixEpochFilter": func(q *sqlutil.Query, args []string) (string, error) {
			if len(args) == 0 {
				return "", fmt.Errorf("missing time column argument for macro %v", "unixEpochFilter")
			}
			return fmt.Sprintf("%s >= %d AND %s <= %d", args[0], timeRange.From.UTC().Unix(), args[0], timeRange.To.UTC().Unix()), nil
		},
		"unixEpochNanoFilter": func(q *sqlutil.Query, args []string) (string, error) {
			if len(args) == 0 {
				return "", fmt.Errorf("missing time column argument for macro %v", "unixEpochNanoFilter")
			}
			return fmt.Sprintf("%s >= %d AND %s <= %d", args[0], timeRange.From.UTC().UnixNano(), args[0], timeRange.To.UTC().UnixNano()), nil
		},
		"unixEpochNanoFrom": func(q *sqlutil.Query, args []string) (string, error) {
			return fmt.Sprintf("%d", timeRange.From.UTC().UnixNano()), nil
		},
		"unixEpochNanoTo": func(q *sqlutil.Query, args []string) (string, error) {
			return fmt.Sprintf("%d", timeRange.To.UTC().UnixNano()), nil
		},
		"unixEpochGroup": func(q *sqlutil.Query, args []string) (string, error) {
			return unixEpochGroupMacro(args, "__unixEpochGroup", query)
		},
		"unixEpochGroupAlias": func(q *sqlutil.Query, args []string) (string, error) {
			tg, err := unixEpochGroupMacro(args, "__unixEpochGroup", query)
			if err == nil {
				return tg + " AS \"time\"", nil
			}
			return "", err
		},
	})
}

func timeGroupMacro(args []string, name string, query *backend.DataQuery) (string, error) {
	if len(args) < 2 {
		return "", fmt.Errorf("macro %v needs time column and interval", name)
	}
	interval, err := gtime.ParseInterval(strings.Trim(args[1], `'"`))
	if err != nil {
		return "", fmt.Errorf("error parsing interval %v", args[1])
	}
	if len(args) == 3 {
		err := sqleng.SetupFillmode(query, interval, args[2])
		if err != nil {
			return "", err
		}
	}
	return fmt.Sprintf("UNIX_TIMESTAMP(%s) DIV %.0f * %.0f", args[0], interval.Seconds(), interval.Seconds()), nil
}

func unixEpochGroupMacro(args []string, name string, query *backend.DataQuery) (string, error) {
	if len(args) < 2 {
		return "", fmt.Errorf("macro %v needs time column and interval and optional fill value", name)
	}
	interval, err := gtime.ParseInterval(strings.Trim(args[1], `'`))
	if err != nil {
		return "", fmt.Errorf("error parsing interval %v", args[1])
	}
	if len(args) == 3 {
		err := sqleng.SetupFillmode(query, interval, args[2])
		if err != nil {
			return "", err
		}
	}
	return fmt.Sprintf("%s DIV %v * %v", args[0], interval.Seconds(), interval.Seconds()), nil
}
