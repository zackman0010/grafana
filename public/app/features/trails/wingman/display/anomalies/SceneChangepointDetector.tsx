/* eslint @grafana/no-untranslated-strings: "error" */
import init, { ChangepointDetector } from '@bsull/augurs/changepoint';
import { of } from 'rxjs';

import { DataFrame, DataQueryRequest, dateTime, Field, FieldType } from '@grafana/data';
import {
  SceneComponentProps,
  SceneObjectState,
  SceneObjectBase,
  ExtraQueryDataProcessor,
  ExtraQueryProvider,
  ExtraQueryDescriptor,
} from '@grafana/scenes';
import { DataTopic } from '@grafana/schema';
import { ButtonGroup, Checkbox, ToolbarButton } from '@grafana/ui';
import { Trans } from 'app/core/internationalization';

// eslint-disable-next-line no-console
init()?.then(() => console.debug('augurs changepoints initialized'));

export interface Changepoint {
  idx: number;
  time: number;
  field: Field<number>;
  magnitude: number;
  isComplex?: boolean;
  isRate?: boolean;
}

interface SceneChangepointDetectorState extends SceneObjectState {
  enabled?: boolean;
  // The look-back factor to use when establishing a baseline.
  // The detector will multiply the range of the data by this factor to determine
  // the amount of data to use as training data. Defaults to 4.0.
  lookbackFactor?: number;
  lookbackFactorOptions: Array<{ label: string; value: number }>;
  onChangepointDetected?: (changepoint: Changepoint) => void;
  onBeginChangepointDetection?: () => void;
  onCompleteChangepointDetection?: () => void;
  onComplexMetric?: () => void;
}

// TODO: make this customisable.
export const DEFAULT_LOOKBACK_FACTOR_OPTIONS = [
  { label: '1x', value: 1 },
  { label: '4x', value: 4 },
  { label: '10x', value: 10 },
];

export const DEFAULT_LOOKBACK_FACTOR_OPTION = {
  label: '4x',
  value: 4,
};

export class SceneChangepointDetector
  extends SceneObjectBase<SceneChangepointDetectorState>
  implements ExtraQueryProvider<SceneChangepointDetectorState>
{
  public static Component = SceneChangepointDetectorRenderer;
  public constructor(state: Partial<SceneChangepointDetectorState>) {
    super({ lookbackFactorOptions: DEFAULT_LOOKBACK_FACTOR_OPTIONS, ...state });
  }

  // Add secondary requests, used to obtain and transform the training data.
  public getExtraQueries(request: DataQueryRequest): ExtraQueryDescriptor[] {
    const extraQueries: ExtraQueryDescriptor[] = [];
    if (this.state.enabled) {
      const { to, from: origFrom } = request.range;
      const diffMs = to.diff(origFrom);
      const from = dateTime(to).subtract(this.state.lookbackFactor ?? DEFAULT_LOOKBACK_FACTOR_OPTION.value * diffMs);
      extraQueries.push({
        req: {
          ...request,
          range: {
            from,
            to,
            raw: {
              from,
              to,
            },
          },
        },
        processor: changepointProcessor(this),
      });
    }
    return extraQueries;
  }

  // Determine if the component should be re-rendered.
  public shouldRerun(prev: SceneChangepointDetectorState, next: SceneChangepointDetectorState): boolean {
    // TODO: change when we allow the state to be configured in the UI.
    return prev.enabled !== next.enabled;
  }

  public onEnabledChanged(enabled: boolean) {
    this.setState({ enabled });
  }

  public onFactorChanged(lookbackFactor: number) {
    this.setState({ lookbackFactor });
  }

  public onClearFactor() {
    this.setState({ lookbackFactor: undefined });
  }
}

// The transformation function for the changepoint detector.
//
// This function will take the secondary frame returned by the query runner and
// produce a new frame with the changepoint annotations.
const changepointProcessor: (detector: SceneChangepointDetector) => ExtraQueryDataProcessor =
  (detector) => (_, secondary) => {
    detector.state.onBeginChangepointDetection?.();
    const annotations = secondary.series.map((series) => {
      // handle complex metrics
      if (series.fields.length > 2) {
        // eslint-disable-next-line no-console
        console.debug(
          'Skipping histogram/complex metric with fields:',
          series.fields.map((f) => f.name)
        );
        detector.state.onComplexMetric?.();
        return { fields: [], length: 0 };
      }

      // handle regular metrics with changepoint detection
      return createChangepointAnnotations(series, detector.state.onChangepointDetected);
    });
    detector.state.onCompleteChangepointDetection?.();
    return of({ timeRange: secondary.timeRange, series: [], state: secondary.state, annotations });
  };

function createChangepointAnnotations(
  frame: DataFrame,
  onChangepointDetected: ((changepoint: Changepoint) => void) | undefined
): DataFrame {
  const annotationTimes = [];
  const annotationTexts = [];
  const timeField = frame.fields.find((field) => field.type === FieldType.time);
  if (!timeField) {
    return { fields: [], length: 0 };
  }

  for (const field of frame.fields) {
    if (field.type !== FieldType.number) {
      continue;
    }

    const cpd = ChangepointDetector.defaultArgpcp();
    const values = new Float64Array(field.values);
    const cps = cpd.detectChangepoints(values);

    for (const cp of cps.indices) {
      const time = timeField.values[cp + 1];

      // use a window of points before and after for more stable calculations
      const windowSize = 5;
      const beforePoints = values.slice(Math.max(0, cp - windowSize + 1), cp + 1);
      const afterPoints = values.slice(cp + 1, Math.min(cp + windowSize + 1, values.length));

      const beforeAvg = beforePoints.reduce((a, b) => a + b, 0) / beforePoints.length;
      const afterAvg = afterPoints.reduce((a, b) => a + b, 0) / afterPoints.length;

      // calculate relative change (percent change)
      let magnitude;
      if (beforeAvg === 0) {
        // handle division by zero - if beforeAvg is 0, use absolute change
        magnitude = Math.abs(afterAvg);
      } else {
        magnitude = Math.abs((afterAvg - beforeAvg) / beforeAvg) * 100;
      }

      // For counter metrics that only increase, we might want to consider the rate of change
      // Calculate rate of change per second using the time field
      const beforeTime = timeField.values[Math.max(0, cp - windowSize + 1)];
      const afterTime = timeField.values[Math.min(cp + windowSize, values.length - 1)];
      const timeDiffSeconds = (afterTime - beforeTime) / 1000; // Convert to seconds

      // if the metric is monotonically increasing (like a counter)
      const isMonotonicIncreasing =
        beforePoints.every((val, i) => i === 0 || val >= beforePoints[i - 1]) &&
        afterPoints.every((val, i) => i === 0 || val >= afterPoints[i - 1]);

      if (isMonotonicIncreasing) {
        // for counters, look at the change in rate
        const beforeRate = (beforePoints[beforePoints.length - 1] - beforePoints[0]) / timeDiffSeconds;
        const afterRate = (afterPoints[afterPoints.length - 1] - afterPoints[0]) / timeDiffSeconds;

        if (beforeRate === 0) {
          magnitude = Math.abs(afterRate);
        } else {
          magnitude = Math.abs((afterRate - beforeRate) / beforeRate) * 100;
        }
      }

      // add a weight factor based on the significance of the change
      // this helps prioritize larger relative changes
      const significanceThreshold = 10; // 10% change
      const weight = magnitude > significanceThreshold ? 1.5 : 1;
      magnitude *= weight;

      annotationTimes.push(time);
      annotationTexts.push('Changepoint detected');

      onChangepointDetected?.({
        idx: cp + 1,
        time,
        field,
        magnitude,
        isRate: isMonotonicIncreasing,
      });
    }
  }

  return {
    fields: [
      {
        name: 'time',
        type: FieldType.time,
        values: annotationTimes,
        config: {},
      },
      {
        name: 'text',
        type: FieldType.string,
        values: annotationTexts,
        config: {},
      },
    ],
    length: annotationTimes.length,
    meta: {
      dataTopic: DataTopic.Annotations,
    },
  };
}

function SceneChangepointDetectorRenderer({ model }: SceneComponentProps<SceneChangepointDetector>) {
  const { enabled } = model.useState();

  const onClick = (enabled: boolean) => {
    model.onEnabledChanged(enabled);
  };

  return (
    <ButtonGroup>
      <ToolbarButton
        variant="canvas"
        tooltip="Enable changepoint detection"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick(!enabled);
        }}
      >
        <Checkbox label=" " value={enabled ?? false} onClick={() => onClick(!enabled)} />
        <Trans i18nKey="trail.metric-select.wingman.anomalies.changepoints">Changepoints</Trans>
      </ToolbarButton>
    </ButtonGroup>
  );
}
