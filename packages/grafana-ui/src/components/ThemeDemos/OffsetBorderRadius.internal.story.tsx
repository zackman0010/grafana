import { Meta, StoryFn } from '@storybook/react';

import { OffsetBorderRadiusContainer } from './OffsetBorderRadius';

const meta: Meta = {
  title: 'Docs Overview/Theme',
  component: OffsetBorderRadiusContainer,
  decorators: [],
  parameters: {
    layout: 'centered',
  },
  args: {
    referenceBorderRadius: 4,
    referenceBorderWidth: 1,
    offset: 4,
    offsetBorderWidth: 1,
  },
};

export const OffsetBorderRadius: StoryFn<typeof OffsetBorderRadiusContainer> = (args) => {
  return <OffsetBorderRadiusContainer {...args} />;
};

export default meta;
