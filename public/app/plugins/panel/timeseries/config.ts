import {
  FieldColorModeId,
  FieldConfigProperty,
  FieldType,
  identityOverrideProcessor,
  SetFieldConfigOptionsArgs,
  Field,
  escapeStringForRegex,
  FieldOverrideContext,
  getFieldDisplayName,
  ReducerID,
  standardEditorsRegistry,
} from '@grafana/data';
import {
  BarAlignment,
  GraphDrawStyle,
  GraphFieldConfig,
  GraphGradientMode,
  LineInterpolation,
  LineStyle,
  VisibilityMode,
  StackingMode,
  GraphThresholdsStyleMode,
  GraphTransform,
  BigValueColorMode,
} from '@grafana/schema';
import { graphFieldOptions, commonOptionsBuilder } from '@grafana/ui';

import { InsertNullsEditor } from './InsertNullsEditor';
import { LineStyleEditor } from './LineStyleEditor';
import { SpanNullsEditor } from './SpanNullsEditor';
import { ThresholdsStyleEditor } from './ThresholdsStyleEditor';

export const defaultGraphConfig: GraphFieldConfig = {
  drawStyle: GraphDrawStyle.Line,
  lineInterpolation: LineInterpolation.Linear,
  lineWidth: 1,
  fillOpacity: 0,
  gradientMode: GraphGradientMode.None,
  barAlignment: BarAlignment.Center,
  barWidthFactor: 0.6,
  stacking: {
    mode: StackingMode.None,
    group: 'A',
  },
  axisGridShow: true,
  axisCenteredZero: false,
  axisBorderShow: false,
};

export interface FieldConfig extends GraphFieldConfig {}

export interface TimeSeriesGraphFieldConfig extends GraphFieldConfig {
  colorMode: BigValueColorMode;
  backgroundColorCalculation: [string];
  backgroundColorCalcFields: string;
}

export const defaultTimeseriesGraphConfig: TimeSeriesGraphFieldConfig = {
  ...defaultGraphConfig,
  colorMode: BigValueColorMode.None,
  backgroundColorCalculation: [ReducerID.lastNotNull],
  backgroundColorCalcFields: '',
};

const categoryStyles = ['Graph styles'];

export type NullEditorSettings = { isTime: boolean };

export function getGraphFieldConfig(
  cfg: GraphFieldConfig | TimeSeriesGraphFieldConfig,
  isTime = true
): SetFieldConfigOptionsArgs<GraphFieldConfig | TimeSeriesGraphFieldConfig> {
  return {
    standardOptions: {
      [FieldConfigProperty.Color]: {
        settings: {
          byValueSupport: true,
          bySeriesSupport: true,
          preferThresholdsMode: false,
        },
        defaultValue: {
          mode: FieldColorModeId.PaletteClassic,
        },
      },
    },
    useCustomConfig: (builder) => {
      builder
        .addRadio({
          path: 'drawStyle',
          name: 'Style',
          category: categoryStyles,
          defaultValue: cfg.drawStyle,
          settings: {
            options: graphFieldOptions.drawStyle,
          },
        })
        .addRadio({
          path: 'lineInterpolation',
          name: 'Line interpolation',
          category: categoryStyles,
          defaultValue: cfg.lineInterpolation,
          settings: {
            options: graphFieldOptions.lineInterpolation,
          },
          showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
        })
        .addRadio({
          path: 'barAlignment',
          name: 'Bar alignment',
          category: categoryStyles,
          defaultValue: cfg.barAlignment,
          settings: {
            options: graphFieldOptions.barAlignment,
          },
          showIf: (config) => config.drawStyle === GraphDrawStyle.Bars,
        })
        .addSliderInput({
          path: 'barWidthFactor',
          name: 'Bar width factor',
          category: categoryStyles,
          defaultValue: cfg.barWidthFactor,
          settings: {
            min: 0.1,
            max: 1.0,
            step: 0.1,
            ariaLabelForHandle: 'Bar width factor',
          },
          showIf: (config) => config.drawStyle === GraphDrawStyle.Bars,
        })
        .addSliderInput({
          path: 'lineWidth',
          name: 'Line width',
          category: categoryStyles,
          defaultValue: cfg.lineWidth,
          settings: {
            min: 0,
            max: 10,
            step: 1,
            ariaLabelForHandle: 'Line width',
          },
          showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
        })
        .addSliderInput({
          path: 'fillOpacity',
          name: 'Fill opacity',
          category: categoryStyles,
          defaultValue: cfg.fillOpacity,
          settings: {
            min: 0,
            max: 100,
            step: 1,
            ariaLabelForHandle: 'Fill opacity',
          },
          showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
        })
        .addRadio({
          path: 'gradientMode',
          name: 'Gradient mode',
          category: categoryStyles,
          defaultValue: graphFieldOptions.fillGradient[0].value,
          settings: {
            options: graphFieldOptions.fillGradient,
          },
          showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
        })
        .addFieldNamePicker({
          path: 'fillBelowTo',
          name: 'Fill below to',
          category: categoryStyles,
          hideFromDefaults: true,
          settings: {
            filter: (field: Field) => field.type === FieldType.number,
          },
        })
        .addCustomEditor<void, LineStyle>({
          id: 'lineStyle',
          path: 'lineStyle',
          name: 'Line style',
          category: categoryStyles,
          showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
          editor: LineStyleEditor,
          override: LineStyleEditor,
          process: identityOverrideProcessor,
          shouldApply: (field) => field.type === FieldType.number,
        })
        .addCustomEditor<NullEditorSettings, boolean>({
          id: 'spanNulls',
          path: 'spanNulls',
          name: 'Connect null values',
          category: categoryStyles,
          defaultValue: false,
          editor: SpanNullsEditor,
          override: SpanNullsEditor,
          showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
          shouldApply: (field) => field.type !== FieldType.time,
          process: identityOverrideProcessor,
          settings: { isTime },
        })
        .addCustomEditor<NullEditorSettings, boolean>({
          id: 'insertNulls',
          path: 'insertNulls',
          name: 'Disconnect values',
          category: categoryStyles,
          defaultValue: false,
          editor: InsertNullsEditor,
          override: InsertNullsEditor,
          showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
          shouldApply: (field) => field.type !== FieldType.time,
          process: identityOverrideProcessor,
          settings: { isTime },
        })
        .addRadio({
          path: 'showPoints',
          name: 'Show points',
          category: categoryStyles,
          defaultValue: graphFieldOptions.showPoints[0].value,
          settings: {
            options: graphFieldOptions.showPoints,
          },
          showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
        })
        .addSliderInput({
          path: 'pointSize',
          name: 'Point size',
          category: categoryStyles,
          defaultValue: 5,
          settings: {
            min: 1,
            max: 40,
            step: 1,
            ariaLabelForHandle: 'Point size',
          },
          showIf: (config) => config.showPoints !== VisibilityMode.Never || config.drawStyle === GraphDrawStyle.Points,
        });

      if ('colorMode' in cfg) {
        builder.addSelect({
          path: 'colorMode',
          name: 'Color mode',
          defaultValue: BigValueColorMode.None,
          category: categoryStyles,
          settings: {
            options: [
              { value: BigValueColorMode.None, label: 'None' },
              { value: BigValueColorMode.Background, label: 'Background Gradient' },
              { value: BigValueColorMode.BackgroundSolid, label: 'Background Solid' },
            ],
          },
        });

        builder.addCustomEditor({
          id: 'backgroundColorCalculation',
          path: 'backgroundColorCalculation',
          name: 'Calculation',
          description: 'Choose a reducer function / calculation for the background color',
          category: categoryStyles,
          editor: standardEditorsRegistry.get('stats-picker').editor,
          // TODO: Get ReducerID from generated schema one day?
          defaultValue: [ReducerID.lastNotNull],
          // Hides it when all values mode is on
          showIf: (currentConfig) => 'colorMode' in currentConfig && currentConfig.colorMode !== BigValueColorMode.None,
          override: standardEditorsRegistry.get('stats-picker').editor,
          process: () => true,
          shouldApply: () => true,
        });

        builder.addSelect({
          path: 'backgroundColorCalcFields',
          name: 'Fields',
          description: 'Select the fields that should be included in the calculation for the background color',
          category: categoryStyles,
          showIf: (currentConfig) => 'colorMode' in currentConfig && currentConfig.colorMode !== BigValueColorMode.None,
          settings: {
            allowCustomValue: true,
            options: [],
            getOptions: async (context: FieldOverrideContext) => {
              const options = [
                { value: '', label: 'Numeric Fields' },
                { value: '/.*/', label: 'All Fields' },
              ];
              if (context && context.data) {
                for (const frame of context.data) {
                  for (const field of frame.fields) {
                    const name = getFieldDisplayName(field, frame, context.data);
                    const value = `/^${escapeStringForRegex(name)}$/`;
                    options.push({ value, label: name });
                  }
                }
              }
              return Promise.resolve(options);
            },
          },
          defaultValue: '',
        });
      }

      commonOptionsBuilder.addStackingConfig(builder, cfg.stacking, categoryStyles);

      builder.addSelect({
        category: categoryStyles,
        name: 'Transform',
        path: 'transform',
        settings: {
          options: [
            {
              label: 'Constant',
              value: GraphTransform.Constant,
              description: 'The first value will be shown as a constant line',
            },
            {
              label: 'Negative Y',
              value: GraphTransform.NegativeY,
              description: 'Flip the results to negative values on the y axis',
            },
          ],
          isClearable: true,
        },
        hideFromDefaults: true,
      });

      commonOptionsBuilder.addAxisConfig(builder, cfg);
      commonOptionsBuilder.addHideFrom(builder);

      builder.addCustomEditor({
        id: 'thresholdsStyle',
        path: 'thresholdsStyle',
        name: 'Show thresholds',
        category: ['Thresholds'],
        defaultValue: { mode: GraphThresholdsStyleMode.Off },
        settings: {
          options: graphFieldOptions.thresholdsDisplayModes,
        },
        editor: ThresholdsStyleEditor,
        override: ThresholdsStyleEditor,
        process: identityOverrideProcessor,
        shouldApply: () => true,
      });
    },
  };
}
