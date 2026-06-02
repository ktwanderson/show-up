import { chromium, BrowserContext } from "playwright";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  chmodSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";

export const SESSION_DIR = join(homedir(), ".config", "amazon-mcp");
export const SESSION_FILE = join(SESSION_DIR, "session.json");

// Check whether the stored session is still logged in
async function isLoggedIn(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage();
  try {
    await page.goto("https://www.amazon.com", {
      waitUntil: "domcontentloaded",
    });
    const text = await page
      .locator("#nav-link-accountList-nav-line-1")
      .textContent({ timeout: 8000 });
    return !!(text && !text.toLowerCase().includes("sign in"));
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

// Load a saved session from disk. Returns null if missing or expired.
export async function loadSession(): Promise<BrowserContext | null> {
  if (!existsSync(SESSION_FILE)) return null;

  try {
    const cookies = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies(cookies);

    if (await isLoggedIn(context)) {
      return context;
    }

    await browser.close();
    return null;
  } catch {
    return null;
  }
}

// Save the current session cookies to disk with tight file permissions
export async function saveSession(context: BrowserContext): Promise<void> {
  mkdirSync(SESSION_DIR, { recursive: true });
  const cookies = await context.cookies("https://www.amazon.com");
  writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
  // Owner read/write only — no other users can read your session
  chmodSync(SESSION_FILE, 0o600);
}

// Open a headed browser, let the user log in, then save cookies.
// Times out after 3 minutes.
export async function setupLogin(): Promise<string> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.amazon.com/ap/signin");

  const deadline = Date.now() + 3 * 60 * 1000;

  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    try {
      const text = await page
        .locator("#nav-link-accountList-nav-line-1")
        .textContent({ timeout: 2000 });
      if (text && !text.toLowerCase().includes("sign in")) {
        await saveSession(context);
        await browser.close();
        return "Successfully logged in and saved session. You can now use the Amazon tools.";
      }
    } catch {
      // Not logged in yet — keep polling
    }
  }

  await browser.close();
  return "Login timed out after 3 minutes. Please try the setup_login tool again.";
}
