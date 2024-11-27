import { Meta, StoryFn } from '@storybook/react';

import { Counter, CounterProps } from './Counter';

const meta: Meta = {
  title: 'Navigation/TabCounter',
};

export const Basic: StoryFn<CounterProps> = (args) => {
  return <Counter {...args} />;
};

Basic.args = {
  value: 10,
};

export default meta;
