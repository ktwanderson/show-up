import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  searchAmazon,
  addToCart,
  viewCart,
  resetContext,
  searchOrderHistory,
  processGroceryList,
} from "./amazon.js";
import { setupLogin } from "./session.js";

const server = new Server(
  { name: "amazon-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "setup_login",
      description:
        "Opens a browser window so you can log in to Amazon manually. " +
        "Run this once before using any other Amazon tool. " +
        "The session is saved securely so you won't need to log in again.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "search_amazon",
      description:
        "Search Amazon for products. Returns up to 5 results with titles, " +
        "prices, ASINs, and URLs. Use this before add_to_cart to find the right ASIN.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The product search query, e.g. 'organic whole milk gallon' or 'bananas'",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "add_to_cart",
      description:
        "Add a product to your Amazon cart by ASIN. " +
        "IMPORTANT: Always search first to get the ASIN and show the user the product details. " +
        "Always ask the user to confirm before calling this tool. " +
        "Only call this tool when confirmed is true.",
      inputSchema: {
        type: "object",
        properties: {
          asin: {
            type: "string",
            description: "The Amazon ASIN of the product to add to cart",
          },
          confirmed: {
            type: "boolean",
            description:
              "Must be true. Never call this tool without explicit user confirmation.",
          },
        },
        required: ["asin", "confirmed"],
      },
    },
    {
      name: "view_cart",
      description: "View the current contents of your Amazon cart.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "search_order_history",
      description:
        "Search your Amazon order history for a specific product you've bought before. " +
        "Returns the most recent matching purchase with its ASIN, title, and order date. " +
        "Useful for answering 'have I bought X before?' or finding a preferred brand.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Product to search for in your order history, e.g. 'milk' or 'olive oil'",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "process_grocery_list",
      description:
        "Process a grocery list end-to-end. For each item, checks your Amazon order history " +
        "first to find brands you've bought before (marked ⭐). Falls back to the top Amazon " +
        "search result if no past purchase exists (marked 🔍). " +
        "Returns one recommendation per item. Does NOT add to cart — " +
        "confirm with the user first, then call add_to_cart for each approved item.",
      inputSchema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { type: "string" },
            description:
              'List of generic grocery items, e.g. ["milk", "broccoli", "pasta", "pasta sauce"]',
          },
        },
        required: ["items"],
      },
    },
  ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "setup_login": {
        // After login, reset the cached browser context so it reloads fresh
        const result = await setupLogin();
        resetContext();
        return { content: [{ type: "text", text: result }] };
      }

      case "search_amazon": {
        const { query } = args as { query: string };
        const results = await searchAmazon(query);

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No results found for that query." }],
          };
        }

        // Return structured data only — no raw page content (prevents prompt injection)
        const formatted = results
          .map(
            (r, i) =>
              `${i + 1}. ${r.title}\n   ASIN: ${r.asin}\n   Price: ${r.price}\n   URL: ${r.url}`
          )
          .join("\n\n");

        return { content: [{ type: "text", text: formatted }] };
      }

      case "add_to_cart": {
        const { asin, confirmed } = args as {
          asin: string;
          confirmed: boolean;
        };

        if (!confirmed) {
          return {
            content: [
              {
                type: "text",
                text: "Action blocked: add_to_cart requires confirmed=true. Please confirm with the user first.",
              },
            ],
          };
        }

        const result = await addToCart(asin);
        return { content: [{ type: "text", text: result }] };
      }

      case "view_cart": {
        const items = await viewCart();

        if (items.length === 0) {
          return {
            content: [{ type: "text", text: "Your Amazon cart is empty." }],
          };
        }

        const formatted = items
          .map(
            (item, i) =>
              `${i + 1}. ${item.title}\n   ASIN: ${item.asin}\n   Price: ${item.price}\n   Qty: ${item.quantity}`
          )
          .join("\n\n");

        return { content: [{ type: "text", text: formatted }] };
      }

      case "search_order_history": {
        const { query } = args as { query: string };
        const result = await searchOrderHistory(query);

        if (!result) {
          return {
            content: [
              {
                type: "text",
                text: `No past orders found matching "${query}".`,
              },
            ],
          };
        }

        const text =
          `Found in your order history:\n` +
          `${result.title}\n` +
          `ASIN: ${result.asin}\n` +
          `Last ordered: ${result.lastOrderedDate}\n` +
          `Price: ${result.price}\n` +
          `URL: ${result.url}`;

        return { content: [{ type: "text", text }] };
      }

      case "process_grocery_list": {
        const { items } = args as { items: string[] };
        const result = await processGroceryList(items);
        return { content: [{ type: "text", text: result.summary }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ── Start server ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
