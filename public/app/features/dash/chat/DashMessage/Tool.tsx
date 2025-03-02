import { MessageContentComplex } from '@langchain/core/messages';
import { useState } from 'react';

import { Collapse, JSONFormatter } from '@grafana/ui';

interface Props {
  content: MessageContentComplex;
}

export const Tool = ({ content }: Props) => {
  const [opened, setOpened] = useState(false);

  const name = 'name' in content ? String(content.name) : 'Unknown tool';

  return (
    <Collapse label={name} collapsible isOpen={opened} onToggle={setOpened}>
      <JSONFormatter json={content} />
    </Collapse>
  );
};
