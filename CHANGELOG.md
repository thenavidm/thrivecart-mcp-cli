# Versions

## 3.0.1, 2026-10-05

- **Built on Slipway 0.1.17**, which a fresh install of 3.0.0 already used. Since the Slipway 3.0.0 was measured on, 0.1.7, `which` also reads a tool's argument names and prints a title once where a description opens with it, and the general help names the settings that connect an account and the safety switches and counts the rest, which `agent-context` describes one by one. [Slipway's changelog](https://github.com/thenavidm/slipway/blob/main/CHANGELOG.md) lists the rest.
- **The README documents `THRIVECART_HTTP_ALLOWED_ORIGINS`**, the browser origins `--http` accepts, which Slipway reads.
- **A test checks that every setting is named in `--help` or described by `agent-context`**, where it asked `--help` to name each one.

## 3.0.0, 2026-10-05

Built on [Slipway](https://github.com/thenavidm/slipway) 0.1.7. The 24 tools keep their names and arguments, and every difference below was measured against 2.2.3 before release.

- **A person approves each refund and cancellation over MCP.** Claude Code (2.1.246 and later) shows its own prompt for each one, and a client that can show forms asks with an approval form whose one box starts unticked. Approvals are signed, bound to the exact call and work once. Where a client can do neither, the model's `confirm: true` still counts, and `THRIVECART_CONFIRM=model` makes it enough everywhere, for an agent with no person to ask. The refusal still says the refund moves money, and the audit log records who approved each write.
- **A smaller tool list.** 7,230 tokens in Claude Code with every tool loaded, down from 8,090: the per-tool `$schema` line, an `execution` field and `additionalProperties: false` are gone. The last one advertised strict input while unknown keys were dropped anyway; the schema now says what happens. The two tools that need approval now say so to Claude Code, which asks before each.
- **Exit codes follow the house contract everywhere.** An unknown command and a write in read-only mode exit 2 instead of 1, and `doctor` with nothing configured exits 10 instead of 1. 1 now means an unexpected error, and a ThriveCart that cannot be reached still exits 5. Errors keep the endpoint and the cart in `details`, and a rate limit says how long to wait.
- **Much cheaper to find a command through the CLI.** `which <words>` finds one without the full list. In Codex, finding the command that pauses a subscription took 83,647 input tokens instead of 127,587 (median of five), in three commands every time, where 2.2.3 guessed a command that did not exist and read the full list. Over MCP the same task read 21 more out of about 48,000, from the standard `confirm` wording.
- **`install <client>`** adds the server to Claude Code, Codex, Claude Desktop, Cursor, VS Code or Gemini CLI in each one's own format, naming only the settings that connect a cart.
- **Less work to start.** The entry turns on Node's compile cache, and the server spends 171 ms of CPU before its first answer where 2.2.3 spent 213 (median of 21 runs, taking turns on one busy Mac). npx installs 4 dependencies instead of 94.
- **`--help` lists every setting the server reads**, Slipway's own included, and restored tests keep the README and `--help` in step with the code. The `--select` and choice-list cases this repo's tests guarded now live in Slipway's.
- **README fixes.** The Docker section pointed at an image that was never published; it now builds one from the repository. The exit codes, the refusal and `doctor` are shown as they print, `npm bin -g`, which current npm no longer has, is gone from troubleshooting, the release workflow attaches the desktop extension the README sends people to, and the icon loads from cdn.navid.me. THIRD_PARTY_NOTICES.md lists the production dependencies' licenses.

### Upgrading

Node 22 or newer. Scripts keep working for success, usage errors and missing setup; a script that treated exit 1 as "unknown command" or "read-only" should read 2. Over MCP, expect an approval prompt or form for each refund and cancellation; a headless agent that should act with `confirm: true` alone needs `THRIVECART_CONFIRM=model`. A script that pipes JSON-RPC into the server must keep stdin open until it reads the answer: the server now stops when its input ends, as the MCP stdio binding asks. `--http --port` with something that is not a port number stops with exit 2 instead of using the default, and `--http` will not start on an address other than localhost without `THRIVECART_HTTP_TOKEN`. Two terminal screens grew: the general help by 168 tokens, for `which`, `install`, the flags, the exit codes and the safety settings it now lists, and the command list by 24, for the lines that point to `which` and `--help`.

## 2.2.3, 2026-10-04

- **`npx -y @thenavidm/thrivecart-mcp-cli` starts the MCP server whatever order npm keeps.** npx starts whichever binary the npm registry lists first when they share one file, and the registry does not keep the published order. For this package that happened to be the server; for 23 others it was the CLI. A third binary named after the package, on its own file, now always starts the server, and npx picks it by name.
- **`--port 8790` works, not only `--port=8790`.** The space form fell through to the default port without a word. A bare `--port`, `--portable` or a port that is not a positive number now falls back to `THRIVECART_HTTP_PORT`, then 8788, and the flag beats the environment variable.

## 2.2.2

One dead link. The "you need a ThriveCart account" row pointed at a redirect on navid.me that was never set up and answered 404, which is a bad first impression on the one line telling somebody where to sign up. It points at thrivecart.com now. Every other link in every document was checked the same way.

## 2.2.1

**`doctor` called an endpoint that does not exist.** It asked ThriveCart for `account`, which answers 501, so a perfectly valid API token was reported as `check failed` and the person went looking for a problem with their key. 2.1.0 moved `whoami` to `ping` and missed this one. Verified against the live API: `GET /ping` returns 200 with the account identity, `GET /account` returns 501.

The line it prints now names the cart ThriveCart says the token belongs to, as `navid #3014`, so a cart name you chose that points somewhere else is visible rather than assumed. The duplicate-cart check keys on `account_id`, which is the field that is actually unique per cart.

## 2.2.0

**A CLI, alongside the MCP server.** Every one of the 24 tools is now a shell command under the same name with dashes, generated from the same `ALL_TOOLS` array the server registers, through the same handlers and the same write guard. Nothing is described twice, so a tool added tomorrow is a command tomorrow.

```bash
thrivecart-cli                                   # every command, one line each
thrivecart-cli get-revenue-summary --date-from 2026-01-01
thrivecart-cli refund-transaction --order-id 9999 --confirm
thrivecart-cli schema get-transactions           # the JSON Schema an MCP client sees
```

`--json`, `--compact`, `--select a,b.c` and `--agent` shape the output. `thrivecart-cli <command> --help` derives its flags from the Zod schema, so help cannot drift from validation.

**Renamed to `@thenavidm/thrivecart-mcp-cli`**, on npm and on GitHub, because the package is no longer only an MCP server. `@thenavidm/thrivecart-mcp` is deprecated with a pointer to the new name.

**A Claude Desktop extension.** `desktop-extension/build.sh` produces a `.mcpb` that vendors its own dependencies, so it installs on a double click with nothing present first. It asks for the API token, a name for the cart, and whether to run read only or without refunds and cancellations.

**Four fixes to the CLI adapter.**

- Nothing configured exits **10**, not 4. The message names an API key, so matching auth first sent someone who had configured nothing hunting for a revoked credential. Config is tested first now, and only when there is no HTTP status, so a real 401 still exits 4.
- A refused write exits **2**, not 5. No `--confirm`, `THRIVECART_READ_ONLY=1`, or destructive writes switched off are all the caller getting the invocation wrong, not the API failing. Retrying unchanged was never going to work.
- An array of enums is a repeatable word, not JSON. `--status refunded` was rejected and you had to write `--status '"refunded"'`.
- `doctor` and `help` are reachable from `thrivecart-cli`. They were rejected as unknown commands, which sent someone diagnosing the CLI over to the server binary.

**`--select` no longer drops fields.** Two paths under one head overwrote each other, so `--select orders.id,orders.total` quietly returned only the total. Paths are grouped by their first segment before recursing. Silent data loss in a flag whose whole purpose is choosing what you keep, on a connector where the dropped field might be the amount.

**`--version` and `doctor` report the real version.** `VERSION` was a hardcoded constant that had drifted to 2.1.0 while `package.json` moved on. It is read from `package.json` now, and a test asserts they match.

**Two documentation claims were unsourced and are corrected.** This server said ThriveCart's `product_id` filter on transactions "is unreliable and silently returns rows for other products". ThriveCart documents no product filter on `/transactions` at all: the parameters are `page`, `perPage`, `query`, `transactionType` and `currency`. Filtering still happens here on `item_name`, for a better reason than the one previously given. The corrected wording is in the tool description, the `thrivecart://concepts` resource, and the README.

**A refund does not cancel a subscription**, which is ThriveCart's own documented behaviour and was nowhere in this server's descriptions. Refund a subscription payment and that subscription keeps billing. `refund_transaction` now says so, and so do the README and SKILL.md.

**The README carries the measured context cost.** A real `initialize` plus `tools/list` handshake against the built server, tokenised: **~5,100 tokens every turn** for all 24 tools, ~3,900 for the 19 that survive `THRIVECART_READ_ONLY=1`. 53% of that is the protocol serialising JSON Schema and nothing can write it away. The CLI costs nothing standing and about 280 tokens to list its commands.

Also: a publish workflow that fires on a tag, an exit-code table in the README with every row produced by running the binary against a server returning that status, and an environment variable reference split into credentials, safety, tuning and HTTP.

80 tests, up from 69.

## 2.1.0

**Six endpoints were wrong and are now fixed.** Every path in this server was inherited from the 1.x release and had never been checked against ThriveCart's own SDK. Verified against [thrivecart/php-api](https://github.com/thrivecart/php-api) `src/Api.php`:

| Tool | Was calling | Correct endpoint |
|---|---|---|
| `get_product_pricing` | `products/{id}/prices` | `products/{id}/pricing_options` |
| `cancel_subscription` | `cancel` | `cancelSubscription` |
| `pause_subscription` | `pause` | `pauseSubscription` |
| `resume_subscription` | `resume` | `resumeSubscription` |
| `create_affiliate` | `affiliate/create` | `POST /affiliates` |
| `whoami` | `account` | `ping` |

Every one of those returned an error before this release.

**`get_customers` is removed.** ThriveCart has no endpoint that lists customers. The tool called `/customers`, which does not exist. Use `get_transactions` to see many buyers at once.

**Rate limiting corrected.** ThriveCart documents 60 requests per minute per account. The client paced at 120ms, which is 500 per minute, so `get_revenue_summary` would rate limit almost immediately. The default is now 1000ms.

**Added:** `get_bump_pricing`, `get_upsell_pricing` and `get_downsell_pricing`, which ThriveCart exposes and this server did not.

24 tools, up from 22.

Documentation corrected throughout to match the API rather than assumption, including the exact key location (Settings, then API & webhooks, then API tokens) and a FAQ with no unverifiable claims in it.

## 2.0.1

Documentation only. Removed em dashes throughout, numbered the FAQ section, and corrected the authorship line and its placement. No code or tool changes.

## 2.0.0

Complete rewrite in TypeScript. The 1.x server was a single `index.mjs` holding one API key.

**Several carts at once.** `THRIVECART_ACCOUNTS` takes a JSON array and every tool gained an `account` argument. ThriveCart licenses per account, so most people run more than one, and 1.x meant restarting the server to look at a different cart. Exact name beats prefix match, duplicate names are refused at load, and `doctor` catches two carts configured with the same key, which otherwise shows up as doubled revenue.

**Writes are guarded.** `cancel_subscription` and `refund_transaction` refuse without `confirm: true`, and the refusal names the order and what will happen. `THRIVECART_READ_ONLY=1` removes all five write tools from the list. `THRIVECART_AUDIT_LOG` records every attempted write. 1.x would refund on a single unguarded call.

**Money is exact.** Amounts are summed in integer cents. 1.x used `parseFloat` and accumulated floats, so totals drifted, and a row with an unreadable amount produced `NaN` that silently poisoned the whole figure.

**A page is no longer mistaken for a period.** `get_transactions` reports its `scope`, and walking every page stops at `THRIVECART_MAX_PAGES` with a truncation warning rather than returning partial figures as if complete.

**Errors say what to fix.** Typed errors that name the likely cause (wrong host, account password instead of an API key, a record belonging to another cart) instead of `ThriveCart API error 401`.

**New:** `list_accounts`, `whoami`, `doctor`, HTTP transport, three resources, three prompts, 44 tests, CI on Linux, macOS and Windows against Node 20 and 22, and a Dockerfile.

**Renamed on npm.** The package became `@thenavidm/thrivecart-mcp` at this release, and `@thenavidm/thrivecart-mcp-cli` at 2.2.0. The unscoped `thrivecart-mcp` name was unpublished and cannot be reused.

## 1.0.0

Initial release. Single-file JavaScript server, 20 tools, one API key, AGPL-3.0.
