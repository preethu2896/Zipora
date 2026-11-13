import { expect, test } from '@playwright/test';
import { countText } from '../../src/lib/word-counter';

test('counts live text, Unicode, blank lines and time estimates', async ({ page }) => {
  expect(countText('One\r\nline\r\n\r\nAnother').paragraphs).toBe(2);
  expect(countText('well-known café').words).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/word-counter/');
  const input = page.getByLabel('Text to count');
  const count = (label: string) => page.locator('dl[aria-label="Text counts"] > div')
    .filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
  await input.fill("Hello world!\n\nDon't stop. 👍🏽");
  for (const [label, value] of Object.entries({
    Words: '4', Characters: '28', 'Characters without spaces': '23',
    Sentences: '2', Paragraphs: '2', 'Reading time': '2 sec', 'Speaking time': '2 sec',
  })) await expect(count(label)).toHaveText(value);
  await page.getByRole('button', { name: 'Clear text' }).click();
  await expect(count('Words')).toHaveText('0');
  await expect(count('Paragraphs')).toHaveText('0');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(count('Words')).not.toHaveText('0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
