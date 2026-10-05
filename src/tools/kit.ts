/**
 * Shared plumbing every tool uses, now on Slipway.
 *
 * Tool modules keep describing themselves with a Zod shape, a risk and a
 * handler. This adapter turns each into a Slipway tool, so the MCP server, the
 * CLI, the write guard, annotations and errors all come from the framework
 * instead of a copy kept in this repo.
 */

import { SlipwayError, toSlipwayError, toolkit, z, type Risk, type Tool } from "@thenavidm/slipway";
import type { ThriveCartClient } from "../api/client.js";
import type { Account, Config } from "../config.js";
import { selectAccount } from "../config.js";
import { ThriveCartError } from "../api/errors.js";

export type ToolContext = {
  client: ThriveCartClient;
  config: Config;
  /** Resolve which cart this call reads or acts on. */
  account: (hint?: string) => Account;
};

const kit = toolkit<ToolContext>();

/** The optional argument that picks a cart, on every tool. */
export const accountArg = {
  account: z
    .string()
    .optional()
    .describe(
      "Which configured ThriveCart account to use, by name (for example 'navid-media'). Defaults to the first configured account. Call list_accounts to see them. Figures from one cart never include another.",
    ),
};

/** Page and per-page, on every paginating tool. */
export const pageArgs = {
  page: z.number().int().min(1).optional().describe("Page number, starting at 1."),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("How many to return per page, 1-100. Defaults to 25."),
};

export type ToolSpec<S extends Shape> = {
  name: string;
  /** One line, imperative. Shown in tool pickers. */
  title: string;
  description: string;
  schema: S;
  risk: Risk;
  /** True when calling twice has the same effect as calling once. */
  idempotent?: boolean;
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<unknown>;
  /** One line for the audit log and the confirm message, when this is a write. */
  summary?: (args: z.infer<z.ZodObject<S>>) => string;
};

export type AnyToolSpec = Tool<ToolContext>;

export function makeContext(
  client: ThriveCartClient,
  config: Config,
): ToolContext {
  return {
    client,
    config,
    account: (hint?: string) => selectAccount(config, hint),
  };
}

/** Clamp a caller-supplied page size into a range ThriveCart will accept. */
export function clamp(value: number | undefined, fallback: number, max = 100): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
}

/**
 * Kept so tool modules read the same, but never sent: Slipway adds `confirm`
 * to every irreversible tool itself, with one description everywhere.
 */
export const confirmArg = {
  confirm: z.boolean().optional(),
};

type Shape = Record<string, z.ZodType>;

/**
 * Slipway reads the status (or, without one, the words) to pick the exit code
 * and the error code. What else the error knew, such as the endpoint, rides
 * along in `details` for the model to read.
 */
export function toSlipway(error: ThriveCartError): SlipwayError {
  const known = toSlipwayError(error);
  const json = typeof (error as { toJSON?: () => unknown }).toJSON === "function" ? ((error as { toJSON: () => Record<string, unknown> }).toJSON()) : {};
  const { error: _message, type: _type, status: _status, retry_after_seconds: retryAfter, ...rest } = json as Record<string, unknown>;
  const details = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined && value !== ""));
  return new SlipwayError(known.message, known.code, known.exitCode, {
    ...(known.hint ? { hint: known.hint } : {}),
    ...(known.status !== undefined ? { status: known.status } : {}),
    ...(typeof retryAfter === "number" ? { retryAfterSeconds: retryAfter } : known.retryAfterSeconds !== undefined ? { retryAfterSeconds: known.retryAfterSeconds } : {}),
    ...(Object.keys(details).length ? { details } : {}),
    cause: error,
  });
}

export function defineTool<S extends Shape>(spec: ToolSpec<S>): Tool<ToolContext> {
  const { confirm: _confirm, ...shape } = spec.schema as Shape;
  const handler = spec.handler as (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
  return kit.defineTool({
    name: spec.name,
    title: spec.title,
    description: spec.description,
    input: z.object(shape),
    risk: spec.risk,
    // 2.2's confirmation said this, and it is truer of a refund than "is public".
    ...(spec.risk === "destructive" ? { consequence: "moves money or ends a customer's access and cannot be undone" } : {}),
    ...(spec.idempotent !== undefined ? { idempotent: spec.idempotent } : {}),
    ...(spec.summary ? { summary: spec.summary as (args: Record<string, unknown>) => string } : {}),
    handler: async (args, ctx) => {
      try {
        return await handler(args, ctx);
      } catch (error) {
        throw error instanceof ThriveCartError ? toSlipway(error) : error;
      }
    },
  });
}
