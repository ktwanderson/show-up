import { BrowserContext } from "playwright";
import { loadSession, saveSession } from "./session.js";

export interface ProductResult {
  asin: string;
  title: string;
  price: string;
  url: string;
}

export interface CartItem {
  asin: string;
  title: string;
  price: string;
  quantity: number;
}

// A single product found in Amazon order history
export interface OrderHistoryResult {
  asin: string;
  title: string;
  lastOrderedDate: string;
  price: string;
  url: string;
}

// The resolved recommendation for one item in a grocery list
export interface GroceryItemResult {
  requestedItem: string;
  // "order_history" = found a past purchase to prefer
  // "search"        = no past purchase, using top Amazon search result
  // "not_found"     = nothing found at all
  source: "order_history" | "search" | "not_found";
  product: ProductResult | null;
  orderHistory?: OrderHistoryResult;
}

// Full response from processGroceryList
export interface GroceryListResult {
  items: GroceryItemResult[];
  summary: string;
}

// Module-level cached context so we reuse the same browser session
let context: BrowserContext | null = null;

async function getContext(): Promise<BrowserContext> {
  if (context) return context;
  context = await loadSession();
  if (!context) {
    throw new Error(
      "Not logged in to Amazon. Use the setup_login tool first, then try again."
    );
  }
  return context;
}

// Reset cached context (called after login)
export function resetContext(): void {
  context = null;
}

// Search Amazon and return the top 5 results as structured data only
export async function searchAmazon(query: string): Promise<ProductResult[]> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(
      `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded" }
    );

    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-asin]:not([data-asin=""])');
      const output: Array<{
        asin: string;
        title: string;
        price: string;
        url: string;
      }> = [];

      for (const item of Array.from(items).slice(0, 5)) {
        const asin = item.getAttribute("data-asin") ?? "";
        const titleEl =
          item.querySelector("h2 a span") ??
          item.querySelector(".a-text-normal");
        const priceEl = item.querySelector(".a-price .a-offscreen");

        if (asin && titleEl?.textContent?.trim()) {
          output.push({
            asin,
            title: titleEl.textContent.trim(),
            price: priceEl?.textContent?.trim() ?? "Price unavailable",
            url: `https://www.amazon.com/dp/${asin}`,
          });
        }
      }

      return output;
    });

    return results;
  } finally {
    await page.close();
  }
}

// Add a product to cart by ASIN
export async function addToCart(asin: string): Promise<string> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(`https://www.amazon.com/dp/${asin}`, {
      waitUntil: "domcontentloaded",
    });

    // Grab the title for a friendly confirmation message
    const title = await page
      .locator("#productTitle")
      .textContent({ timeout: 5000 })
      .catch(() => asin);

    // Click the Add to Cart button
    await page.locator("#add-to-cart-button").click({ timeout: 10000 });

    // Wait for Amazon's cart confirmation UI
    await page.waitForSelector(
      "#NATC_SMART_WAGON_CONF_MSG_SUCCESS, #sw-atc-confirmation, .a-alert-success",
      { timeout: 10000 }
    );

    // Refresh cookies so session stays alive
    await saveSession(ctx);

    return `✓ Added "${title?.trim()}" (ASIN: ${asin}) to your cart.`;
  } finally {
    await page.close();
  }
}

// Search Amazon order history for a past purchase matching a query
export async function searchOrderHistory(
  query: string
): Promise<OrderHistoryResult | null> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(
      `https://www.amazon.com/gp/your-account/order-history?search=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded" }
    );

    // Wait for either order results or the "no orders found" message
    await page
      .waitForSelector(".order, .no-orders-found-message, #noOrdersFound", {
        timeout: 15000,
      })
      .catch(() => null); // Don't throw if neither appears; evaluate() handles it

    const result = await page.evaluate(() => {
      // Check for "no results" state first to avoid false empty parses
      if (
        document.querySelector(".no-orders-found-message, #noOrdersFound")
      ) {
        return null;
      }

      // Walk product links in the order history page
      const links = document.querySelectorAll(
        'a[href*="/dp/"], a[href*="/gp/product/"]'
      );

      for (const link of Array.from(links)) {
        const href = link.getAttribute("href") ?? "";
        const asinMatch =
          href.match(/\/dp\/([A-Z0-9]{10})/) ??
          href.match(/\/gp\/product\/([A-Z0-9]{10})/);
        if (!asinMatch) continue;

        const asin = asinMatch[1];
        const title = link.textContent?.trim() ?? "";
        if (!title || title.length < 3) continue;

        // Walk up to the nearest order block to pull date and price
        const orderBlock =
          link.closest(".order") ??
          link.closest('[class*="order-card"]') ??
          link.closest('[class*="shipment"]');

        const dateEl =
          orderBlock?.querySelector(".a-color-secondary.value") ??
          orderBlock?.querySelector('[class*="order-date"]') ??
          orderBlock?.querySelector(".a-color-secondary");
        const priceEl =
          orderBlock?.querySelector(".a-color-price") ??
          orderBlock?.querySelector('[class*="order-total"]');

        return {
          asin,
          title,
          lastOrderedDate: dateEl?.textContent?.trim() ?? "Unknown date",
          price: priceEl?.textContent?.trim() ?? "Price unavailable",
          url: `https://www.amazon.com/dp/${asin}`,
        };
      }

      return null;
    });

    return result;
  } finally {
    await page.close();
  }
}

// Process a full grocery list: prefer past purchases, fall back to Amazon search
export async function processGroceryList(
  items: string[]
): Promise<GroceryListResult> {
  const results: GroceryItemResult[] = [];
  const usedAsins = new Set<string>(); // avoid recommending the same product twice

  for (const item of items) {
    // Small delay between items to avoid triggering Amazon's bot detection
    if (results.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 1. Check order history first
    const pastPurchase = await searchOrderHistory(item);

    if (pastPurchase && !usedAsins.has(pastPurchase.asin)) {
      usedAsins.add(pastPurchase.asin);
      results.push({
        requestedItem: item,
        source: "order_history",
        product: {
          asin: pastPurchase.asin,
          title: pastPurchase.title,
          price: pastPurchase.price,
          url: pastPurchase.url,
        },
        orderHistory: pastPurchase,
      });
      continue;
    }

    // 2. Fall back to Amazon search
    const searchResults = await searchAmazon(item);
    const topResult = searchResults.find((r) => !usedAsins.has(r.asin));

    if (topResult) {
      usedAsins.add(topResult.asin);
      results.push({
        requestedItem: item,
        source: "search",
        product: topResult,
      });
      continue;
    }

    // 3. Nothing found
    results.push({
      requestedItem: item,
      source: "not_found",
      product: null,
    });
  }

  // Build a human-readable summary
  const lines = results.map((r, i) => {
    const num = `${i + 1}.`;
    if (r.source === "not_found") {
      return `${num} **${r.requestedItem}** — Nothing found. Try a different search term.`;
    }
    const sourceTag =
      r.source === "order_history"
        ? `⭐ from your past orders (last ordered: ${r.orderHistory!.lastOrderedDate})`
        : `🔍 top Amazon result (no past purchase found)`;
    return (
      `${num} **${r.requestedItem}** — ${sourceTag}\n` +
      `   ${r.product!.title}\n` +
      `   ASIN: ${r.product!.asin} | Price: ${r.product!.price}\n` +
      `   ${r.product!.url}`
    );
  });

  const summary =
    `Here are my recommendations for your grocery list:\n\n` +
    lines.join("\n\n") +
    `\n\n` +
    `To add any of these to your cart, just confirm and I'll call add_to_cart for each one.`;

  return { items: results, summary };
}

// View current cart contents
export async function viewCart(): Promise<CartItem[]> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto("https://www.amazon.com/cart", {
      waitUntil: "domcontentloaded",
    });

    const items = await page.evaluate(() => {
      const cartItems = document.querySelectorAll('[data-asin]');
      const results: Array<{
        asin: string;
        title: string;
        price: string;
        quantity: number;
      }> = [];

      for (const item of Array.from(cartItems)) {
        const asin = item.getAttribute("data-asin") ?? "";
        const titleEl =
          item.querySelector(".a-truncate-cut") ??
          item.querySelector("[class*='product-title']");
        const priceEl =
          item.querySelector(".sc-price") ??
          item.querySelector("[class*='unit-price']");
        const qtyEl =
          item.querySelector(".a-dropdown-prompt") ??
          item.querySelector("[class*='quantity']");

        if (asin && titleEl?.textContent?.trim()) {
          results.push({
            asin,
            title: titleEl.textContent.trim(),
            price: priceEl?.textContent?.trim() ?? "Price unavailable",
            quantity: parseInt(qtyEl?.textContent ?? "1") || 1,
          });
        }
      }

      return results;
    });

    return items;
  } finally {
    await page.close();
  }
}
