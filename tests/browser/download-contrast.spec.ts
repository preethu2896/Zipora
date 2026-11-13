import {test,expect,type Locator} from '@playwright/test';
import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';

function luminance(color:string){
 const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
async function settle(button:Locator){
 await button.evaluate(async element=>{await Promise.all(element.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
}
async function colors(button:Locator){
 await settle(button);
 const values=await button.evaluate(element=>{const style=getComputedStyle(element);return {foreground:style.color,background:style.backgroundColor,fontSize:style.fontSize,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,outline:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth)};});
 const a=luminance(values.foreground),b=luminance(values.background);
 return {...values,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
}

async function watchConfirmation(button: Locator) {
 const element = await button.elementHandle();
 if (!element) throw new Error('Download button is missing');
 const handle = await element.evaluateHandle(node => ({
  confirmation: new Promise<{
   foreground: string; background: string; fontSize: string; width: number;
   height: number; transitionDuration: string; announcement: string; enabled: boolean;
  }>(resolve => {
   const observer = new MutationObserver(() => {
    if (node.dataset.phase !== 'done') return;
    observer.disconnect();
    // Sample the transition's end colors before the real confirmation timer
    // can reset the button, even if Edge delays animation frames.
    for (const animation of node.getAnimations()) {
     if (animation instanceof CSSTransition) animation.finish();
    }
    const style = getComputedStyle(node);
    const { width, height } = node.getBoundingClientRect();
    resolve({
     foreground: style.color, background: style.backgroundColor,
     fontSize: style.fontSize, width, height, transitionDuration: style.transitionDuration,
     announcement: node.querySelector('[aria-live]')?.textContent ?? '',
     enabled: !node.hasAttribute('disabled'),
    });
   });
   observer.observe(node, { attributes: true, attributeFilter: ['data-phase'] });
  }),
 }));
 return handle;
}

for(const reducedMotion of ['no-preference','reduce'] as const)test(`download contrast and repeat interaction with ${reducedMotion} motion`,async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion});await page.goto('/qr-code-generator/');
 const qrText = 'Zipora Batch 1 contrast fixture';
 await page.getByLabel('Text or URL').fill(qrText);
 await page.getByRole('button',{name:'Generate QR code',exact:true}).click();
 const button=page.getByRole('button',{name:'Download QR code',exact:true});await expect(button).toBeVisible();
 const normal=await colors(button);expect(normal.contrast).toBeGreaterThanOrEqual(4.5);
 await button.hover();const hover=await colors(button);expect(hover.contrast).toBeGreaterThanOrEqual(4.5);
 await page.mouse.down();const active=await colors(button);expect(active.contrast).toBeGreaterThanOrEqual(4.5);
 const mouseConfirmation = await watchConfirmation(button);
 let download=page.waitForEvent('download');await page.mouse.up();const first=await download;
 const done = await mouseConfirmation.evaluate(state => state.confirmation);
 await mouseConfirmation.dispose();
 const foreground = luminance(done.foreground), background = luminance(done.background);
 expect(done.foreground).toBe('rgb(255, 255, 255)');expect(done.background).toBe('rgb(4, 120, 87)');expect(done.fontSize).toBe('14px');
 expect((foreground + .05) / (background + .05)).toBeGreaterThanOrEqual(4.5);
 expect(done.width).toBeCloseTo(normal.width,1);expect(done.height).toBeCloseTo(normal.height,1);
 expect(done.enabled).toBe(true);expect(done.announcement).toBe('Download started');
 if(reducedMotion==='reduce')expect(done.transitionDuration).toBe('0s');
 expect(await first.failure()).toBeNull();
 const bytes = await readFile((await first.path())!);
 expect(first.suggestedFilename()).toMatch(/\.png$/);
 expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
 const pixels = await page.evaluate(async base64 => {
  const png = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  const image = await createImageBitmap(new Blob([png], { type: 'image/png' }));
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const pixels = canvas.getContext('2d')!;
  pixels.drawImage(image, 0, 0);
  image.close();
  return { data: Array.from(pixels.getImageData(0, 0, canvas.width, canvas.height).data), width: canvas.width, height: canvas.height };
 }, bytes.toString('base64'));
 expect(jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)?.data).toBe(qrText);
 await expect(button).toHaveAttribute('data-phase','idle');
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(button).toBeFocused();
 expect(await button.evaluate(e=>e.matches(':focus-visible'))).toBeTruthy();const focus=await colors(button);expect(focus.outline).not.toBe('none');expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);expect(focus.contrast).toBeGreaterThanOrEqual(4.5);
 // Observe the next confirmation before keyboard activation starts the download.
 const keyboardConfirmation = await watchConfirmation(button);
 download=page.waitForEvent('download');await page.keyboard.press('Enter');const second=await download;expect(second.suggestedFilename()).toBe(first.suggestedFilename());expect((await second.failure())).toBeNull();
 expect((await keyboardConfirmation.evaluate(state => state.confirmation)).announcement).toBe('Download started');
 await keyboardConfirmation.dispose();
 expect(await readFile((await second.path())!)).toEqual(bytes);
 await testInfo.attach('computed-download-colors',{body:JSON.stringify({normal,hover,active,done,focus},null,2),contentType:'application/json'});
});
