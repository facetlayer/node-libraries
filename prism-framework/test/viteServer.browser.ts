import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:19998';

test.describe('Vite sample server', () => {
  test.beforeAll(async () => {
    execSync('candle start vite-sample', { stdio: 'pipe' });
    execSync('candle wait-for-log vite-sample --message "running at" --timeout 15', { stdio: 'pipe' });
  });

  test.afterAll(async () => {
    execSync('candle kill vite-sample', { stdio: 'pipe' });
  });

  test('API returns notes', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/notes`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('title');
  });

  test('web UI loads and shows notes', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Prism + Vite Notes');
    // Wait for notes to load from API
    await expect(page.locator('[data-testid="notes-list"] h3')).toContainText('Welcome');
  });

  test('can create a note via the UI', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[placeholder="Title"]', 'Test Note');
    await page.fill('textarea[placeholder="Body"]', 'Created by Playwright');
    await page.click('[data-testid="add-note"]');
    await expect(page.locator('[data-testid="notes-list"]')).toContainText('Test Note');
  });
});
