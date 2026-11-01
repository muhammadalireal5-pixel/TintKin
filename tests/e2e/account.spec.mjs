import { test, expect } from "@playwright/test";

// Use a disposable, onboarded account: these checks save a mirror check.
test.describe("signed-in journeys", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD for a disposable onboarded account.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    const submit = page.getByRole("button", { name: "Sign In with Email" });
    await expect(submit).toBeEnabled();
    await page.locator('input[type="email"]').fill(process.env.E2E_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD);
    await submit.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("main screens fit the viewport and render without client errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/dashboard", "/routine", "/progress", "/products", "/profile", "/history", "/reports", "/what-if", "/capture"]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.getByText("Something unexpected happened.", { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test("mirror check survives a reload", async ({ page }) => {
    const good = page.getByRole("radio", { name: "Good", exact: true });
    await good.click();
    await expect(page.getByRole("region", { name: "Mirror check" }).getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(good).toBeChecked();
  });

  test("guided session saves completed steps and a reaction", async ({ page }) => {
    await page.goto("/routine?tab=pm");
    await page.getByRole("button", { name: /^(Start|Replay) evening session$/ }).click();
    const dialog = page.getByRole("dialog", { name: "Evening session" });
    await expect(dialog).toBeVisible();
    for (let count = 0; count < 10; count++) {
      const done = dialog.getByRole("button", { name: "Done", exact: true });
      if (!await done.count()) break;
      const heading = await dialog.locator("h2").innerText();
      await done.click();
      await expect(dialog.locator("h2")).not.toHaveText(heading);
    }
    await dialog.getByRole("radio", { name: /Fine/ }).click();
    await dialog.getByRole("button", { name: "Save and finish" }).click();
    await expect(dialog.getByText(/Calm skin is how/)).toBeVisible();
    await dialog.getByRole("button", { name: "Back to my plan" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Replay evening session" })).toBeVisible();
  });

  test("Kin remains visible while animation data is unavailable", async ({ page }) => {
    await page.route("**/companion/cat.json", (route) => route.abort());
    await page.goto("/routine");
    const kin = page.getByRole("button", { name: /^Kin, your skin companion/ });
    await expect(kin).toBeVisible();
    await expect(kin.locator("span")).toBeVisible();
    await kin.press("Enter");
    await expect(kin).toHaveAttribute("aria-expanded", "true");
  });
});
