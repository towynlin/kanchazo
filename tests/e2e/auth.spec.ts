import { test, expect } from "@playwright/test";

test("auth page loads and shows passkey sign-in", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /kanchazo/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in with passkey/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /recovery code/i })).toBeVisible();
});

test("recovery code page accepts input and rejects a bad code", async ({ page }) => {
  await page.goto("/auth/recover");
  await expect(page.getByLabel(/recovery code/i)).toBeVisible();
  await page.getByLabel(/recovery code/i).fill("AAAAA-AAAAA");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid or already-used/i)).toBeVisible();
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

test("recover API rejects unknown codes", async ({ page }) => {
  const res = await page.request.post("/api/auth/recover", {
    data: { code: "AAAAA-AAAAA" },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(401);
});

test("expired/unknown recovery link shows error state", async ({ page }) => {
  await page.goto("/recover/not-a-real-token");
  await expect(page.getByText(/invalid, expired, or already used/i)).toBeVisible();
});

test("push VAPID key endpoint returns key or 503", async ({ page }) => {
  const res = await page.request.get("/api/push");
  expect([200, 503]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(body.publicKey).toBeTruthy();
  }
});
