import { useState } from "react";
import { TNil } from "../../types";
import { SpanLinkDef } from "../../types";
import { TraceLink } from "../../types/trace";
import AccordianKeyValues from "./AccordianKeyValues";

import { IconName, TraceKeyValuePair } from "@grafana/data";
import { Icon, Stack } from "@grafana/ui";

export interface ResourceAttributesProps {
  icon: any;
  title: string;
  data: TraceKeyValuePair[];
  links: SpanLinkDef[];
  linksGetter: ((links: TraceKeyValuePair[], index: number) => TraceLink[]) | TNil;
}

export function ResourceAttributes({ icon, title, data, linksGetter, links }: ResourceAttributesProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AccordianKeyValues
      data={data}
      label={getLabelTitle(title, icon)}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      linksGetter={linksGetter}
      links={links}
    />
  )
}

function getLabelTitle(label: string, icon?: IconName) {
  return (
    <Stack direction="row" gap={1} alignItems="center">
      {icon && <Icon name={icon} />}
      {label}
    </Stack>
  );
}
