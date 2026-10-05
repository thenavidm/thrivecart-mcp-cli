/**
 * The ThriveCart app: everything Slipway needs to ship the MCP server and the CLI.
 *
 * This file only describes. It never starts anything, so `slipway check` and
 * tests can import it; `index.ts` is what runs.
 */

import { createRequire } from "node:module";
import { slipway } from "@thenavidm/slipway";
import { ThriveCartClient } from "./api/client.js";
import { loadConfig } from "./config.js";
import { doctor } from "./doctor.js";
import { INSTRUCTIONS, PROMPTS, RESOURCES } from "./guide.js";
import { ALL_TOOLS } from "./tools/index.js";
import { makeContext, type ToolContext } from "./tools/kit.js";

const require = createRequire(import.meta.url);
export const VERSION: string = (require("../package.json") as { version: string }).version;

export const app = slipway<ToolContext>({
  name: "thrivecart",
  title: "ThriveCart",
  version: VERSION,
  package: "@thenavidm/thrivecart-mcp-cli",
  description: "products and their pricing, bumps, upsells and downsells, transactions and revenue, customers, subscriptions and affiliates in ThriveCart",
  instructions: INSTRUCTIONS,
  context: () => {
    const config = loadConfig();
    return makeContext(new ThriveCartClient(config), config);
  },
  configured: (ctx) => ctx.config.accounts.length > 0,
  secrets: (ctx) => ctx.config.accounts.map((account) => account.apiKey),
  tools: ALL_TOOLS,
  resources: [
    {
      name: "thrivecart-accounts",
      uri: "thrivecart://accounts",
      mimeType: "application/json",
      read: (ctx) => ({
        count: ctx.config.accounts.length,
        accounts: ctx.config.accounts.map((a) => ({ name: a.name, base_url: a.baseUrl })),
        read_only: ctx.config.readOnly,
      }),
    },
    ...RESOURCES.map((resource) => ({ name: resource.name, uri: resource.uri, mimeType: resource.mimeType, read: () => resource.text })),
  ],
  prompts: PROMPTS.map((prompt) => ({ name: prompt.name, description: prompt.description, render: () => prompt.text })),
  doctor,
  // A wrong host and a wrong key both look like a 401, so doctor asks ThriveCart every time, as 2.2 did.
  doctorNetwork: true,
  login: "Set THRIVECART_API_KEY to an API key from ThriveCart Settings > API & Webhooks, or THRIVECART_ACCOUNTS to a JSON array for several carts. Run `thrivecart-cli doctor` to check it.",
  // 2.2 listened on 8788 by default, and anything already pointed at it keeps working.
  httpPort: 8788,
  settings: [
    { env: "THRIVECART_ACCOUNTS", description: 'Several carts at once: [{"name":"main","api_key":"..."},{"name":"clients","api_key":"..."}].', secret: true },
    { env: "THRIVECART_API_KEY", description: "One API key, from Settings > API & Webhooks.", secret: true },
    { env: "THRIVECART_ACCOUNT_NAME", description: 'What to call that single cart. Defaults to "default".' },
    { env: "THRIVECART_DEFAULT_ACCOUNT", description: "Which cart answers when a tool names none." },
    { env: "THRIVECART_REQUEST_TIMEOUT_MS", description: "Per-request deadline. Defaults to 30000.", tuning: true },
    { env: "THRIVECART_MIN_REQUEST_INTERVAL_MS", description: "Spacing between requests. Defaults to 1000.", tuning: true },
    { env: "THRIVECART_MAX_RETRIES", description: "Retries on rate limits and 5xx. Defaults to 3.", tuning: true },
    { env: "THRIVECART_MAX_PAGES", description: "Ceiling when walking transactions. Defaults to 100.", tuning: true },
    { env: "THRIVECART_BASE_URL", description: "The API host, for a proxy or a test.", tuning: true },
    { env: "THRIVECART_USER_AGENT", description: "The User-Agent sent to ThriveCart.", tuning: true },
  ],
  links: { repository: "https://github.com/thenavidm/thrivecart-mcp-cli" },
});
