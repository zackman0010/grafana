import { lokiInstantQueryTool } from 'app/features/dash/agent/tools/lokiInstantQuery';
import { lokiRangeQueryTool } from 'app/features/dash/agent/tools/lokiRangeQuery';

export const queryLanguageGuide = `
# Query Language Quick Reference

## LogQL (Loki)

- To return limited number of logs, use tool parameters ${lokiInstantQueryTool.name} or ${lokiRangeQueryTool.name}.
- Avoid asking broad logql labels selectors: {app=".*"}, {cluster="foo"}, {namespace=".*"}
- You cannot limit the number of logs in LogQL you need to use the tool parameter. (eg. \`{app="frontend"} | limit 10\` is not syntactically correct)

Use backticks to escape strings in the query specially for regexes and go template syntax in queries. |= \`foo\`

### Basic Structure
\`\`\`
{label="value"} |> pipeline operations
\`\`\`

### Log Stream Selection
- \`{app="frontend", env="prod"}\` - Simple label matching
- \`{app=~"api.*", env!~"test|dev"}\` - Regex matching
- \`{app="frontend", status="500"}\` - Multiple labels

### Label Matchers
- \`=\` - Exactly equal
- \`!=\` - Not equal
- \`=~\` - Regex match
- \`!~\` - Regex does not match


## Union Operations / or operations for logs

Important: or operations is only support for fields {app="foo"} | duration > 10s or level="error"
To combine multiple search use regex:

- {app="foo|bar"}
- {app="foo"} |~ "error|warning"

### Pipeline Operations
- \`|= "error"\` - Contains text
- \`|!= "timeout"\` - Does not contain
- \`|~ \`"error.*timeout"\`\` - Regex match
- \`|!~ \`"expected"\`\` - Negative regex


### Parser Operations

Parser allows to add extra labels/fields to the log line that can be used in the query for filtering (| msg="error") and grouping (by msg).

- \`| json\` - Parse JSON
- \`| logfmt\` - Parse logfmt format
- \`| pattern "<pattern>"\` - Parse using patterns
- \`| regexp "<regex>"\` - Parse using regexp go regex syntax
- \`| unpack\` - Unpack JSON into labels flattening the JSON object into labels.

### Transformations

- \`| line_format "{{.level}}: {{.message}}"\` - Format log line using fields and labels go template syntax
- \`| label_format status_code="{{.status}}"\` - Create/modify labels from other labels or fields using go template syntax
- \`| drop level, method="GET"\` - Remove labels from the log line
- \`| keep level, status\` - Keep only specified labels (useful to remove high cardinality labels)
- \`| unwrap duration\` - Convert label to sample value used with range vector functions aka transform logs to metrics

### Template Functions
- \`{{.foo}}\` - Reference label value
- \`{{__line__}}\` - Original log line
- \`{{__error__}}\` - Error message
- \`{{toLower .val}}\` - Convert to lowercase
- \`{{toUpper .val}}\` - Convert to uppercase
- \`{{len .val}}\` - Length of string
- \`{{regexReplaceAll pattern .val replacement}}\` - Regex replace

### Metric Queries

Extracted data from parsers in pipelines can be used to transform logs into metrics. Be careful with high cardinality as it can impact performance.

#### Basic Structures

Log Selector always needs to be aggregated with Range Vector Operations first then you can use Aggregation Operators to aggregate by labels.
Range aggregation interval e.g [1m] should be as the query step to cover the whole time range.

Unlike Prometheus, some of those range operations allow you to use grouping without vector operations.
This is the case for avg_over_time, max_over_time, min_over_time, stdvar_over_time, stddev_over_time, and quantile_over_time.
This is super useful to aggregate the data on specific dimensions and would not be possible otherwise.

With the exception of rate(), count_over_time() use vector aggregations to group by labels.

For range vector most functions needs to unwraped first to transform logs samples to metrics samples.
You should always use grouping either by or vector aggregations or range vector functions directly if supported to get the desired result.

Avoid querying with only regex selectors as it will return a lot of data and impact performance. {service_name=~".+"}
Always filter with at least one label to narrow down the data.


Valid:
topk(20, count by (service_name, pod) (count_over_time({service_name=~"foo", pod=~"bar"}[5m])))
sum by (service_name, pod) (count_over_time({service_name=~"foo", pod=~"bar"}[5m]))
quantile_over_time(0.99,{cluster="ops-tools1",container="ingress-nginx"}| json| __error__ = ""| unwrap request_time [1m])) by (path)
sum by (foo) (rate({app="frontend"}[5m]))

Invalid:
topk(20, count by (service_name, pod) ({service_name=~"foo", pod=~"bar"}))
count_over_time({service_name=~"foo", pod=~"bar"}[5m])) by (service_name, pod)
quantile_over_time(0.95, count by (service_name, pod) (count_over_time({service_name=~"foo", pod=~"bar"}[5m])))
quantile_over_time(0.95, sum by (service_name, pod) (count_over_time({service_name=~"foo", pod=~"bar"}[5m])))
quantile_over_time(0.95,{service_name=~"foo", pod=~"bar"}[5m]))
sum_over_time by (foo) (rate({app="frontend"}[5m]))
rate({app="frontend"}[5m]) by (foo)





Use a good combination of drop/keep, by on range vector and vector aggregations to get the desired result.

\`\`\`
# Count log lines by label
sum by(label) (count_over_time({app="frontend"}[5m]))

# Unwrapping numerical values from logs
sum by(label) (rate({app="frontend"} | json | unwrap duration[5m]))

# Range vector selector format
{label="value"}[5m] | <parser> | unwrap <label_name>

# Binary operations
sum(rate({app="frontend"}[5m])) / sum(rate({app="backend"}[5m]))
\`\`\`

#### Common Patterns

- \`sum by(status) (count_over_time({app="frontend"}[5m]))\` - Count logs grouped by status
- \`max by(instance) (rate({app="frontend"} | json | unwrap response_time[5m]))\` - Maximum rate by instance
- \`avg(rate({app="frontend"} | json | unwrap duration[5m]))\` - Average value across all streams
- \`histogram_quantile(0.95, sum by(le) (rate({app="frontend"} | json | unwrap duration[5m]))) by (namespace)\` - Percentile from histogram buckets
- \`sum by(method, status) (rate({app="frontend"} | json | unwrap request_count[5m]))\` - Multi-dimension grouping
- \`topk(5, sum by(path) (rate({app="frontend"} | json | unwrap request_time[5m])))\` - Top 5 values by path

### Range Vector Operations
- \`rate({app="frontend"}[5m])\` - Per-second rate
- \`count_over_time({app="frontend"}[5m])\` - Count logs
- \`sum_over_time({app="frontend"} | unwrap bytes[5m])\` - Sum of values
- \`avg_over_time(...)\` - Average over time
- \`max_over_time(...)\` - Maximum over time
- \`min_over_time(...)\` - Minimum over time
- \`quantile_over_time(0.95, ...)\` - Calculate percentile
- \`stddev_over_time(...)\` - Standard deviation
- \`stdvar_over_time(...)\` - Standard variance
- \`first_over_time(...)\` - First value in range
- \`last_over_time(...)\` - Last value in range

### Aggregation Operators
- \`sum\` - Sum values
- \`avg\` - Calculate average
- \`count\` - Count entries
- \`max\` - Maximum value
- \`min\` - Minimum value
- \`topk\` - Top K entries
- \`bottomk\` - Bottom K entries
- \`stddev\` - Standard deviation
- \`stdvar\` - Standard variance

## PromQL (Prometheus)

### Basic Structure
\`\`\`
metric_name{label="value"}[time_range] operator
\`\`\`

### Metric Selection
- \`http_requests_total\` - All values for metric
- \`http_requests_total{status="500"}\` - Label matching
- \`http_requests_total{status!="200"}\` - Negative matching
- \`http_requests_total{status=~"5.."}\` - Regex matching

### Label Matchers
- \`=\` - Exactly equal
- \`!=\` - Not equal
- \`=~\` - Regex match
- \`!~\` - Regex does not match

### Time Ranges
- \`[5m]\` - Last 5 minutes
- \`[1h]\` - Last hour
- \`[1d]\` - Last day
- \`[1w]\` - Last week

### Range Vector Functions
- \`rate(http_requests_total[5m])\` - Per-second rate
- \`irate(http_requests_total[5m])\` - Instant rate (last two samples)
- \`increase(http_requests_total[1h])\` - Absolute increase
- \`delta(temperature[1h])\` - Difference between first and last
- \`idelta(temperature[1h])\` - Difference between last two samples
- \`sum_over_time(temperature[1h])\` - Sum values
- \`avg_over_time(temperature[1h])\` - Average values
- \`min_over_time(temperature[1h])\` - Minimum value
- \`max_over_time(temperature[1h])\` - Maximum value
- \`stddev_over_time(temperature[1h])\` - Standard deviation
- \`stdvar_over_time(temperature[1h])\` - Standard variance
- \`quantile_over_time(0.99, temperature[1h])\` - Percentile
- \`count_over_time(temperature[1h])\` - Count samples
- \`last_over_time(temperature[1h])\` - Last value
- \`present_over_time(temperature[1h])\` - Whether metric exists
- \`absent_over_time(temperature[1h])\` - Whether metric is absent

### Aggregation Operators
- \`sum by(status) (rate(http_requests_total[5m]))\` - Sum by label
- \`avg by(instance) (...)\` - Average by label
- \`min by(instance) (...)\` - Minimum by label
- \`max by(instance) (...)\` - Maximum by label
- \`count by(instance) (...)\` - Count by label
- \`group by(instance) (...)\` - Group by label
- \`topk(5, http_requests_total)\` - Top K values
- \`bottomk(5, http_requests_total)\` - Bottom K values
- \`count_values("value", http_requests_total)\` - Count value frequencies
- \`quantile(0.9, http_requests_total)\` - Calculate percentile

### Instant Vector Functions
- \`abs(v)\` - Absolute value
- \`ceil(v)\` - Round up
- \`floor(v)\` - Round down
- \`round(v)\` - Round to nearest integer
- \`sqrt(v)\` - Square root
- \`ln(v)\` - Natural logarithm
- \`log2(v)\` - Binary logarithm
- \`log10(v)\` - Decimal logarithm
- \`exp(v)\` - Exponential function
- \`day_of_month(v)\`, \`day_of_week(v)\`, \`month(v)\` - Time functions
- \`clamp(v, min, max)\` - Clamp to range
- \`predict_linear(v[1h], 24*3600)\` - Linear prediction
- \`label_join(v, "dst", ",", "src1", "src2")\` - Join labels
- \`label_replace(v, "dst", "repl", "src", "regex")\` - Replace label
- \`histogram_quantile(0.9, rate(hist[5m]))\` - Calculate histogram quantile
- \`resets(counter[5m])\` - Counter reset detection
- \`changes(gauge[5m])\` - Number of gauge changes
- \`vector(s)\` - Convert scalar to vector
- \`time()\` - Current time
- \`sort(v)\`, \`sort_desc(v)\` - Sort results

### Binary Operators
- Arithmetic: \`+\`, \`-\`, \`*\`, \`/\`, \`%\`, \`^\`
- Comparison: \`==\`, \`!=\`, \`>\`, \`<\`, \`>=\`, \`<=\`
- Logical/Set: \`and\`, \`or\`, \`unless\`

### Matching Types
- \`on(label1, label2, ...)\` - Match only on specified labels
- \`ignoring(label1, label2, ...)\` - Match ignoring specified labels
- \`group_left(label1, label2, ...)\` - Many-to-one matching
- \`group_right(label1, label2, ...)\` - One-to-many matching

### Best Practices
- Use label selectors to narrow scope
- Avoid high-cardinality queries
- Use time-bounded ranges
- Escape special regex characters with \\
- Use subqueries sparingly \`rate(http_requests_total[5m])[30m:1m]\`
- Prefer more specific metrics/labels over post-processing
`;
