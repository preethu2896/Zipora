import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('image compressor defaults to 80%, downloads smaller images and blocks larger 100% results',async({page})=>{
 await page.goto('/image-compressor/');await expect(page.locator('.upload-button')).toBeEnabled({timeout:20000});
 const quality=page.getByRole('slider');await expect(quality).toHaveValue('80');
 const base64=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=600;
  const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(800,600);let seed=47;
  for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;pixels.data[i]=seed&255;pixels.data[i+1]=(seed>>>8)&255;pixels.data[i+2]=(seed>>>16)&255;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/jpeg',.9).split(',')[1];
 });
 const original=Buffer.from(base64,'base64');
 await page.getByLabel('Choose files',{exact:true}).setInputFiles({name:'photo.jpg',mimeType:'image/jpeg',buffer:original});await expect(page.locator('.file-row')).toHaveCount(1);
 await page.getByRole('button',{name:'Compress',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download image',exact:true}).click();const bytes=await readFile((await(await pending).path())!);
 expect(bytes.length).toBeLessThan(original.length);expect([...bytes.subarray(0,2)]).toEqual([255,216]);
 await quality.focus();await quality.press('End');await expect(quality).toHaveValue('100');await expect(page.locator('.extra-result')).toHaveCount(0);
 await page.getByRole('button',{name:'Compress',exact:true}).click();
 await expect(page.locator('.error-message')).toHaveText('This quality makes the file bigger than the original. Try 80% or lower.');
 await expect(page.locator('.extra-result')).toHaveCount(0);await expect(page.getByRole('button',{name:'Download image',exact:true})).toHaveCount(0);
 await page.getByRole('combobox',{name:'Output format',exact:true}).selectOption('image/png');await page.getByRole('button',{name:'Compress',exact:true}).click();
 await expect(page.locator('.error-message')).toHaveText('This quality makes the file bigger than the original. Try 80% or lower.');await expect(page.locator('.extra-result')).toHaveCount(0);
});

test('only image compressor loses the unrelated comparison box and note',async({page})=>{
 await page.goto('/image-compressor/');await expect(page.locator('.small-compare')).toHaveCount(0);
 await expect(page.locator('main')).not.toContainText('The standalone Remove Background tool is Coming Soon.');
 await expect(page.locator('#how-it-works')).toBeVisible();await expect(page.locator('.related-tools')).toBeVisible();await expect(page.locator('.faq-section')).toBeVisible();
 await page.goto('/png-to-jpg/');await expect(page.locator('.small-compare')).toHaveCount(0);
});

test('a PNG-to-JPG result larger than its source is not offered either',async({page})=>{
 await page.goto('/image-compressor/');await expect(page.locator('.upload-button')).toBeEnabled({timeout:20000});
 await page.getByLabel('Choose files',{exact:true}).setInputFiles('tests/fixtures/red.png');await expect(page.locator('.file-row')).toHaveCount(1);
 await page.getByRole('button',{name:'Compress',exact:true}).click();
 await expect(page.locator('.error-message')).toHaveText('This quality makes the file bigger than the original. Try 80% or lower.');
 await expect(page.locator('.extra-result')).toHaveCount(0);
});
