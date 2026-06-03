import { z } from 'zod';
import { TEMPLATES } from './templates';

// ── All valid template IDs for LLM reference ──
const TEMPLATE_IDS = TEMPLATES.map(t => t.id);

// ── Expanded AI Response Schema ──
// Single source of truth — imported by AIAssistantSidebar.tsx AND Dashboard.tsx
export const AIResponseSchema = z.object({
  customerInfo: z.object({
    name: z.string().max(200).optional().catch(undefined),
    email: z.string().max(200).optional().catch(undefined),
    address: z.string().max(500).optional().catch(undefined),
  }).optional(),
  items: z.array(z.object({
    description: z.string().max(500),
    quantity: z.number().positive().max(100_000),
    rate: z.number().min(0).max(1_000_000),
  })).min(1).max(100),
  taxRate: z.number().min(0).max(100).optional().default(0),
  notes: z.string().max(2000).optional().default(''),
  // ── Expanded fields (H-04) ──
  templateId: z.string().optional().catch(undefined),
  currency: z.string().max(3).optional().catch(undefined),
  title: z.string().max(200).optional().catch(undefined),
  themeColor: z.string().max(7).optional().catch(undefined),
  discountRate: z.number().min(0).max(100).optional().catch(undefined),
  dueDate: z.string().optional().catch(undefined),
  paymentTerms: z.string().optional().catch(undefined),
  shipping: z.number().min(0).optional().catch(undefined),
  suggestedTemplateId: z.string().optional().catch(undefined),
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

// ── Template ID list for system prompt injection ──
export const TEMPLATE_ID_LIST = TEMPLATE_IDS.join(', ');
