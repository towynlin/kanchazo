import { test, expect } from "@playwright/test";

test("auth page loads and shows phone input", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /kanchazo/i })).toBeVisible();
  await expect(page.getByLabel(/phone/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /send/i })).toBeVisible();
});

test("redirects unauthenticated users to /auth", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page).toHaveURL(/\/auth/);
});
