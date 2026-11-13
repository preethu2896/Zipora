import { test,expect,type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument,StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import jsQR from 'jsqr';
import {toolInfo} from '../../src/lib/site-content';
import {extraTools} from '../../src/lib/extra-tools';

async function choose(page:Page,route:string,files:Parameters<ReturnType<Page['getByLabel']>['setInputFiles']>[0]){
  await page.goto(route);await expect(page.locator('.upload-button')).toBeEnabled({timeout:20000});
  await page.getByLabel('Choose files',{exact:true}).setInputFiles(files);await expect(page.locator('.file-row')).not.toHaveCount(0,{timeout:15000});
}
async function download(page:Page,label:string){const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const dl=await pending;return {bytes:await readFile((await dl.path())!),name:dl.suggestedFilename()};}
async function pixels(page:Page,includeData=false){return page.locator('.extra-result img').evaluate(async (element:HTMLImageElement,includeData)=>{await element.decode();const canvas=document.createElement('canvas');canvas.width=element.naturalWidth;canvas.height=element.naturalHeight;const ctx=canvas.getContext('2d')!;ctx.drawImage(element,0,0);return {width:canvas.width,height:canvas.height,data:includeData?Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data):[]};},includeData);}
async function pdf(pages=2,metadata=true){const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);for(let i=0;i<pages;i++)doc.addPage([200,300]).drawText(`Page ${i+1}`,{x:20,y:250,font});if(metadata)doc.setTitle('metadata '.repeat(10000));return {name:'document.pdf',mimeType:'application/pdf',buffer:Buffer.from(await doc.save({useObjectStreams:false}))};}

test('all new routes expose a usable tool and mobile layouts stay in bounds',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const tool of extraTools){await page.goto(`/${tool.slug}/`);await expect(page.getByRole('heading',{name:toolInfo(tool.slug).h1,exact:true,level:1})).toBeVisible();await expect(page.getByRole('button',{name:tool.mode==='qr'?'Generate QR code':tool.mode==='passport'?'Create photo':tool.mode==='resize'?'Resize image':tool.mode==='pdf-png'?'Convert to PNG':tool.mode==='convert'?'Convert images':'Compress',exact:true})).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
  await page.screenshot({path:'research/extended-mobile.png',fullPage:true});
});
test('all four image size presets produce actual JPEGs within their byte limit',async({page})=>{
  // Noisy source exercises the dimension-reduction path, rather than a tiny flat fixture.
  await page.goto('/');const base64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=800;const ctx=c.getContext('2d')!,p=ctx.createImageData(c.width,c.height);let n=42;for(let i=0;i<p.data.length;i+=4){n=(n*1664525+1013904223)>>>0;p.data[i]=n&255;p.data[i+1]=(n>>>8)&255;p.data[i+2]=(n>>>16)&255;p.data[i+3]=255;}ctx.putImageData(p,0,0);return c.toDataURL('image/png').split(',')[1];});
  for(const target of [20,50,100,200]){
    await choose(page,`/compress-image-to-${target}kb/`,{name:'noise.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});await page.getByRole('button',{name:'Compress',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();const out=await download(page,'Download image');expect(out.bytes.length).toBeLessThanOrEqual(target*1024);expect([...out.bytes.slice(0,2)]).toEqual([255,216]);
  }
});
test('resize locks aspect ratio, validates bounds and downloads exact PNG dimensions',async({page})=>{
  await choose(page,'/resize-image/','tests/fixtures/red.png');await page.getByLabel('Width (px)',{exact:true}).fill('120');await expect(page.getByLabel('Height (px)',{exact:true})).toHaveValue('60');await page.getByLabel('Output format').selectOption('image/png');await page.getByRole('button',{name:'Resize image',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();const out=await download(page,'Download image');expect(out.bytes.readUInt32BE(16)).toBe(120);expect(out.bytes.readUInt32BE(20)).toBe(60);await page.getByLabel('Width (px)',{exact:true}).fill('9999');await expect(page.locator('.extra-result')).toHaveCount(0);await page.getByRole('button',{name:'Resize image',exact:true}).click();await expect(page.locator('.error-message[role=alert]')).toContainText('whole-number');
});
test('converters create real formats and batch conversion provides one ZIP',async({page})=>{
  await choose(page,'/png-to-jpg/',['tests/fixtures/red.png','tests/fixtures/blue.png']);await page.getByRole('button',{name:'Convert images',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();await expect(page.locator('.extra-result button')).toHaveCount(1);const out=await download(page,'Download all images'),zip=await JSZip.loadAsync(out.bytes);expect(Object.keys(zip.files)).toHaveLength(2);for(const file of Object.values(zip.files)){expect([...(await file.async('uint8array')).slice(0,2)]).toEqual([255,216]);}
  await choose(page,'/jpg-to-png/','tests/fixtures/red.jpg');await page.getByRole('button',{name:'Convert images',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();const png=await download(page,'Download image');expect([...png.bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
});
test('generic compression creates WebP and rejects corrupted input',async({page})=>{
  await choose(page,'/image-compressor/','tests/fixtures/red.jpg');await page.getByLabel('Output format').selectOption('image/webp');await page.getByRole('button',{name:'Compress',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();const out=await download(page,'Download image');expect(out.bytes.toString('ascii',8,12)).toBe('WEBP');await page.getByLabel('Choose files',{exact:true}).setInputFiles({name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not an image')});await expect(page.locator('.error-message[role=alert]')).toContainText('not a supported format');
});
test('QR PNG decodes to original content and SVG is a real vector download',async({page})=>{
  await page.goto('/qr-code-generator/');await page.getByLabel('Text or URL').fill('https://zipora.example/test?value=hello');await page.getByRole('button',{name:'Generate QR code',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();const p=await pixels(page,true);expect(jsQR(new Uint8ClampedArray(p.data),p.width,p.height)?.data).toBe('https://zipora.example/test?value=hello');await download(page,'Download QR code');await page.getByLabel('Download format').selectOption('svg');await expect(page.locator('.extra-result')).toBeVisible();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();const svg=await download(page,'Download QR code');expect(svg.name).toMatch(/\.svg$/);expect(svg.bytes.toString()).toContain('<svg');
});
test('PDF PNG export keeps every page and one-page PDFs download directly',async({page})=>{
  for(const count of [1,2]){await choose(page,'/pdf-to-png/',await pdf(count));await page.getByRole('button',{name:'Convert to PNG',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();const out=await download(page,count===1?'Download image':'Download all images');if(count===1)expect(out.bytes.readUInt32BE(16)).toBe(400);else{const zip=await JSZip.loadAsync(out.bytes);expect(Object.keys(zip.files)).toEqual(['page-001.png','page-002.png']);}}
});
test('PDF presets report actual target status, preserve page count, and disclose unattainable limits',async({page})=>{
  for(const target of [100,200,500]){await choose(page,`/compress-pdf-to-${target}kb/`,await pdf());await page.getByRole('button',{name:'Compress',exact:true}).click();await expect(page.locator('.extra-result')).toContainText('Target reached');const out=await download(page,'Download PDF');expect(out.bytes.length).toBeLessThanOrEqual(target*1024);expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(2);}
  await choose(page, '/compress-pdf-to-100kb/', await pdf(10));
  await page.getByLabel('Target size (KB)', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Compress', exact: true }).click();
  await page.locator('.tool-panel[aria-busy="false"]').waitFor();
  await expect(page.locator('.extra-result')).toContainText('Target not reached');
});
test('passport crop and print sheet have exact physical pixel sizes and density metadata',async({page})=>{
  await choose(page,'/passport-photo-maker/','tests/fixtures/red.jpg');await page.getByRole('button',{name:'Create photo',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();let p=await pixels(page);expect([p.width,p.height]).toEqual([413,531]);let out=await download(page,'Download image');expect([...out.bytes.slice(13,18)]).toEqual([1,1,44,1,44]);await page.getByLabel('Photo size').selectOption('50.8x50.8');await page.getByLabel('Create a 4 × 6 inch print sheet at 300 DPI').check();await page.getByRole('button',{name:'Create photo',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();p=await pixels(page);expect([p.width,p.height]).toEqual([1200,1800]);
});
test('local portrait model loads and rejects a source without a person',async({page})=>{
  await choose(page,'/passport-photo-maker/','tests/fixtures/red.jpg');await page.getByRole('button',{name:'Replace background with white',exact:true}).click();await expect(page.locator('.error-message[role=alert]')).toContainText('No clear person found',{timeout:60000});
});

test('portrait segmentation replaces the background, restores original and exports the cropped result',async({page})=>{
 await choose(page,'/passport-photo-maker/','tests/fixtures/portrait.jpg');
 await page.getByRole('button',{name:'Replace background with white',exact:true}).click();
 await expect(page.getByRole('button',{name:'Restore original background',exact:true})).toBeEnabled({timeout:60000});
 await expect(page.locator('.error-message')).toHaveCount(0);
 await page.getByRole('button',{name:'Create photo',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();
 const image=await pixels(page,true);expect([image.width,image.height]).toEqual([413,531]);
 expect(image.data.slice(0,3).every(v=>v>240)).toBeTruthy();
 await page.screenshot({path:'research/passport-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Restore original background',exact:true}).click();
 await expect(page.locator('.extra-result')).toHaveCount(0);
 await expect(page.locator('.file-info strong')).toHaveText('portrait.jpg');
});

test('hero search filters the grouped tools and clears after choosing a tool',async({page})=>{
 await page.goto('/');await expect(page.locator('.home-tool-list a')).toHaveCount(41);await expect(page.locator('.site-header input')).toHaveCount(0);
 await page.getByLabel('Search tools in hero').fill('passport');await expect(page.locator('.home-tool-list a')).toHaveCount(1);
 await page.getByLabel('Search tools in hero').fill('nonexistent');await expect(page.getByRole('status')).toContainText('0 tools found');
 await page.getByLabel('Search tools in hero').fill('');await expect(page.locator('.home-tool-list a')).toHaveCount(41);
 await page.getByLabel('Search tools in hero').fill('merge');await page.locator('.home-tool-list a[href="/merge-pdf/"]').click();await expect(page.locator('.site-header input')).toHaveCount(0);
});
test('transparent PNG conversion uses an actual white JPG matte',async({page})=>{
 await page.goto('/');const base64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=32;return c.toDataURL('image/png').split(',')[1];});
 await choose(page,'/png-to-jpg/',{name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
 await page.getByRole('button',{name:'Convert images',exact:true}).click();await expect(page.getByRole('heading',{name:'Ready to save'})).toBeVisible();
 const image=await pixels(page,true);expect(image.data.slice(0,4)).toEqual([255,255,255,255]);
});
test('PDF target raster mode actually reduces an image-heavy document without losing pages',async({page})=>{
 await page.goto('/');const base64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=1200;const ctx=c.getContext('2d')!,p=ctx.createImageData(c.width,c.height);let seed=34;for(let i=0;i<p.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;p.data[i]=seed&255;p.data[i+1]=(seed>>>8)&255;p.data[i+2]=(seed>>>16)&255;p.data[i+3]=255;}ctx.putImageData(p,0,0);return c.toDataURL('image/jpeg',.95).split(',')[1];});
 const pdfDoc=await PDFDocument.create(),image=await pdfDoc.embedJpg(Buffer.from(base64,'base64'));pdfDoc.addPage([600,800]).drawImage(image,{x:0,y:0,width:600,height:800});const original=await pdfDoc.save();
 await choose(page,'/compress-pdf-to-100kb/',{name:'scan.pdf',mimeType:'application/pdf',buffer:Buffer.from(original)});await page.getByLabel('Allow image-based compression.',{exact:false}).check();
 await page.getByRole('button',{name:'Compress',exact:true}).click();await expect(page.locator('.extra-result')).toContainText('Image-based output');
 const output=await download(page,'Download PDF');expect(output.bytes.length).toBeLessThan(original.length);expect((await PDFDocument.load(output.bytes)).getPageCount()).toBe(1);
 const note=await page.locator('.extra-result').innerText();expect(note.includes('Target reached')).toBe(output.bytes.length<=100*1024);
});
