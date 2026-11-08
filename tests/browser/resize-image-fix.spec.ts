import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('resize width remains empty while clearing, strips leading zeros and produces exact output dimensions',async({page})=>{
 await page.goto('/resize-image/');await expect(page.locator('.upload-button')).toBeEnabled({timeout:20000});await page.getByLabel('Choose files',{exact:true}).setInputFiles('tests/fixtures/red.png');await expect(page.locator('.file-row')).toHaveCount(1);
 const width=page.getByLabel('Width (px)',{exact:true});await width.fill('');await expect(width).toHaveValue('');await width.pressSequentially('2000');await expect(width).toHaveValue('2000');
 await width.fill('02000');await expect(width).toHaveValue('2000');await expect(page.getByLabel('Height (px)',{exact:true})).toHaveValue('1000');
 await page.getByRole('combobox',{name:'Output format',exact:true}).selectOption('image/png');await page.getByRole('button',{name:'Resize image',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download image',exact:true}).click();const bytes=await readFile((await(await pending).path())!);expect(bytes.readUInt32BE(16)).toBe(2000);expect(bytes.readUInt32BE(20)).toBe(1000);
});
test('canonical and compatibility resizer pages have no unrelated comparison or Coming Soon note',async({page})=>{
 for(const route of ['/resize-image/','/image-resizer/']){await page.goto(route);await expect(page.locator('.small-compare')).toHaveCount(0);await expect(page.locator('main')).not.toContainText('The standalone Remove Background tool is Coming Soon.');await expect(page.locator('#how-it-works')).toBeVisible();await expect(page.locator('.related-tools')).toBeVisible();await expect(page.locator('.faq-section')).toBeVisible();}
 await page.goto('/png-to-jpg/');await expect(page.locator('.small-compare')).toHaveCount(1);
});
