import {test,expect,type Page} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {PDFDocument,PDFName,PDFDict,PDFRawStream} from 'pdf-lib';
import JSZip from 'jszip';

const fixture='tests/fixtures/readable-36-pages-2.5mb.pdf';
async function upload(page:Page,route:string,label:string,file=fixture){await page.goto(route);await expect(page.locator('.upload-button')).toBeEnabled({timeout:20000});await page.getByLabel(label,{exact:true}).setInputFiles(file);await expect(page.locator('.file-row')).toHaveCount(1);}
async function download(page:Page,name:string){const promise=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await promise).path())!);}
function pageImages(document:PDFDocument){return document.getPages().flatMap(page=>{const resources=page.node.Resources(),objects=resources?.lookup(PDFName.of('XObject'),PDFDict);if(!objects)return [];return objects.values().flatMap(ref=>{const image=document.context.lookup(ref);if(!(image instanceof PDFRawStream)||image.dict.get(PDFName.of('Subtype'))!==PDFName.of('Image'))return [];return [{width:Number(image.dict.get(PDFName.of('Width'))?.toString()),height:Number(image.dict.get(PDFName.of('Height'))?.toString()),pageWidth:page.getWidth(),pageHeight:page.getHeight()}];});});}

for(const slug of ['compress-pdf','compress-pdf-to-100kb','compress-pdf-to-200kb','compress-pdf-to-500kb'])test(`${slug}: 36-page 2.50 MB readable fixture produces a valid, honestly labelled PDF`,async({page})=>{
 test.setTimeout(240000);await upload(page,`/${slug}/`,slug==='compress-pdf'?'Choose PDF':'Choose files');
 if(slug==='compress-pdf')await expect(page.getByRole('combobox',{name:'Compression method',exact:true})).toHaveValue('balanced');
 else await expect(page.getByLabel('Allow image-based compression.',{exact:false})).toBeChecked();
 await page.getByRole('button',{name:slug==='compress-pdf'?'Compress PDF':'Compress',exact:true}).click();
 const result=page.locator(slug==='compress-pdf'?'.conversion-result':'.extra-result');await expect(result).toBeVisible({timeout:210000});
 const text=await result.innerText();const bytes=await download(page,text.includes('No smaller PDF found')?'Download original PDF':'Download PDF');
 const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(36);expect(bytes.length).toBeLessThanOrEqual((await readFile(fixture)).length);
 if(slug!=='compress-pdf'){
  const target=Number(slug.match(/(100|200|500)kb/)![1])*1024;
  if(bytes.length>target)await expect(result).toContainText('Target not reached at readable quality. Best readable result is');
  else await expect(result).toContainText('Target reached.');
  if(text.includes('Image-based output'))for(const image of pageImages(pdf)){expect(image.width*72/image.pageWidth).toBeGreaterThanOrEqual(150);expect(image.height*72/image.pageHeight).toBeGreaterThanOrEqual(150);}
 }
 await mkdir('research/pdf-quality',{recursive:true});await writeFile(`research/pdf-quality/${slug}.pdf`,bytes);await writeFile(`research/pdf-quality/${slug}.txt`,text);
});

test('unchecked raster target gives the requested actionable message instead of silently returning original',async({page})=>{
 await upload(page,'/compress-pdf-to-100kb/','Choose files');await page.getByLabel('Allow image-based compression.',{exact:false}).uncheck();
 await page.getByRole('button',{name:'Compress',exact:true}).click();
 await expect(page.locator('.extra-result')).toContainText('Target not reached. Tick Allow image-based compression to try to reach this size, or try a larger target.');
});

test('Strong is explicit, warns about text loss and embeds page images at no less than 150 DPI',async({page})=>{
 test.setTimeout(120000);
 const original=await PDFDocument.load(await readFile(fixture)),single=await PDFDocument.create();single.addPage((await single.copyPages(original,[0]))[0]);const source=Buffer.from(await single.save());
 await page.goto('/compress-pdf/');await expect(page.locator('.upload-button')).toBeEnabled({timeout:20000});await page.getByLabel('Choose PDF',{exact:true}).setInputFiles({name:'one-readable-page.pdf',mimeType:'application/pdf',buffer:source});await expect(page.locator('.file-row')).toHaveCount(1);
 await expect(page.getByRole('combobox',{name:'Compression method',exact:true})).toHaveValue('balanced');await page.getByRole('combobox',{name:'Compression method',exact:true}).selectOption('strong');
 await expect(page.locator('.tool-options .option-warning')).toContainText('Text will become an image, not selectable, and quality will drop. Links, forms, attachments, and signatures will be lost.');
 await page.getByRole('button',{name:'Compress PDF',exact:true}).click();await expect(page.locator('.conversion-result')).toContainText('Image-based output · 150 DPI',{timeout:90000});
 const bytes=await download(page,'Download PDF'),pdf=await PDFDocument.load(bytes);const images=pageImages(pdf);expect(images).toHaveLength(1);
 for(const image of images){expect(image.width*72/image.pageWidth).toBeGreaterThanOrEqual(150);expect(image.height*72/image.pageHeight).toBeGreaterThanOrEqual(150);}
 expect(bytes.length).toBeLessThan(source.length);await mkdir('research/pdf-quality',{recursive:true});await writeFile('research/pdf-quality/strong-one-page.pdf',bytes);
});

test('one-image PDF labels use singular and PDF-to-JPG initially shows six of 36 pages',async({page})=>{
 test.setTimeout(180000);await upload(page,'/jpg-to-pdf/','Choose images','tests/fixtures/red.jpg');
 await expect(page.locator('.document-stats')).toContainText('1 image');await expect(page.locator('.preview-page small')).toHaveText('page, together');await expect(page.locator('.status-line')).toContainText('1 image ready');
 await page.getByRole('button',{name:'Convert to PDF',exact:true}).click();await expect(page.locator('.conversion-result')).toContainText('1 page');const pdf=await download(page,'Download PDF');expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
 await upload(page,'/pdf-to-jpg/','Choose PDF');await page.getByRole('combobox',{name:'Resolution',exact:true}).selectOption('1');await page.getByRole('button',{name:'Convert to JPG',exact:true}).click();
 await expect(page.locator('.jpg-result')).toHaveCount(6,{timeout:120000});await expect(page.getByRole('button',{name:'Download all JPGs',exact:true})).toBeVisible();
 const individual=await download(page,'Download page 1');expect([...individual.subarray(0,2)]).toEqual([255,216]);
 const zipped=await download(page,'Download all JPGs');expect(Object.keys((await JSZip.loadAsync(zipped)).files)).toHaveLength(36);
 await page.getByRole('button',{name:'Show all 36 pages',exact:true}).click();await expect(page.locator('.jpg-result')).toHaveCount(36);
 await page.getByRole('button',{name:'Show first 6 pages',exact:true}).click();await expect(page.locator('.jpg-result')).toHaveCount(6);
 await page.getByRole('combobox',{name:'Resolution',exact:true}).selectOption('2');await expect(page.locator('.jpg-result')).toHaveCount(0);
});
