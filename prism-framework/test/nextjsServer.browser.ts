import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const API_URL = 'http://localhost:19997';
const WEB_URL = 'http://localhost:19996';

test.describe('Next.js sample server', () => {
  test.beforeAll(async () => {
    execSync('candle start nextjs-sample-api', { stdio: 'pipe' });
    execSync('candle wait-for-log nextjs-sample-api --message "running at" --timeout 15', { stdio: 'pipe' });
    execSync('candle start nextjs-sample-web', { stdio: 'pipe' });
    execSync('candle wait-for-log nextjs-sample-web --message "Ready in" --timeout 30', { stdio: 'pipe' });
  });

  test.afterAll(async () => {
    execSync('candle kill nextjs-sample-web', { stdio: 'pipe' });
    execSync('candle kill nextjs-sample-api', { stdio: 'pipe' });
  });

  test('API returns tasks directly', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/tasks`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('text');
  });

  test('Next.js proxies API requests', async ({ request }) => {
    const res = await request.get(`${WEB_URL}/api/tasks`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('web UI loads and shows tasks', async ({ page }) => {
    await page.goto(WEB_URL);
    await expect(page.locator('h1')).toContainText('Prism + Next.js Tasks');
    // Wait for tasks to load via proxied API
    await expect(page.locator('[data-testid="tasks-list"]')).toContainText('Try the Prism + Next.js sample');
  });

  test('can create a task via the UI', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.fill('input[placeholder="New task..."]', 'Playwright task');
    await page.click('[data-testid="add-task"]');
    await expect(page.locator('[data-testid="tasks-list"]')).toContainText('Playwright task');
  });
});
