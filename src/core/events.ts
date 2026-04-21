import { z } from "zod";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed 20-byte hex address");

export const hexSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]*$/, "must be 0x-prefixed hex");

export const bigintStringSchema = z
  .string()
  .regex(/^\d+$/, "must be a base-10 integer string");

const baseEventSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().int().positive(),
  agentId: z.string().min(1),
  wallet: addressSchema,
  chainId: z.number().int().positive(),
  source: z.string().min(1),
});

export const txSendEventSchema = baseEventSchema.extend({
  kind: z.literal("tx_send"),
  to: addressSchema,
  valueWei: bigintStringSchema,
  data: hexSchema.optional(),
});

export const sessionKeyAddedEventSchema = baseEventSchema.extend({
  kind: z.literal("session_key_added"),
  keyAddress: addressSchema,
  permissions: z.record(z.string(), z.unknown()).optional(),
});

export const agentEventSchema = z.discriminatedUnion("kind", [
  txSendEventSchema,
  sessionKeyAddedEventSchema,
]);

export type AgentEvent = z.infer<typeof agentEventSchema>;
export type TxSendEvent = z.infer<typeof txSendEventSchema>;
export type SessionKeyAddedEvent = z.infer<typeof sessionKeyAddedEventSchema>;

export function parseAgentEvent(input: unknown): AgentEvent {
  return agentEventSchema.parse(input);
}
