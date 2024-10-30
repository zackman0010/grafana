import { z } from 'zod';

// Reference Schema
export const Reference = z.object({
  $ref: z.string(),
});

// Referenceable Schema
export function Referenceable<T extends z.ZodTypeAny>(ref: T) {
  return z.record(ref);
}

// Kind Schema
export function KindSchema<
  K extends string,
  S extends z.ZodTypeAny,
  M extends z.ZodTypeAny = z.ZodObject<Record<string, never>>,
>(kindValue: K, specSchema: S, metadataSchema?: M) {
  return z.object({
    kind: z.literal(kindValue),
    metadata: (metadataSchema ?? z.object({})).optional(),
    spec: specSchema,
  });
}

// Now, UserSchema validates objects like:
// {
//   kind: 'User',
//   spec: { name: 'Alice', age: 30 },
//   metadata: { createdAt: '2023-10-10' },
// }
