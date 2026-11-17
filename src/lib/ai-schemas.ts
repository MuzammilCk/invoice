import { z } from 'zod';

// ── Voice-to-Invoice LLM normalization schema ──
// The LLM receives a raw STT transcript and returns this JSON.
// Totals are NEVER computed by the LLM — always by calculations.ts (Decimal).
export const AIResponseSchema = z.object({
  recipient: z.object({
    name: z.string().max(200),
    address: z.string().max(500).optional().catch(undefined),
  }).optional(),
  date: z.string().optional().catch(undefined), // ISO date string; absent = use today
  items: z.array(z.object({
    description: z.string().max(500),
    price: z.number().min(0).max(10_000_000),
  })).min(1).max(100),
  notes: z.string().max(2000).optional().default(''),
});

export type AIResponseType = z.infer<typeof AIResponseSchema>;

// ── Validation helper ──
export function validateAIResponse(data: unknown): AIResponseType | null {
  const parsed = AIResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[ai-schema] Validation failed:', parsed.error.issues);
    return null;
  }
  return parsed.data;
}
