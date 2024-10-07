import property from 'lodash/property';

interface FieldAccessorCache {
  [key: string]: (obj: object) => any;
}

let fieldAccessorCache: FieldAccessorCache = {};

export function getFieldAccessor(fieldPath: string) {
  const accessor = fieldAccessorCache[fieldPath];
  if (accessor) {
    return accessor;
  }

  return (fieldAccessorCache[fieldPath] = property(fieldPath));
}
