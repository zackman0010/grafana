import { SpanLinkDef } from '../../types';

export const getAttributeLinks = (attributeName: string, links: SpanLinkDef[]) => {
  return links.filter((link) => (link.linkAttributes ?? []).includes(attributeName));
};
