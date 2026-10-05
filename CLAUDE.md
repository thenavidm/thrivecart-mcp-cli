# thrivecart-mcp-cli, for agents working on this repo

TypeScript, ESM, Node >= 20. Published to npm as `@thenavidm/thrivecart-mcp-cli`. Source on GitHub at `thenavidm/thrivecart-mcp-cli`. Two binaries, `thrivecart-mcp` (the MCP server) and `thrivecart-cli` (the shell surface), both pointing at `dist/index.js`.

## Before changing anything

```bash
npm run typecheck && npm test && npm run build
```

Then prove the server actually starts, which the build does not tell you:

```bash
printf '%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"x","version":"1"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | THRIVECART_API_KEY=x node dist/index.js
```

24 tools, 19 of them with `THRIVECART_READ_ONLY=1`. If either number changes, update it in `README.md`, the `package.json` description, `desktop-extension/manifest.json`, and `.github/workflows/ci.yml`, which asserts both. Read the count off the `thrivecart-cli 3.0.0: N commands` header that `thrivecart-cli` prints; counting the listing lines with `grep -c` includes the header and gives one too many.

## Layout

| Path | Holds |
|---|---|
| `src/app.ts` | The Slipway app: tools, settings, doctor. Slipway serves MCP, the CLI and `--http`, and owns the write guard and the audit log |
| `src/guide.ts` | Server instructions, resources and prompts |
| `src/doctor.ts` | Per-cart checks: the base URL, the key, a second cart sharing the first one's key |
| `src/config.ts` | Credentials and the multi-account model |
| `src/api/` | HTTP client and typed errors |
| `src/format/` | Normalizing ThriveCart's inconsistent fields |
| `src/tools/` | One module per group; `kit.ts` adapts them to Slipway and keeps each error's endpoint and cart |
| `desktop-extension/` | The `.mcpb` for Claude Desktop; `build.sh` vendors `node_modules` |

A new tool goes in the matching `src/tools/` module via `defineTool`, then into `ALL_TOOLS`. Slipway handles annotations, guarding and error shaping, so do not hand-roll those.

## Things that are decided

- **Base URL is `thrivecart.com/api/external`.** Never `api.thrivecart.com`, which resolves and refuses everything.
- **Never filter transactions by `product_id`.** ThriveCart documents no product filter on `/transactions`; the parameters are `page`, `perPage`, `query`, `transactionType` and `currency`. Filter on `item_name`, here, after fetching.
- **Money is integer cents.** Never accumulate floats. `src/format/transactions.ts` owns this.
- **Field names vary.** `amount`/`total`, `date`/`created_at`, `item_name`/`product_name`. Read them through `format/transactions.ts`, never inline.
- **Only `cancel_subscription` and `refund_transaction` are `destructive`.** Over MCP a person approves each; `confirm: true` counts only where the client cannot ask. Pausing is reversible. Do not make reversible tools need approval; it trains the reflex the guard exists to prevent.
- **Every anticipated failure is a `ThriveCartError` subclass** from `api/errors.ts`. Slipway turns its status into the exit code and a structured result the model can act on, and `kit.ts` keeps the endpoint and the cart in `details`. A plain `Error` keeps its message but exits 1, unexpected, unless its words match a known failure.

## House rules

MIT, `Copyright (c) 2026 Navid Moazzez`. No AI attribution in commits, no `Co-Authored-By` trailers, issues yes and pull requests no, as `CONTRIBUTING.md` says. Never name another repo or project in anything published.
