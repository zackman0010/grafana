package converter

import (
	"encoding/json"
	"fmt"
	"io"
	"slices"
	"strconv"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	sdkjsoniter "github.com/grafana/grafana-plugin-sdk-go/data/utils/jsoniter"
	jsoniter "github.com/json-iterator/go"
	promapiv1 "github.com/prometheus/prometheus/web/api/v1"
)

func ReadPrometheusStyleResult3(r io.Reader, opt Options) backend.DataResponse {
	var resp backend.DataResponse

	var dataResponse promapiv1.Response
	if err := json.NewDecoder(r).Decode(&dataResponse); err != nil {
		return rspErr(fmt.Errorf("response from prometheus couldn't be parsed. it is non-json: %w", err))
	}

	if dataResponse.Status == "error" {
		return backend.DataResponse{
			Error: fmt.Errorf("%s: %s", dataResponse.ErrorType, dataResponse.Error),
		}
	}

	switch data := dataResponse.Data.(type) {
	case map[string]any:
		resp = readObjectData2(data, opt)

	case []any: // Labels or exemplars
		resp = readArrayData2(data)

	default: // Should not happen!
		return backend.DataResponse{
			Error: fmt.Errorf("found unexpected type %T for `data` field", data),
		}
	}

	if len(dataResponse.Warnings) > 0 || len(dataResponse.Infos) > 0 {
		notices := make([]data.Notice, 0, len(dataResponse.Warnings)+len(dataResponse.Infos))
		for _, warning := range dataResponse.Warnings {
			notices = append(notices, data.Notice{
				Severity: data.NoticeSeverityWarning,
				Text:     warning,
			})
		}
		for _, info := range dataResponse.Infos {
			notices = append(notices, data.Notice{
				Severity: data.NoticeSeverityInfo,
				Text:     info,
			})
		}

		if len(resp.Frames) == 0 {
			resp.Frames = append(resp.Frames, data.NewFrame("Warnings"))
		}

		for _, frame := range resp.Frames {
			if frame.Meta == nil {
				frame.Meta = &data.FrameMeta{}
			}
			frame.Meta.Notices = notices
		}
	}

	return resp
}

func readObjectData2(dataResponse map[string]any, opt Options) backend.DataResponse {
	// encodingFlags
	encodingFlags := make([]string, 0)
	rawEncodingFlags, ok := dataResponse["encodingFlags"]
	if ok {
		encodingFlags, ok = rawEncodingFlags.([]string)
		if !ok {
			return rspErr(fmt.Errorf("found encodingFlags but it is not of type []string %T", rawEncodingFlags))
		}
	}

	// result & resultType
	rawResultType, ok := dataResponse["resultType"]
	if !ok {
		return rspErr(fmt.Errorf("did not find resultType"))
	}

	resultType, ok := rawResultType.(string)
	if !ok {
		return rspErr(fmt.Errorf("found resultType but it is not of type string %T", rawResultType))
	}

	rawResult, ok := dataResponse["result"]
	if !ok {
		return rspErr(fmt.Errorf("did not find result"))
	}

	result, ok := rawResult.(json.RawMessage)
	if !ok {
		return rspErr(fmt.Errorf("found result but it is not of type []byte %T", rawResult))
	}

	var rsp backend.DataResponse

	rsp = readResult2(resultType, rsp, result, opt, encodingFlags)

	// stats
	if rawStats, ok := dataResponse["stats"]; rawStats != nil && ok {
		if len(rsp.Frames) > 0 {
			meta := rsp.Frames[0].Meta
			if meta == nil {
				meta = &data.FrameMeta{}
				rsp.Frames[0].Meta = meta
			}
			meta.Custom = map[string]any{
				"stats": rawStats,
			}
		}
	}

	return rsp
}

func readResult2(resultType string, rsp backend.DataResponse, result []byte, opt Options, encodingFlags []string) backend.DataResponse {
	// TODO!!!
	iter := sdkjsoniter.NewIterator(jsoniter.ParseBytes(sdkjsoniter.ConfigDefault, result))

	switch resultType {
	case "matrix", "vector":
		rsp = readMatrixOrVectorMulti(iter, resultType, opt)
		if rsp.Error != nil {
			return rsp
		}
	case "streams":
		if slices.Contains(encodingFlags, "categorize-labels") {
			rsp = readCategorizedStream(iter)
		} else {
			rsp = readStream(iter)
		}
		if rsp.Error != nil {
			return rsp
		}
	case "string":
		rsp = readString(iter)
		if rsp.Error != nil {
			return rsp
		}
	case "scalar":
		rsp = readScalar(iter, opt.Dataplane)
		if rsp.Error != nil {
			return rsp
		}
	default:
		if err := iter.Skip(); err != nil {
			return rspErr(err)
		}
		rsp = backend.DataResponse{
			Error: fmt.Errorf("unknown result type: %s", resultType),
		}
	}
	return rsp
}

// will return strings or exemplars
func readArrayData2(dataResponse []any) backend.DataResponse {
	lookup := make(map[string]*data.Field)

	var labelFrame *data.Frame
	rsp := backend.DataResponse{}

	stringField := data.NewFieldFromFieldType(data.FieldTypeString, 0)
	stringField.Name = "Value"

	for _, dr := range dataResponse {
		switch v := dr.(type) {
		case string:
			stringField.Append(v)

		// Either label or exemplars
		case map[string]any:
			exemplar, labelPairs, err := readLabelsOrExemplars2(dataResponse)
			if err != nil {
				rspErr(err)
			}
			if exemplar != nil {
				rsp.Frames = append(rsp.Frames, exemplar)
			} else if labelPairs != nil {
				max := 0
				for _, pair := range labelPairs {
					k := pair[0]
					v := pair[1]
					f, ok := lookup[k]
					if !ok {
						f = data.NewFieldFromFieldType(data.FieldTypeString, 0)
						f.Name = k
						lookup[k] = f

						if labelFrame == nil {
							labelFrame = data.NewFrame("")
							rsp.Frames = append(rsp.Frames, labelFrame)
						}
						labelFrame.Fields = append(labelFrame.Fields, f)
					}
					f.Append(fmt.Sprintf("%v", v))
					if f.Len() > max {
						max = f.Len()
					}
				}

				// Make sure all fields have equal length
				for _, f := range lookup {
					diff := max - f.Len()
					if diff > 0 {
						f.Extend(diff)
					}
				}
			}

		default:
			stringField.Append(v)
		}
	}

	if stringField.Len() > 0 {
		rsp.Frames = append(rsp.Frames, data.NewFrame("", stringField))
	}

	return rsp
}

func readLabelsOrExemplars2(dataResponse []any) (*data.Frame, [][2]string, error) {
	pairs := make([][2]string, 0, 10)
	labels := data.Labels{}
	var frame *data.Frame

l1Fields:
	for _, dr := range dataResponse {
		obj, ok := dr.(map[string]any)
		if !ok {
			return nil, nil, fmt.Errorf("dataResponse is not obj %T", dr)
		}

		for l1Field, l1Value := range obj {
			switch l1Field {
			case "seriesLabels":
				seriesLabels, ok := l1Value.(data.Labels)
				if !ok {
					return nil, nil, fmt.Errorf("seriesLabels is not data.Labels %T", l1Value)
				}
				labels = seriesLabels

			case "exemplars":
				lookup := make(map[string]*data.Field)
				timeField := data.NewFieldFromFieldType(data.FieldTypeTime, 0)
				timeField.Name = data.TimeSeriesTimeFieldName
				valueField := data.NewFieldFromFieldType(data.FieldTypeFloat64, 0)
				valueField.Name = data.TimeSeriesValueFieldName
				valueField.Labels = labels
				frame = data.NewFrame("", timeField, valueField)
				frame.Meta = &data.FrameMeta{
					Custom: resultTypeToCustomMeta("exemplar"),
				}
				exCount := 0

				exemplars, ok := l1Value.([]map[string]any)
				if !ok {
					return nil, nil, fmt.Errorf("exemplars is not []map[string]any %T", l1Value)
				}

				for _, exemplar := range exemplars {
					for l2Field, l2Value := range exemplar {
						switch l2Field {
						// nolint:goconst
						case "value":
							s, ok := l2Value.(string)
							if !ok {
								return nil, nil, fmt.Errorf("l2Value not a string %T", l2Value)
							}

							v, err := strconv.ParseFloat(s, 64)
							if err != nil {
								return nil, nil, err
							}
							valueField.Append(v)

						case "timestamp":
							f, ok := l2Value.(float64)
							if !ok {
								return nil, nil, fmt.Errorf("l2Value not a float64 %T", l2Value)
							}
							ts := timeFromFloat(f)
							timeField.Append(ts)

						case "labels":
							labelValues, ok := l2Value.(map[string]string)
							if !ok {
								return nil, nil, fmt.Errorf("l2Value not a map[string]string %T", l2Value)
							}

							pairs := make([][2]string, 0, 10)
							for k, v := range labelValues {
								pairs = append(pairs, [2]string{k, v})
							}

							for _, pair := range pairs {
								k := pair[0]
								v := pair[1]
								f, ok := lookup[k]
								if !ok {
									f = data.NewFieldFromFieldType(data.FieldTypeString, exCount)
									f.Name = k
									lookup[k] = f
									frame.Fields = append(frame.Fields, f)
								}
								f.Append(v)
							}

							// Make sure all fields have equal length
							for _, f := range lookup {
								diff := exCount + 1 - f.Len()
								if diff > 0 {
									f.Extend(diff)
								}
							}

						default:
							frame.AppendNotices(data.Notice{
								Severity: data.NoticeSeverityError,
								Text:     fmt.Sprintf("unable to parse key: %s in response body", l2Field),
							})
						}
					}
					exCount++
				}

			case "":
				break l1Fields

			default:
				v := fmt.Sprintf("%v", l1Value)
				pairs = append(pairs, [2]string{l1Field, v})
			}
		}
	}

	return frame, pairs, nil
}
