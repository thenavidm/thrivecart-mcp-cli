/**
 * `thrivecart-cli doctor`. Say what is wrong, in the order it will break.
 *
 * The failures people actually hit here are dull and specific: pointing at
 * api.thrivecart.com instead of thrivecart.com, pasting an account password
 * where an API key belongs, or configuring a second cart with a key that turns
 * out to be the first cart's. All three surface as an unexplained 401 or an
 * empty product list, so each check below reports the fix rather than the
 * status code, and every configured cart is checked separately. Slipway's own
 * checks, Node, writes and the audit log, come first.
 */

import type { DoctorCheck } from "@thenavidm/slipway";
import type { ThriveCartError } from "./api/errors.js";
import type { ToolContext } from "./tools/kit.js";

export async function doctor(ctx: ToolContext, options: { network: boolean }): Promise<DoctorCheck[]> {
  const { client, config } = ctx;
  if (config.accounts.length === 0) return [];
  const checks: DoctorCheck[] = [
    { name: "Carts", ok: true, detail: `${config.accounts.length} configured: ${config.accounts.map((a) => a.name).join(", ")}` },
  ];

  // The wrong host is the single most common setup error, and it fails in a way
  // that looks exactly like a bad key, so name it before testing credentials.
  for (const account of config.accounts) {
    if (!account.baseUrl.startsWith("https://thrivecart.com")) {
      checks.push({
        name: `${account.name} base URL`,
        ok: false,
        detail: account.baseUrl,
        fix: "ThriveCart's external API lives at https://thrivecart.com/api/external. The api.thrivecart.com host resolves but refuses everything, which looks like a bad key.",
      });
    }
  }
  if (!options.network) return checks;

  // Each cart is checked on its own. A key that works for one says nothing
  // about another, and a second cart configured with the first cart's key is a
  // real mistake that otherwise shows up as duplicated revenue.
  const seenAccounts = new Map<string, string>();

  for (const account of config.accounts) {
    try {
      // `ping` is the endpoint that identifies a key, and it is the one
      // `whoami` uses. `account` answers 501, so it cannot tell a good key.
      const data = (await client.get(account, "ping")) as Record<string, unknown>;
      // `account_id` is what decides whether two configured carts are really
      // one, because it is the only field guaranteed unique per cart. The name
      // is only for the human reading the line.
      const str = (v: unknown): string => (typeof v === "string" && v ? v : "");
      const identity = str(data.account_id);
      const label = [str(data.account_name), identity && `#${identity}`].filter(Boolean).join(" ") || str(data.user_username) || identity;
      checks.push({ name: `${account.name} key`, ok: true, detail: `valid${label ? ` (${label})` : ""}` });

      if (identity) {
        const clash = seenAccounts.get(identity);
        if (clash) {
          checks.push({
            name: `${account.name} and ${clash}`,
            ok: false,
            detail: `Both keys resolve to ThriveCart account ${identity}.`,
            fix: "One of the keys is wrong, and leaving it will double-count revenue when both are queried.",
          });
        } else {
          seenAccounts.set(identity, account.name);
        }
      }
    } catch (error) {
      const e = error as ThriveCartError;
      checks.push({ name: `${account.name} key`, ok: false, detail: `${e.status === 401 || e.status === 403 ? "rejected" : "check failed"}: ${e.message}` });
      continue;
    }

    // A valid key that reads nothing is a permissions problem, not an auth one.
    try {
      const products = await client.get(account, "products");
      const count = Array.isArray(products)
        ? products.length
        : Array.isArray((products as Record<string, unknown>)?.products)
          ? ((products as Record<string, unknown>).products as unknown[]).length
          : undefined;
      checks.push({ name: `${account.name} products`, ok: true, detail: `readable${count === undefined ? "" : ` (${count})`}` });
    } catch (error) {
      checks.push({ name: `${account.name} products`, ok: false, detail: `cannot read: ${(error as Error).message}` });
    }
  }
  return checks;
}
