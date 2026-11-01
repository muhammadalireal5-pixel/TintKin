import { test, expect } from "@playwright/test";

test("credentials cannot submit as URL parameters before hydration", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(baseURL + path);
    await expect(page.locator('form:has(input[type="password"])')).toHaveAttribute("method", "post");
    await expect(page.locator('form:has(input[type="password"]) button[type="submit"]')).toBeDisabled();
  }
  await context.close();
});

test("landing, sign-up and sign-in are usable without horizontal overflow", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Get started", exact: true }).first().click();
  await expect(page).toHaveURL(/\/sign-up/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Sign In with Email" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("private screens redirect anonymous visitors to sign-in", async ({ page }) => {
  for (const path of ["/dashboard", "/routine", "/products", "/profile"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
  }
});

test("pricing and legal pages render", async ({ page }) => {
  for (const path of ["/pricing", "/privacy", "/terms"]) {
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
