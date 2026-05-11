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

test("healthz endpoint returns ok", async ({ page }) => {
  const res = await page.request.get("/healthz");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
});

test("send-otp rejects unknown phone (invite gate)", async ({ page }) => {
  const res = await page.request.post("/api/auth/send-otp", {
    data: { phone: "+15550000000" },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(403);
});

test("push VAPID key endpoint returns key or 503", async ({ page }) => {
  const res = await page.request.get("/api/push");
  expect([200, 503]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(body.publicKey).toBeTruthy();
  }
});
