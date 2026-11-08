import {test,expect,type Page} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';
import {readFile} from 'node:fs/promises';

type AuditWindow=Window & {__mergeAudit:{created:string[];revoked:string[];readsStarted:number;readsCompleted:number;release:()=>void}};
async function fixture(name:string,width:number){const doc=await PDFDocument.create();doc.addPage([width,600]);return {name,mimeType:'application/pdf',buffer:Buffer.from(await doc.save())};}
async function upload(page:Page,widths=[301,302]){
 await page.goto('/merge-pdf/');await expect(page.locator('.upload-button')).toBeEnabled();
 await page.getByLabel('Choose PDF files',{exact:true}).setInputFiles(await Promise.all(widths.map((w,i)=>fixture(`document-${i}.pdf`,w))));
 await expect(page.locator('.file-row')).toHaveCount(widths.length);
}
async function instrument(page:Page,deferReads=false){
 await page.evaluate(deferReads=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const audit={created:[] as string[],revoked:[] as string[],readsStarted:0,readsCompleted:0,release};
  (window as unknown as AuditWindow).__mergeAudit=audit;
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=blob=>{const value=create(blob);audit.created.push(value);return value;};
  URL.revokeObjectURL=value=>{audit.revoked.push(value);revoke(value);};
  if(deferReads){const read=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){audit.readsStarted++;await gate;try{return await read.call(this);}finally{audit.readsCompleted++;}};}
 },deferReads);
}
async function finishAbandonedMerge(page:Page){
 // Release a deferred read, then wait for both source reads and the merger's
 // per-file task yields. Two animation frames flush the small fixture's save
 // continuations; no elapsed-time sleep or production test hook is required.
 await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.release());
 await expect.poll(()=>page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.readsCompleted)).toBe(2);
 await page.evaluate(async()=>{await new Promise<void>(resolve=>setTimeout(resolve,0));await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
}
async function downloadWidths(page:Page){const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();return (await PDFDocument.load(await readFile((await(await pending).path())!))).getPages().map(p=>p.getWidth());}

test('leaving during a deferred merge publishes no abandoned Blob URL',async({page})=>{
 await upload(page);await instrument(page,true);
 await page.getByRole('button',{name:'Merge PDFs',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.readsStarted)).toBe(1);
 await expect(page.getByRole('button',{name:/Merging…/})).toBeDisabled();
 await page.locator('footer a[href="/contact/"]').click();await expect(page).toHaveURL(/\/contact\/$/);
 await finishAbandonedMerge(page);
 expect(await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.created)).toEqual([]);
 expect(await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.revoked)).toEqual([]);
});

test('an abandoned older merge cannot overwrite a new visit and result',async({page})=>{
 await upload(page);await instrument(page,true);
 await page.getByRole('button',{name:'Merge PDFs',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.readsStarted)).toBe(1);
 // Same-component concurrent work is intentionally locked by the existing UI.
 await expect(page.getByLabel('Choose PDF files',{exact:true})).toBeDisabled();
 await page.locator('footer a[href="/contact/"]').click();await expect(page).toHaveURL(/\/contact\/$/);
 // Restore native reads for the next visit; the old call still awaits its gate.
 await page.evaluate(()=>{const audit=(window as unknown as AuditWindow).__mergeAudit;const wrapped=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(this.name.startsWith('new-'))return Blob.prototype.arrayBuffer.call(this);return wrapped.call(this);};(window as unknown as AuditWindow).__mergeAudit=audit;});
 await page.locator('footer a[href="/merge-pdf/"]').click();await expect(page.locator('.upload-button')).toBeEnabled();
 await page.getByLabel('Choose PDF files',{exact:true}).setInputFiles([await fixture('new-first.pdf',701),await fixture('new-second.pdf',702)]);
 await expect(page.locator('.file-row')).toHaveCount(2);await page.getByRole('button',{name:'Merge PDFs',exact:true}).click();
 await expect(page.getByRole('button',{name:'Download PDF',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.created)).toHaveLength(1);
 await finishAbandonedMerge(page);
 expect(await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.created)).toHaveLength(1);
 expect(await downloadWidths(page)).toEqual([701,702]);
 await expect(page.locator('.error-message')).toHaveCount(0);
});

test('repeat downloads retain ownership; replacement and unmount revoke each result once',async({page})=>{
 await upload(page);await instrument(page);
 await page.getByRole('button',{name:'Merge PDFs',exact:true}).click();await expect(page.getByRole('button',{name:'Download PDF',exact:true})).toBeVisible();
 expect(await downloadWidths(page)).toEqual([301,302]);expect(await downloadWidths(page)).toEqual([301,302]);
 expect(await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.revoked)).toEqual([]);
 await page.getByLabel('Move document-1.pdf up',{exact:true}).click();
 const first=await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.created[0]);
 expect(await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.revoked)).toEqual([first]);
 await page.getByRole('button',{name:'Merge PDFs',exact:true}).click();await expect(page.getByRole('button',{name:'Download PDF',exact:true})).toBeVisible();
 expect(await downloadWidths(page)).toEqual([302,301]);
 const created=await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.created);expect(created).toHaveLength(2);
 await page.locator('footer a[href="/contact/"]').click();await expect(page).toHaveURL(/\/contact\/$/);
 expect(await page.evaluate(()=>(window as unknown as AuditWindow).__mergeAudit.revoked)).toEqual(created);
});
