import { SpanLinkDef } from '../../types';

// TODO: Explain how we determine best link
export const getBestLinkByAttribute = (attribute: string, links: SpanLinkDef[]) => {
  // Find the link with the attribute closest to the end of its array
  let bestLinkIndex = -1;
  let smallestDistanceFromEnd = Infinity;

  links.forEach((link, linkIndex) => {
    const linkAttributes = link.linkAttributes ?? [];
    const attributeIndex = linkAttributes.lastIndexOf(attribute);

    // Skip if attribute not found
    if (attributeIndex !== -1) {
      // Calculate distance from end (0 means it's the last element)
      const distanceFromEnd = linkAttributes.length - 1 - attributeIndex;

      if (distanceFromEnd < smallestDistanceFromEnd) {
        smallestDistanceFromEnd = distanceFromEnd;
        bestLinkIndex = linkIndex;
      }
    }
  });

  // Return the best link or undefined if no links have the attribute
  return bestLinkIndex !== -1 ? links[bestLinkIndex] : undefined;
};
