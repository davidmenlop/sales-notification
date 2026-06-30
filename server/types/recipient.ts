import { z } from 'zod';

export const ExecutiveRecipientSchema = z.object({
  whatsapp: z.string().nullable(),
  enabled: z.boolean().default(true),
  lastUpdated: z.string().nullable()
});

export const GroupRecipientSchema = z.object({
  whatsapp: z.string(),
  enabled: z.boolean().default(true),
  members: z.array(z.string()).optional()
});

export const RecipientsConfigSchema = z.object({
  executives: z.record(z.string(), ExecutiveRecipientSchema),
  groups: z.record(z.string(), GroupRecipientSchema).optional()
});

export type ExecutiveRecipient = z.infer<typeof ExecutiveRecipientSchema>;
export type GroupRecipient = z.infer<typeof GroupRecipientSchema>;
export type RecipientsConfig = z.infer<typeof RecipientsConfigSchema>;
