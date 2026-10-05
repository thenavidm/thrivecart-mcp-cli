/**
 * The words a client reads: server instructions, the guides served as
 * resources, and the prompts. Moved verbatim from the v1 server.
 */

export const INSTRUCTIONS = `Tools for ThriveCart: products and their pricing, bumps, upsells and downsells, transactions and revenue, customers, subscriptions and affiliates.

5 things worth knowing before calling anything:

1. More than one cart can be configured, and they share nothing. Every tool takes an \`account\` argument; omit it to use the default. Call list_accounts when it is not obvious which cart a request means, and never present one cart's revenue as the whole business unless you have checked there is only one.

2. ThriveCart's own \`product_id\` filter on transactions is unreliable. It returns rows for other products, silently. Filter with \`item_name\` and a date range instead. get_transactions and get_revenue_summary already do.

3. get_transactions returns a single page unless you pass \`fetch_all\`. A page total is not a period total, and the result says which one you are looking at. get_revenue_summary always walks every page, which makes it the expensive call here, so give it a date range rather than asking for all time.

4. cancel_subscription ends a customer's access and refund_transaction moves real money. Neither can be undone from here, so both refuse to run without \`confirm: true\`. Pass it when the person you are working for has actually asked for that action, not to get past the refusal. pause_subscription is reversible with resume_subscription and needs no confirmation, so prefer pausing whenever the customer might come back.

5. Order ids come from get_customer or get_transactions. Customers and affiliates are identified by email; there are no ids for them.

Start with list_accounts to see which carts are configured, get_revenue_summary for how a cart is doing, or list_products for what it sells.`;

/** Resources whose text never changes. */
export const RESOURCES = [
  { name: "thrivecart-concepts", uri: "thrivecart://concepts", mimeType: "text/markdown", text: `# ThriveCart, for an agent

## Accounts are islands
ThriveCart licenses per account, so one person often runs several. Products, customers, affiliates
and revenue are entirely separate per account. Nothing joins across them, and adding two carts'
revenue together is a decision, not a default.

## The API host
The external API is \`https://thrivecart.com/api/external\`. **Not** \`api.thrivecart.com\`, which
exists, resolves, and refuses everything, so getting it wrong looks exactly like a bad key.
Auth is a bearer API key from Settings > API & Webhooks.

## Products and prices
A **product** is the thing sold. Its **prices** are a separate record, because one product can carry
several price points at once: one-time, split pay, subscription. The headline price is not
necessarily what a given customer paid.

## The three add-on types
- **Bump.** A checkbox on the checkout page itself, before payment.
- **Upsell.** An offer shown after the main purchase completes.
- **Downsell.** The fallback shown when an upsell is declined.

They are separate record types. An "upsell" in casual speech is often a bump.

## Transactions
A transaction is one payment event, so a split-pay product produces several. Field names are not
consistent across endpoints or account vintages: an amount arrives as \`amount\` or \`total\`, a date
as \`date\` or \`created_at\`, a product name as \`item_name\` or \`product_name\`. These tools normalise
all of that and sum money in integer cents, so totals are exact.

## There is no product filter on transactions
The parameters ThriveCart documents on \`/transactions\` are \`page\`, \`perPage\`, \`query\`,
\`transactionType\` and \`currency\`. \`product_id\` is not one of them, so passing it is a guess whose
result nobody has promised. get_transactions filters on \`item_name\` after fetching instead.

## Identity
Customers and affiliates have **no id**. Email is the identity, and lookups are POST, not GET.
Orders and subscriptions do have ids, and those come from get_customer or get_transactions.

## What cannot be undone
Cancelling a subscription ends access; the customer must buy again. A refund is handed straight to
the payment gateway and cannot be reversed there, so there is no undo. A refund also does not cancel
anything: refund a subscription payment and that subscription keeps billing on its normal schedule.
Pausing is the reversible option and usually the right one.` },
];

export const PROMPTS = [
  { name: "revenue-report", description: "Report revenue for a period, across every cart", text: `Give me a revenue report. Ask me for the period if I have not named one.

1. list_accounts first. If more than one cart is configured, run the rest per cart and keep the figures separate.
2. get_revenue_summary for the period, per account.
3. Compare against the previous period of the same length.

Report: total revenue and sales per cart, the products driving it, what moved versus last period, and anything that looks like an anomaly rather than a trend. Give exact figures, and say plainly if a cart returned a truncation warning, because that means the totals are incomplete. Do not add carts together unless I ask.` },
  { name: "customer-lookup", description: "Find a customer and explain their history", text: `Look up a customer for me. Ask for their email if I have not given it.

1. list_accounts. If several carts are configured, check each one, because a customer may exist on only one, and "not found" on the first cart does not mean they are not a customer.
2. get_customer on each.

Tell me: what they bought and when, what they are paying now, whether any subscription is active, paused or cancelled, and the order ids. Do not pause, cancel or refund anything. If I ask you to, show me the amount first and wait for me to confirm.` },
  { name: "product-performance", description: "Work out which products actually carry the cart", text: `Tell me which products actually carry this cart. Ask which account if several are configured.

1. list_products, then list_bumps, list_upsells and list_downsells so you know the full offer surface.
2. get_revenue_summary over the last 12 months.

Then tell me: the products earning most, the ones earning almost nothing, and how much of the total comes from bumps and upsells rather than the main products. Rank by revenue, not by sales count. A cheap product with many sales and an expensive one with few are different businesses. Quote exact figures and say when the sample is too small to support a claim instead of making one.` },
];
