/**
 * The two surfaces, now that Slipway builds both from ALL_TOOLS.
 *
 * Parsing, help and the exit-code contract are Slipway's and tested there,
 * along with the --select and enum-array cases this file used to hold. What
 * matters here: every tool arrives on both surfaces intact, the guard behaves
 * as the README promises, ThriveCart's errors keep their exit codes and their
 * details, and the docs stay in step with the code.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXIT, toSlipwayError } from "@thenavidm/slipway";
import { checkApp, cli, connect } from "@thenavidm/slipway/testing";
import { AuthenticationError, NotFoundError, RateLimitError, ServerError, ThriveCartError, TimeoutError, ValidationError } from "../src/api/errors.js";
import { app, VERSION } from "../src/app.js";
import { ALL_TOOLS } from "../src/tools/index.js";
import { toSlipway } from "../src/tools/kit.js";

const env = {};

describe("ThriveCart on Slipway", () => {
  it("offers every tool as a command and over MCP, under the same names", async () => {
    const list = await cli(app, [], { env });
    for (const tool of ALL_TOOLS) expect(list.stdout).toContain(tool.command);

    const mcp = await connect(app, { env });
    const names = (await mcp.listTools()).map((tool) => tool.name).sort();
    await mcp.close();
    expect(names).toEqual(ALL_TOOLS.map((tool) => tool.name).sort());
  });

  it("refuses a refund without --confirm, before anything reaches the network", async () => {
    const run = await cli(app, ["refund-transaction", "--order-id", "9999"], { env });
    expect(run.code).toBe(2);
    expect(JSON.parse(run.stderr).code).toBe("refused");
    expect(run.stderr).toContain("--confirm");
  });

  it("hides every write when THRIVECART_READ_ONLY is set, and refuses one typed anyway", async () => {
    const mcp = await connect(app, { env: { THRIVECART_READ_ONLY: "1" } });
    const tools = await mcp.listTools();
    await mcp.close();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
    expect((await cli(app, ["refund-transaction", "--order-id", "9999", "--confirm"], { env: { THRIVECART_READ_ONLY: "1" } })).code).toBe(2);
  });

  it("refuses cancelling and refunding with THRIVECART_ALLOW_DESTRUCTIVE=0, even confirmed", async () => {
    const run = await cli(app, ["cancel-subscription", "--order-id", "9999", "--confirm"], { env: { THRIVECART_ALLOW_DESTRUCTIVE: "0" } });
    expect(run.code).toBe(2);
    expect(JSON.parse(run.stderr).code).toBe("refused");
  });

  it("reports a missing argument by its flag and exits 2", async () => {
    const run = await cli(app, ["get-product"], { env });
    expect(run.code).toBe(2);
    expect(JSON.parse(run.stderr).error).toContain("--product-id");
  });

  /** The message names an API key, so matching auth first sent someone who had configured nothing hunting for a revoked one. */
  it("calls a run with no cart configured not configured, exit 10, and says how to connect one", async () => {
    expect((await cli(app, ["whoami"], { env: {} })).code).toBe(EXIT.notConfigured);
    expect((await cli(app, ["login"], { env })).stdout).toContain("THRIVECART_API_KEY");
  });

  it("passes slipway check", async () => {
    const report = await checkApp(app, { env });
    expect(report.findings.filter((finding) => finding.level === "error")).toEqual([]);
  });

  /** A hardcoded VERSION drifts the moment a release bumps package.json and not the constant. */
  it("takes its version from package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")) as { version: string };
    expect(VERSION).toBe(pkg.version);
    expect(app.version).toBe(pkg.version);
  });
});

describe("ThriveCart's errors keep their exit codes", () => {
  const at = "transactions";
  it.each([
    ["a rejected key", new AuthenticationError("Key rejected.", 401, at, "main"), EXIT.auth],
    ["bad arguments", new ValidationError("Bad date.", 400, at, "main"), EXIT.usage],
    ["an order that is gone", new NotFoundError("Not found.", 404, at, "main"), EXIT.notFound],
    ["a rate limit", new RateLimitError("Slow down.", 429, at, "main", "", 30), EXIT.rateLimited],
    ["a server failure", new ServerError("Boom.", 503, at, "main"), EXIT.api],
    ["our own deadline", new TimeoutError("No answer in 30 s.", 0, at, "main"), EXIT.api],
    ["no answer at all", new ThriveCartError("Could not reach ThriveCart: fetch failed", 0, at, "main"), EXIT.api],
  ])("maps %s", (_label, error, code) => {
    expect(toSlipwayError(toSlipway(error)).exitCode).toBe(code);
  });

  it("keeps the cart, the endpoint and the wait in the error a client receives", () => {
    const error = new RateLimitError("Slow down.", 429, at, "main", "", 30);
    expect(toSlipway(error).toJSON()).toMatchObject({ code: "rate_limited", status: 429, retry_after_seconds: 30, details: { endpoint: at, account: "main" } });
  });
});

describe("documentation stays in step with the code", () => {
  const read = (p: string): string => readFileSync(new URL(p, import.meta.url), "utf-8");
  const names = (text: string): Set<string> => new Set(text.match(/THRIVECART_[A-Z_]+/g) ?? []);
  const source = (dir: string): string =>
    readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })
      .map((entry) => (entry.isDirectory() ? source(`${dir}${entry.name}/`) : entry.name.endsWith(".ts") ? read(`${dir}${entry.name}`) : ""))
      .join("\n");

  /** Every variable the server reads: this repo's code, and Slipway's as agent-context lists them. */
  const used = async (): Promise<Set<string>> => {
    const context = JSON.parse((await cli(app, ["agent-context"], { env })).stdout);
    return new Set([...names(source("../src/")), ...context.settings.map((setting: { env: string }) => setting.env)]);
  };

  /**
   * Variables shipped undocumented and others never reached `--help`, which is
   * the kind of drift nobody notices because both sides look complete on their own.
   */
  it("documents every environment variable the server reads", async () => {
    const documented = names(read("../README.md"));
    expect([...(await used())].filter((v) => !documented.has(v))).toEqual([]);
  });

  it("lists every environment variable in --help", async () => {
    const help = (await cli(app, ["--help"], { env })).stdout;
    // The help groups the three HTTP ones as `THRIVECART_HTTP_PORT / _HOST / _TOKEN`.
    const shorthand = new Set(["THRIVECART_HTTP_HOST", "THRIVECART_HTTP_TOKEN"]);
    expect([...(await used())].filter((v) => !help.includes(v) && !shorthand.has(v))).toEqual([]);
  });

  /**
   * Two in-page links pointed at headings that had been renamed, including the
   * one row routing a shell user to the CLI. The ship checklist's link pass only
   * greps http, so a dead `#anchor` is the kind that ships quietly.
   */
  it.each(["../README.md", "../INSTALL.md"])("has no dead in-page anchors in %s", (file) => {
    if (!existsSync(new URL(file, import.meta.url))) return; // repo may ship one doc
    const md = read(file);
    const slugs = new Set<string>();
    for (const [, heading] of md.matchAll(/^#{2,4} (.+)$/gm)) {
      const stripped = (heading as string).toLowerCase().replace(/[^\w\s-]/g, "");
      // GitHub keeps the trailing hyphen when a heading ends in an emoji.
      slugs.add(stripped.trim().replace(/\s+/g, "-"));
      slugs.add(stripped.replace(/\s+/g, "-"));
    }
    const dead = [...md.matchAll(/\[[^\]]+\]\(#([^)]+)\)/g)]
      .map((m) => m[1] as string)
      .filter((a) => !slugs.has(a));
    expect(dead).toEqual([]);
  });
});
