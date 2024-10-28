import { PanelPlugin, toOption } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'text',
      name: 'Simple text option',
      description: 'Description of panel option',
      defaultValue: 'Default value of text input option',
      category: ['Legend'],
    })
    .addTextInput({
      path: 'text2',
      name: 'Simple text option',
      description: 'Description of panel option',
      defaultValue: 'Default value of text input option',
    })
    .addBooleanSwitch({
      path: 'showSeriesCount',
      name: 'Show series counter',
      defaultValue: false,
    })
    .addSelect({
      path: 'select',
      name: 'Simple select option',
      description: 'Description of panel option',
      defaultValue: 'B',
      settings: {
        options: ['A', 'B', 'C'].map(toOption),
      },
    })
    .addMultiSelect({
      path: 'multiSelect',
      name: 'Simple multiselect option',
      description: 'Description of panel option',
      defaultValue: 'B',
      settings: {
        options: ['A', 'B', 'C'].map(toOption),
      },
    })
    .addNumberInput({
      path: 'numberinput',
      name: 'Simple number input',
      description: 'Description of panel option',
      defaultValue: 4,
    })
    .addUnitPicker({
      path: 'unit',
      name: 'Unit',
      defaultValue: 'short',
    })
    .addDashboardPicker({
      path: 'dashboard',
      name: 'Dashboard',
    })
    .addColorPicker({
      path: 'color',
      name: 'Color',
    })
    .addSliderInput({
      path: 'slider',
      name: 'Slider',
      defaultValue: 50,
    })
    .addFieldNamePicker({
      path: 'fieldName',
      name: 'Field name',
    })
    .addTimeZonePicker({
      path: 'timezone',
      name: 'Timezone',
      defaultValue: 'browser',
      category: ['Legend'],
    })
    .addRadio({
      path: 'seriesCountSize',
      defaultValue: 'sm',
      name: 'Series counter size',
      settings: {
        options: [
          {
            value: 'sm',
            label: 'Small',
          },
          {
            value: 'md',
            label: 'Medium',
          },
          {
            value: 'lg',
            label: 'Large',
          },
        ],
      },
      showIf: (config) => config.showSeriesCount,
    });
});
